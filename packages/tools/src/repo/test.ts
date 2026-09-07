/**
 * @fileoverview Runs the detected test command for a repo. Parses
 * common test-runner output shapes (vitest, jest, go test, cargo test)
 * to extract a pass/fail count.
 */

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {z} from 'zod';
import {tool, ok, err} from '../tool.js';
import {detectHarness} from './harness.js';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Parses test output for pass/fail counts. Patterns supported:
 *   - vitest: "Tests  3 passed (3)" / "Tests  1 failed | 2 passed"
 *   - jest:   "Tests:  1 failed, 2 passed, 3 total"
 *   - go:     "ok  pkg/foo" / "FAIL pkg/bar"
 *   - cargo:  "test result: ok. 3 passed; 0 failed"
 */
export function parseTestCounts(
  stdout: string,
  stderr: string,
): {passed: number; failed: number} {
  const text = `${stdout}\n${stderr}`;
  const m = /Tests?[:\s]+(?:(\d+)\s+failed[,\s|]+)?\s*(\d+)\s+passed/i.exec(text);
  if (m !== null) {
    return {
      failed: m[1] !== undefined ? Number.parseInt(m[1], 10) : 0,
      passed: Number.parseInt(m[2] ?? '0', 10),
    };
  }
  const cargo = /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed/i.exec(text);
  if (cargo !== null) {
    return {
      passed: Number.parseInt(cargo[2] ?? '0', 10),
      failed: Number.parseInt(cargo[3] ?? '0', 10),
    };
  }
  const okCount = (text.match(/^ok\s+\S+/gm) ?? []).length;
  const failCount = (text.match(/^FAIL\s+\S+/gm) ?? []).length;
  return {passed: okCount, failed: failCount};
}

const inputSchema = z.object({
  path: z.string(),
  target: z.string().optional(),
});

/**
 * The `repo_test` tool.
 */
export const repoTestTool = tool({
  name: 'repo_test',
  description:
    'Run the detected test command for a repository. Returns {passed, failed, logs, durationMs}.',
  inputSchema,
  callback: async (input) => {
    try {
      const harness = await detectHarness(input.path);
      if (harness.test === undefined) {
        return ok(
          JSON.stringify({ok: false, message: 'no test command detected'}),
        );
      }
      const start = Date.now();
      let stdout = '';
      let stderr = '';
      let code = 0;
      try {
        const r = await execFileAsync(
          harness.test,
          input.target !== undefined ? [input.target] : [],
          {cwd: input.path, timeout: DEFAULT_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024},
        );
        stdout = r.stdout;
        stderr = r.stderr;
      } catch (e) {
        const err_ = e as {stdout?: string; stderr?: string; code?: number};
        stdout = err_.stdout ?? '';
        stderr = err_.stderr ?? '';
        code = err_.code ?? 1;
      }
      const counts = parseTestCounts(stdout, stderr);
      return ok(
        JSON.stringify(
          {
            ok: code === 0,
            code,
            ...counts,
            logs: stdout + (stderr.length > 0 ? '\n--- stderr ---\n' + stderr : ''),
            durationMs: Date.now() - start,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      return err(`repo_test failed: ${(e as Error).message}`);
    }
  },
});
