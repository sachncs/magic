/**
 * @fileoverview Reads a file slice from disk. Supports line range and
 * enforces a maximum byte cap. Returns the slice with line numbers
 * prepended.
 */

import {readFile, stat} from 'node:fs/promises';
import {join, isAbsolute} from 'node:path';
import {tool, ok, err, type ToolResult} from '../tool.js';

const DEFAULT_MAX_BYTES = 200_000;

/**
 * The `repo_read` tool.
 */
export const repoReadTool = tool({
  name: 'repo_read',
  description:
    'Read a file (or a line range within it) from a repository. Caps output at 200 KB by default. Returns content with 1-based line numbers.',
  inputSchema: undefined as unknown as import('zod').ZodType<{
    path: string;
    file: string;
    startLine?: number;
    endLine?: number;
    maxBytes?: number;
  }>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const abs = isAbsolute(input.file) ? input.file : join(input.path, input.file);
      const s = await stat(abs);
      const cap = input.maxBytes ?? DEFAULT_MAX_BYTES;
      if (s.size > cap) {
        return err(
          `file is ${s.size} bytes, exceeds cap of ${cap} (use startLine/endLine to slice)`,
        );
      }
      const text = await readFile(abs, 'utf8');
      const lines = text.split('\n');
      const start = Math.max(1, input.startLine ?? 1);
      const end = Math.min(lines.length, input.endLine ?? lines.length);
      const slice = lines
        .slice(start - 1, end)
        .map((l, i) => `${String(start + i).padStart(6, ' ')}\t${l}`)
        .join('\n');
      return ok(slice);
    } catch (e) {
      return err(`repo_read failed: ${(e as Error).message}`);
    }
  },
});
