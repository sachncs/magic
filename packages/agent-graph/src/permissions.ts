/**
 * @fileoverview Permission presets. A single switch (read-only /
 * workspace-write / danger-full-access) controls a bundle of
 * policies: sandbox mode, approval policy, and writable roots.
 * Tools (bash, fileEditor, fileRead) read the current preset and
 * enforce accordingly.
 */

export const PERMISSION_PRESETS = ['read-only', 'workspace-write', 'danger-full-access'] as const;

/**
 * The permission preset a session is currently in.
 */
export type PermissionPreset = (typeof PERMISSION_PRESETS)[number];

/**
 * The resolved policy for a preset.
 */
export interface ResolvedPolicy {
  /** Sandbox mode for shell tools. */
  readonly sandboxMode: 'read-only' | 'workspace-write' | 'full';
  /** Approval policy for sensitive tool calls. */
  readonly approvalPolicy: 'always' | 'destructive-only' | 'never';
  /** Writable roots for file edits. `undefined` means no restriction. */
  readonly writableRoots: ReadonlyArray<string> | undefined;
}

/**
 * Resolves a preset to a concrete policy. `repoPath` is the workspace
 * root; presets other than `danger-full-access` scope writes to it.
 */
export function resolvePreset(
  preset: PermissionPreset,
  repoPath: string,
): ResolvedPolicy {
  switch (preset) {
    case 'read-only':
      return {
        sandboxMode: 'read-only',
        approvalPolicy: 'destructive-only',
        writableRoots: [],
      };
    case 'workspace-write':
      return {
        sandboxMode: 'workspace-write',
        approvalPolicy: 'destructive-only',
        writableRoots: [repoPath],
      };
    case 'danger-full-access':
      return {
        sandboxMode: 'full',
        approvalPolicy: 'never',
        writableRoots: undefined,
      };
  }
}

/**
 * The current preset. Resolved from `MAGIC_PERMISSION_PRESET` env,
 * defaulting to `workspace-write`.
 */
export function currentPreset(): PermissionPreset {
  const raw = process.env['MAGIC_PERMISSION_PRESET'];
  if (raw === 'read-only' || raw === 'workspace-write' || raw === 'danger-full-access') {
    return raw;
  }
  return 'workspace-write';
}
