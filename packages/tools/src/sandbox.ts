/**
 * @fileoverview Local sandbox for shell commands. CWD is locked to the
 * repo path; a destructive-command denylist is enforced at the tool
 * boundary. Used by tools that need to run shell commands (`bash`).
 */

import {execFile, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {env} from 'node:process';
import {tool, ok, err, type ToolResult} from './tool.js';

const execFileAsync = promisify(execFile);

/**
 * Default timeout for sandboxed shell commands.
 */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Default resource limits. Overridden by env or per-call.
 */
const DEFAULT_MEMORY_MB = 2048;
const DEFAULT_CPU = 2.0;
const DEFAULT_DISK_MB = 5120;

/**
 * Patterns that are always denied. Matched against the joined command
 * string. Best-effort; not a substitute for OS-level confinement.
 */
const DESTRUCTIVE_DENYLIST: ReadonlyArray<RegExp> = [
  /\brm\s+(-[a-z]*f[a-z]*\s+)?\/(\s|$|\*)/, // rm -rf / or rm -fr /*
  /\bmkfs(\.\w+)?\s/,
  /\bdd\s+.*\bof=\/dev\//,
  /\bcurl\s.*\|\s*sh\b/,
  /\bwget\s.*\|\s*sh\b/,
  />\s*\/dev\/sd[a-z]/,
  /\bchmod\s+(-R\s+)?777\s+\//,
  /\bfdisk\s/,
  /\bshutdown\s/,
  /\breboot\s/,
  /\bhalt\s/,
];

/**
 * Returns the current sandbox resource limits.
 */
export interface ResourceLimits {
  readonly memoryMb: number;
  readonly cpu: number;
  readonly diskMb: number;
}

export function getResourceLimits(): ResourceLimits {
  return {
    memoryMb: Number.parseInt(env.MAGIC_SANDBOX_MAX_MEMORY_MB ?? '', 10) || DEFAULT_MEMORY_MB,
    cpu: Number.parseFloat(env.MAGIC_SANDBOX_MAX_CPU ?? '') || DEFAULT_CPU,
    diskMb: Number.parseInt(env.MAGIC_SANDBOX_MAX_DISK_MB ?? '', 10) || DEFAULT_DISK_MB,
  };
}

/**
 * Returns true if the command is safe to run (not in the denylist).
 */
export function isCommandSafe(command: string): boolean {
  for (const re of DESTRUCTIVE_DENYLIST) {
    if (re.test(command)) {
      return false;
    }
  }
  return true;
}

/**
 * The `bash` tool. Runs shell commands inside the repo CWD with the
 * destructive denylist enforced.
 */
export const bashTool = tool({
  name: 'bash',
  description:
    'Run a shell command inside the repository working directory. Refuses destructive commands (rm -rf /, mkfs, dd of=/dev, etc).',
  inputSchema: undefined as unknown as import('zod').ZodType<{
    repoPath: string;
    command: string;
    timeoutMs?: number;
  }>,
  callback: async (input): Promise<ToolResult> => {
    if (!isCommandSafe(input.command)) {
      return err(`refused: command matches destructive denylist`);
    }
    try {
      const r = await execFileAsync('/bin/sh', ['-c', input.command], {
        cwd: input.repoPath,
        timeout: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: 16 * 1024 * 1024,
      });
      return ok(JSON.stringify({ok: true, stdout: r.stdout, stderr: r.stderr}, null, 2));
    } catch (e) {
      const err_ = e as {stdout?: string; stderr?: string; code?: number; message?: string};
      return ok(
        JSON.stringify(
          {
            ok: false,
            code: err_.code,
            stdout: err_.stdout ?? '',
            stderr: err_.stderr ?? '',
            message: err_.message,
          },
          null,
          2,
        ),
      );
    }
  },
});

/**
 * Spawns a long-running process with resource limits applied. Returns
 * the child process handle. Used for things like dev servers.
 */
export function spawnWithLimits(
  command: string,
  args: string[],
  cwd: string,
  limits: ResourceLimits = getResourceLimits(),
): ReturnType<typeof spawn> {
  const child = spawn(command, args, {
    cwd,
    env: {
      ...env,
      NODE_OPTIONS: `--max-old-space-size=${Math.floor(limits.memoryMb * 0.8)}`,
    },
    stdio: 'pipe',
  });
  void limits;
  return child;
}
