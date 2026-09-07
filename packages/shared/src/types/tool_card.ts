/**
 * @fileoverview Tool card types. A "card" is the visual representation of a
 * tool call in the chat UI. Each tool declares a `kind` (one of the
 * `ToolCardKind` values) and optional pure functions `presentCall` /
 * `presentResult` that produce a serialisable view from the tool's
 * arguments and result.
 *
 * The pure-function contract is critical: it makes tool views replayable.
 * The same arguments must always produce the same view, so the UI can
 * re-render any historical tool call from its stored args.
 */

import {z} from 'zod';

/**
 * The set of card kinds. Each kind maps to a dedicated React component on
 * the client; the server emits `ToolCardView` payloads tagged with `kind`.
 */
export const TOOL_CARD_KINDS = [
  'generic',
  'terminal',
  'diff',
  'search',
  'web',
] as const;

/**
 * Branded type for a card kind.
 */
export type ToolCardKind = (typeof TOOL_CARD_KINDS)[number];

/**
 * Zod schema for `ToolCardKind`.
 */
export const toolCardKindSchema = z.enum(TOOL_CARD_KINDS);

/**
 * A single diff hunk (for the `'diff'` card kind).
 */
export interface DiffHunk {
  /** File path the hunk applies to. */
  readonly path: string;
  /** Starting line in the original file. */
  readonly oldStart: number;
  /** Number of lines from the original file. */
  readonly oldLines: number;
  /** Starting line in the new file. */
  readonly newStart: number;
  /** Number of lines in the new file. */
  readonly newLines: number;
  /** Unified diff body. Lines start with ` `, `-`, or `+`. */
  readonly body: string;
}

/**
 * A terminal command + output (for the `'terminal'` card kind).
 */
export interface TerminalPayload {
  /** The command that was executed. */
  readonly command: string;
  /** Exit code, if known. */
  readonly exitCode?: number;
  /** Standard output. */
  readonly stdout: string;
  /** Standard error. */
  readonly stderr: string;
  /** Duration in milliseconds. */
  readonly durationMs?: number;
}

/**
 * A search query and its results (for the `'search'` card kind).
 */
export interface SearchPayload {
  /** The search query. */
  readonly query: string;
  /** Number of matches. */
  readonly matchCount: number;
  /** First few matches (for preview). */
  readonly preview: ReadonlyArray<{
    readonly file: string;
    readonly line: number;
    readonly snippet: string;
  }>;
}

/**
 * A web request and its result (for the `'web'` card kind).
 */
export interface WebPayload {
  /** The URL requested. */
  readonly url: string;
  /** HTTP method. */
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  /** Response status code. */
  readonly statusCode: number;
  /** Response body (truncated for preview). */
  readonly bodyPreview: string;
}

/**
 * The view sent to the client for rendering. `kind` selects the component;
 * the remaining fields are whatever the tool's presenter functions
 * produced. Pure: derived from `args` and (for results) the tool's
 * return value.
 */
export interface ToolCardView {
  /** Card kind. Selects React component on the client. */
  readonly kind: ToolCardKind;
  /** Human-readable preview (first line or summary). */
  readonly preview: string;
  /** Optional structured payload (diff hunks, terminal output, etc.). */
  readonly diff?: ReadonlyArray<DiffHunk>;
  readonly terminal?: TerminalPayload;
  readonly search?: SearchPayload;
  readonly web?: WebPayload;
  /** Spill locator if the result was spilled. */
  readonly locator?: string;
  /** Whether this view represents a call (true) or a result (false). */
  readonly isCall: boolean;
}

/**
 * A presenter function: a pure function from arguments to a view. Same
 * arguments MUST always produce the same view — the contract for
 * replay-safety.
 */
export type Presenter<TIn, TOut> = (
  args: TIn,
  result: TOut,
) => ToolCardView;

/**
 * A call presenter: pure function from arguments only (no result yet).
 */
export type CallPresenter<TIn> = (args: TIn) => ToolCardView;
