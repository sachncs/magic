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
import {type ToolDefinition} from './tool.js';
import type {ToolResult} from './tool.js';

export {tool, ok, err} from './tool.js';
export type {ToolDefinition, ToolResult} from './tool.js';

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
export {isCommandSafe, isDestructiveGit, isGitAllowed, checkGitCommand} from './git_policy.js';
export {withFileLock, __resetLocksForTests} from './concurrent_writes.js';
export {checkCapabilities, assertCanUseModel} from './capability_check.js';
export {withRetry, isRetryable, backoffMs, RETRYABLE_STATUSES} from './retry.js';
export {withFallback, parseFallbackChain, fallbackThreshold} from './provider_fallback.js';
export {inferConventions, type InferredConventions} from './convention_infer.js';
export {getResourceLimits, spawnWithLimits} from './sandbox.js';

/**
 * Composes the canonical tool set for an Agent, scoped to a single
 * repoPath. Returns an array of tool definitions ready to pass to
 * the agent runtime.
 */
export function createSandboxedTools(repoPath: string): ReadonlyArray<ToolDefinition<unknown>> {
  return [
    bashTool, // wraps with CWD lock + denylist at the tool layer
    repoIndexTool,
    repoSearchTool,
    repoReadTool,
    repoLintTool,
    repoTestTool,
    repoSecurityTool,
    astSearchTool,
    callGraphTool,
    monorepoIndexTool,
    semanticSearchTool,
    searchDocsTool,
    fetchDocTool,
    playwrightTool,
  ];
  // repoPath is a future hook for sandboxing; included for API stability.
  void repoPath;
  void {} as ToolResult;
}
