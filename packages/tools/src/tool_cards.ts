/**
 * @fileoverview Render-intent union for tool results. Each tool
 * optionally declares a `kind` from `ToolCardKind` and a pure
 * `presentResult` function that turns the raw result into a
 * `ToolCardView` for the client.
 *
 * Same arguments MUST always produce the same view — this is the
 * replay-safety contract.
 */

import type {ToolCardView, ToolCardKind} from '@magic/shared/types/tool_card';
import type {ToolResult} from './tool.js';

/**
 * Wraps a tool result in a `ToolCardView` of the given kind, with a
 * preview string. Pure: same `args` and `result` always produce the
 * same view.
 */
export function presentResult<T>(
  kind: ToolCardKind,
  args: T,
  result: ToolResult,
  makePreview: (args: T, result: ToolResult) => string,
  extras?: Partial<ToolCardView>,
): ToolCardView {
  return {
    kind,
    preview: makePreview(args, result),
    isCall: false,
    ...extras,
  };
}

/**
 * Builds a generic card view. Default when the tool doesn't declare a
 * more specific kind.
 */
export function presentGeneric<T>(
  args: T,
  result: ToolResult,
  makePreview: (args: T) => string = (a) => JSON.stringify(a),
): ToolCardView {
  return {
    kind: 'generic',
    preview: makePreview(args),
    isCall: false,
  };
}

/**
 * Builds a terminal card from bash output. The `terminal` field is
 * populated for the client to render in a terminal-like component.
 */
export function presentTerminal(
  command: string,
  result: ToolResult,
  exitCode: number | undefined,
  durationMs: number,
): ToolCardView {
  const stdout = extractText(result, 'stdout');
  const stderr = extractText(result, 'stderr');
  return {
    kind: 'terminal',
    preview: command,
    isCall: false,
    terminal: {command, exitCode, stdout, stderr, durationMs},
  };
}

/**
 * Builds a search card from a search tool result.
 */
export function presentSearch(
  query: string,
  matchCount: number,
  previewSnippets: ReadonlyArray<{file: string; line: number; snippet: string}>,
): ToolCardView {
  return {
    kind: 'search',
    preview: `Found ${matchCount} match(es) for "${query}"`,
    isCall: false,
    search: {query, matchCount, preview: previewSnippets},
  };
}

/**
 * Extracts the text payload from a tool result, with a default.
 */
function extractText(result: ToolResult, key: string): string {
  if (result.content.length === 0) {
    return '';
  }
  const text = (result.content[0] as {text?: string}).text ?? '';
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const v = parsed[key];
    return typeof v === 'string' ? v : '';
  } catch {
    return text;
  }
}
