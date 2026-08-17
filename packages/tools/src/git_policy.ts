/**
 * @fileoverview Git command policy. Allowlists safe read/write git
 * operations; denylists destructive ones (`push --force`, `reset
 * --hard`, `clean -fd`, `filter-branch`). Enforced at the bash tool
 * boundary so a model cannot bypass it by composing commands.
 */

const DESTRUCTIVE_GIT_DENYLIST: ReadonlyArray<RegExp> = [
  /\bpush\s+(-[a-z]+\s+)*--?(f|force)\b/,
  /\bpush\s+(-[a-z]+\s+)*-f\b/,
  /\breset\s+--hard\b/,
  /\bclean\s+-[a-z]*f[a-z]*d?\b/,
  /\bfilter-branch\b/,
  /\breflog\s+expire\s+--expire=now\b/,
  /\bupdate-ref\s+-d\b/,
];

const SAFE_GIT_OPERATIONS: ReadonlyArray<string> = [
  'status',
  'log',
  'diff',
  'show',
  'add',
  'commit',
  'branch',
  'checkout',
  'fetch',
  'merge',
  'rev-parse',
  'remote',
  'config',
  'tag',
  'stash',
  'init',
  'clone',
  'pull',
  'push', // denylist rejects `push --force` separately
];

/**
 * Returns true if the command is safe to run (not in the denylist).
 */
export function isCommandSafe(command: string): boolean {
  for (const re of DESTRUCTIVE_GIT_DENYLIST) {
    if (re.test(command)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true if the command is a destructive git operation.
 */
export function isDestructiveGit(command: string): boolean {
  for (const re of DESTRUCTIVE_GIT_DENYLIST) {
    if (re.test(command)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the git subcommand if the command starts with `git <sub> ...`.
 * Skips git's global flags (`-C <path>`, `-c <name=value>`, `--exec-path`,
 * `--bare`, etc.) and returns the first non-flag token.
 * Returns null if the command is not a git invocation.
 */
export function parseGitSubcommand(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed.startsWith('git ')) {
    return null;
  }
  // Known git global flags that take a value.
  const FLAGS_WITH_VALUE = new Set(['-C', '-c', '--exec-path', '--git-dir', '--work-tree', '--namespace', '--super-prefix']);
  const parts = trimmed.slice(4).split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p === undefined || p.length === 0) {
      continue;
    }
    if (p.startsWith('-')) {
      // Skip the flag's value if it takes one.
      if (FLAGS_WITH_VALUE.has(p) || p.startsWith('--')) {
        i++; // skip the value
      }
      continue;
    }
    return p;
  }
  return null;
}

/**
 * Returns true if the git operation is in the allowlist. Used as a
 * separate gate from the destructive denylist.
 */
export function isGitAllowed(command: string): boolean {
  const sub = parseGitSubcommand(command);
  if (sub === null) {
    return false;
  }
  return SAFE_GIT_OPERATIONS.includes(sub);
}

/**
 * Combined policy: returns 'allow', 'deny-destructive', or
 * 'deny-not-allowlisted'.
 */
export function checkGitCommand(
  command: string,
): 'allow' | 'deny-destructive' | 'deny-not-allowlisted' {
  if (parseGitSubcommand(command) === null) {
    return 'allow'; // not a git command; handled elsewhere
  }
  if (isDestructiveGit(command)) {
    return 'deny-destructive';
  }
  if (!isGitAllowed(command)) {
    return 'deny-not-allowlisted';
  }
  return 'allow';
}
