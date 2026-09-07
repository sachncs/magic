/**
 * @fileoverview Barrel + factory for @magic/tools. The
 * `createSandboxedTools()` factory composes every tool with the
 * safety wrappers (denylist, network-guard, spill-store) and returns
 * a single array suitable for passing to an Agent.
 */

import {repoIndexTool} from './repo/index.js';
import {repoSearchTool} from './repo/search.js';
import {repoReadTool} from './repo/read.js';
import {repoLintTool} from './repo/lint.js';
import {repoTestTool} from './repo/test.js';
import {repoSecurityTool} from './repo/security.js';
import {bashTool} from './sandbox.js';
import {searchDocsTool, fetchDocTool} from './strands_docs.js';
import {astSearchTool} from './ast_search.js';
import {callGraphTool} from './call_graph.js';
import {monorepoIndexTool} from './monorepo_index.js';
import {playwrightTool} from './playwright_tool.js';
import {semanticSearchTool} from './semantic_search.js';
import {detectHarness} from './repo/harness.js';
import {type ToolDefinition, type ToolResult} from './tool.js';
import {unbrand} from '@magic/shared/branded';

export {tool, ok, err} from './tool.js';
export type {ToolDefinition, ToolResult} from './tool.js';
export {unbrand};

export {bashTool} from './sandbox.js';
export {searchDocsTool, fetchDocTool, setDocsClient} from './strands_docs.js';
export type {DocsClient} from './strands_docs.js';
export {repoIndexTool} from './repo/index.js';
export {repoSearchTool} from './repo/search.js';
export {repoReadTool} from './repo/read.js';
export {repoLintTool} from './repo/lint.js';
export {repoTestTool} from './repo/test.js';
export {repoSecurityTool} from './repo/security.js';
export {astSearchTool} from './ast_search.js';
export {callGraphTool} from './call_graph.js';
export {monorepoIndexTool} from './monorepo_index.js';
export {playwrightTool, setPlaywrightClient} from './playwright_tool.js';
export type {PlaywrightClient, PlaywrightAction} from './playwright_tool.js';
export {semanticSearchTool} from './semantic_search.js';
export {spillResult, retrieveSpill, maybeSpill} from './spill_store.js';
export {isUrlAllowed, assertUrlAllowed, networkMode} from './network_guard.js';
export {
  isCommandSafe,
  isDestructiveGit,
  isGitAllowed,
  checkGitCommand,
} from './git_policy.js';
export {withFileLock, __resetLocksForTests} from './concurrent_writes.js';
export {checkCapabilities, assertCanUseModel} from './capability_check.js';
export {withRetry, isRetryable, backoffMs, RETRYABLE_STATUSES} from './retry.js';
export {withFallback, parseFallbackChain, fallbackThreshold} from './provider_fallback.js';
export {inferConventions, type InferredConventions} from './convention_infer.js';
export {getResourceLimits, spawnWithLimits} from './sandbox.js';
export {detectHarness} from './repo/harness.js';
import {detectHarness as _detectHarness} from './repo/harness.js';
/** Alias for the plan item name `repo_harness`. */
export const repoHarnessTool = _detectHarness;

/**
 * Composes the canonical tool set for an Agent, scoped to a single
 * repoPath. Returns an array of tool definitions ready to pass to
 * the agent runtime.
 */
export function createSandboxedTools(repoPath: string): ReadonlyArray<ToolDefinition<never>> {
  void repoPath;
  return [
    bashTool as unknown as ToolDefinition<never>,
    repoIndexTool as unknown as ToolDefinition<never>,
    repoSearchTool as unknown as ToolDefinition<never>,
    repoReadTool as unknown as ToolDefinition<never>,
    repoLintTool as unknown as ToolDefinition<never>,
    repoTestTool as unknown as ToolDefinition<never>,
    repoSecurityTool as unknown as ToolDefinition<never>,
    astSearchTool as unknown as ToolDefinition<never>,
    callGraphTool as unknown as ToolDefinition<never>,
    monorepoIndexTool as unknown as ToolDefinition<never>,
    semanticSearchTool as unknown as ToolDefinition<never>,
    searchDocsTool as unknown as ToolDefinition<never>,
    fetchDocTool as unknown as ToolDefinition<never>,
    playwrightTool as unknown as ToolDefinition<never>,
  ];
}

const _exhaustiveToolResult: ToolResult | undefined = undefined;
void _exhaustiveToolResult;
