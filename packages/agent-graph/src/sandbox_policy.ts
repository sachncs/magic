/**
 * @fileoverview Shared sandbox policy singleton. Tools (bash,
 * fileEditor, fileRead) read from this to enforce the same rules
 * across the agent graph.
 */

import {currentPreset, resolvePreset, type PermissionPreset, type ResolvedPolicy} from './permissions.js';
import {env} from 'node:process';

/**
 * The current shared policy. Mutated via `setPreset` when the user
 * switches presets in the UI.
 */
let current: ResolvedPolicy = resolvePreset(currentPreset(), process.cwd());

/**
 * Returns the current shared policy.
 */
export function getCurrentPolicy(): ResolvedPolicy {
  return current;
}

/**
 * Sets the policy directly. Used by the agent runtime when the
 * `permission/preset` event fires.
 */
export function setPolicy(policy: ResolvedPolicy): void {
  current = policy;
}

/**
 * Switches the policy by preset name. The new policy is recomputed
 * using the current `cwd` (or the env override if set).
 */
export function setPreset(preset: PermissionPreset): void {
  const repoPath = env['MAGIC_REPO_PATH'] ?? process.cwd();
  current = resolvePreset(preset, repoPath);
}
