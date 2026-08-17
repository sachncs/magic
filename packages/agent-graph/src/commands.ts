/**
 * @fileoverview Slash commands. These are user-typed inputs that never
 * become model messages; they resolve to a graph action.
 */

export const COMMANDS = ['/plan', '/commit', '/restore', '/cancel', '/search'] as const;

export type CommandName = (typeof COMMANDS)[number];

/**
 * The action a command resolves to.
 */
export type CommandAction =
  | {kind: 'plan'; spec: string}
  | {kind: 'commit'; message: string}
  | {kind: 'restore'; sessionId: string}
  | {kind: 'cancel'; reason?: string}
  | {kind: 'search'; query: string};

/**
 * Returns true if `input` starts with a recognised command.
 */
export function isCommand(input: string): boolean {
  return COMMANDS.some((c) => input.trim().startsWith(c));
}

/**
 * Parses a command input into an action. Returns null if the input is
 * not a command or is malformed.
 */
export function parseCommand(input: string): CommandAction | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('/plan')) {
    return {kind: 'plan', spec: trimmed.slice(5).trim()};
  }
  if (trimmed.startsWith('/commit')) {
    return {kind: 'commit', message: trimmed.slice(7).trim()};
  }
  if (trimmed.startsWith('/restore')) {
    return {kind: 'restore', sessionId: trimmed.slice(8).trim()};
  }
  if (trimmed.startsWith('/cancel')) {
    return {kind: 'cancel', reason: trimmed.slice(7).trim() || undefined};
  }
  if (trimmed.startsWith('/search')) {
    return {kind: 'search', query: trimmed.slice(7).trim()};
  }
  return null;
}
