/**
 * @fileoverview Runs the detected lint command for a repo inside its
 * sandbox. The actual command is taken from `HarnessCommands.lint`
 * (produced by `repo_harness`).
 */

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tool, ok, err, type ToolResult} from '../tool.js';
import {detectHarness} from './harness.js';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * The `repo_lint` tool.
 */
export const repoLintTool = tool({
  name: 'repo_lint',
  description:
    'Run the detected lint command for a repository. Returns {ok, output}.',
  inputSchema: undefined as unknown as import('zod').ZodType<{path: string}>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const harness = await detectHarness(input.path);
      if (harness.lint === undefined) {
        return ok(
          JSON.stringify({ok: true, output: 'no lint command detected for this repo'}),
        );
      }
      const {stdout, stderr} = await execFileAsync(
        harness.lint,
        [],
        {cwd: input.path, timeout: DEFAULT_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024},
      );
      return ok(JSON.stringify({ok: true, stdout, stderr}, null, 2));
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
