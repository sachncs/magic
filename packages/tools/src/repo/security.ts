/**
 * @fileoverview Runs security scans: `npm audit`, `pip-audit`, and a
 * regex-based secret scan. Findings are normalised to a common shape.
 */

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readdir, readFile, stat} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {z} from 'zod';
import {tool, ok} from '../tool.js';
import {detectHarness} from './harness.js';

const execFileAsync = promisify(execFile);

interface Finding {
  readonly kind: 'vulnerability' | 'secret';
  readonly severity: 'low' | 'moderate' | 'high' | 'critical';
  readonly title: string;
  readonly description?: string;
  readonly file?: string;
  readonly line?: number;
}

const SECRET_PATTERNS: ReadonlyArray<{name: string; re: RegExp}> = [
  {name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/g},
  {name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36}/g},
  {name: 'OpenAI key', re: /sk-[A-Za-z0-9]{32,}/g},
  {name: 'Private key block', re: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g},
  {name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g},
];

/**
 * Scans every text file in the repo for secret-shaped strings. Skips
 * `node_modules`, `.git`, binary files (heuristic: non-printable bytes).
 */
async function secretScan(root: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  await walk(root, async (file) => {
    let text: string;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      return;
    }
    if (text.includes('\u0000')) {
      return;
    }
    const rel = relative(root, file);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      for (const {name, re} of SECRET_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          const finding: Finding = {
            kind: 'secret',
            severity: 'critical',
            title: name,
            description: 'Secret-shaped string detected. Rotate immediately if real.',
            file: rel,
            line: i + 1,
          };
          findings.push(finding);
        }
      }
    }
  });
  return findings;
}

async function walk(root: string, visit: (file: string) => Promise<void>): Promise<void> {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) {
      break;
    }
    let entries;
    try {
      entries = await readdir(dir, {withFileTypes: true});
    } catch {
      continue;
    }
    for (const e of entries) {
      if (
        e.name === 'node_modules' ||
        e.name === '.git' ||
        e.name === 'dist' ||
        e.name === 'build' ||
        e.name === '.magic' ||
        e.name === 'coverage'
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile()) {
        try {
          const s = await stat(abs);
          if (s.size > 2 * 1024 * 1024) {
            continue;
          }
        } catch {
          continue;
        }
        await visit(abs);
      }
    }
  }
}

async function npmAudit(root: string): Promise<Finding[]> {
  try {
    const {stdout} = await execFileAsync('npm', ['audit', '--json'], {
      cwd: root,
      maxBuffer: 8 * 1024 * 1024,
      timeout: 60_000,
    });
    const parsed = JSON.parse(stdout) as {
      vulnerabilities?: Record<
        string,
        {severity?: string; title?: string; url?: string}
      >;
    };
    const vulns = parsed.vulnerabilities ?? {};
    const out: Finding[] = [];
    for (const [name, info] of Object.entries(vulns)) {
      const finding: Finding = {
        kind: 'vulnerability',
        severity:
          (info.severity as 'low' | 'moderate' | 'high' | 'critical' | undefined) ?? 'moderate',
        title: info.title ?? name,
      };
      if (info.url !== undefined) {
        out.push({...finding, description: info.url});
      } else {
        out.push(finding);
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function pipAudit(root: string): Promise<Finding[]> {
  try {
    const {stdout} = await execFileAsync('pip-audit', ['--format', 'json'], {
      cwd: root,
      maxBuffer: 8 * 1024 * 1024,
      timeout: 60_000,
    });
    const parsed = JSON.parse(stdout) as Array<{name?: string; id?: string; fix_versions?: string[]}>;
    return parsed.map((v): Finding => {
      const finding: Finding = {
        kind: 'vulnerability',
        severity: 'moderate',
        title: v.name ?? v.id ?? 'unknown',
      };
      const fixVersions = v.fix_versions?.join(', ');
      if (fixVersions !== undefined && fixVersions.length > 0) {
        return {...finding, description: fixVersions};
      }
      return finding;
    });
  } catch {
    return [];
  }
}

const inputSchema = z.object({path: z.string()});

/**
 * The `repo_security` tool.
 */
export const repoSecurityTool = tool({
  name: 'repo_security',
  description:
    'Run security scans on a repository: dependency audit (npm/pip) + secret-pattern regex scan. Returns a list of findings.',
  inputSchema,
  callback: async (input) => {
    try {
      const harness = await detectHarness(input.path);
      const findings: Finding[] = [];
      if (harness.packageManager === 'npm' || harness.packageManager === 'pnpm' || harness.packageManager === 'yarn') {
        findings.push(...(await npmAudit(input.path)));
      } else if (harness.packageManager === 'pip' || harness.packageManager === 'poetry') {
        findings.push(...(await pipAudit(input.path)));
      }
      findings.push(...(await secretScan(input.path)));
      return ok(JSON.stringify({findings, count: findings.length}, null, 2));
    } catch (e) {
      return ok(
        JSON.stringify({findings: [], count: 0, error: (e as Error).message}, null, 2),
      );
    }
  },
});
