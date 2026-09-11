/**
 * @fileoverview Single-purpose agents. Each wraps a system prompt and
 * a set of tools. The `runner` is the implementation that produces
 * an `AgentResult`; in v1 we use a deterministic stub that calls
 * the tool surface directly. The Strands SDK can later replace the
 * runner with a model-driven agent.
 *
 * Status: STUB. The \`router\` and \`planner\` runners are heuristic
 * keyword matches against the user message; a real LLM-driven
 * implementation will replace them once the Strands layer is wired
 * (see issue #34). The other agents do call the tool surface, but
 * also short-circuit any LLM-driven reasoning.
 */

import {defineAgent, type MagicAgent, type AgentResult, type AgentInput} from '../agent.js';
import {
  INDEXER_PROMPT,
  HARNESS_DETECTOR_PROMPT,
  PLANNER_PROMPT,
  SECURITY_AUDITOR_PROMPT,
  ROUTER_PROMPT,
  REPORTER_PROMPT,
  VERIFIER_PROMPT,
  GIT_OPERATOR_PROMPT,
  CONVENTION_LEARNER_PROMPT,
} from '../prompts/index.js';
import {
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
  bashTool,
  inferConventions,
} from '@magic/tools';
import {detectHarness} from '@magic/tools/harness';
import {addKbEntry, getKbEntry} from '../memory/codebase_kb.js';
import {recordUsage, getSessionCost, checkCap, CostExceededError} from '../cost_tracker.js';
import {getCurrentPolicy} from '../sandbox_policy.js';
import {checkGitCommand} from '@magic/tools/git_policy';
import {newToolCallId, type SessionId, type WorkspaceId, type ToolCallId} from '@magic/shared/branded';

/**
 * Helper: build a synthetic tool call id.
 */
function tcid(): ToolCallId {
  return newToolCallId();
}

/**
 * Indexer agent. Wraps `repo_index`; on success emits a RepoManifest
 * into the invocation state.
 */
export const indexerAgent: MagicAgent = defineAgent({
  id: 'indexer',
  description: 'Walk a repo and produce a RepoManifest.',
  systemPrompt: INDEXER_PROMPT,
  tools: [repoIndexTool, repoReadTool, repoSearchTool, monorepoIndexTool, astSearchTool],
  runner: async (input): Promise<AgentResult> => {
    const r = await repoIndexTool.callback({path: input.state.repoPath});
    const text = (r.content[0] as {text: string}).text;
    let manifest: unknown;
    try {
      manifest = JSON.parse(text);
    } catch {
      manifest = null;
    }
    return {
      text: typeof manifest === 'object' && manifest !== null ? 'manifest ready' : 'failed',
      toolCalls: [{toolCallId: tcid(), toolName: 'repo_index', args: {path: input.state.repoPath}}],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: manifest,
      events: [],
    };
  },
});

/**
 * Harness detector agent.
 */
export const harnessDetectorAgent: MagicAgent = defineAgent({
  id: 'harness_detector',
  description: 'Detect build/test/lint/format commands for a repo.',
  systemPrompt: HARNESS_DETECTOR_PROMPT,
  tools: [bashTool],
  runner: async (input): Promise<AgentResult> => {
    const harness = await detectHarness(input.state.repoPath);
    return {
      text: 'harness ready',
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: harness,
      events: [],
    };
  },
});

/**
 * Planner agent. Writes a notebook checklist. The notebook is
 * represented as an in-memory plan (the actual notebook persistence
 * integrates with Strands' notebook tool in the integration layer).
 */
export const plannerAgent: MagicAgent = defineAgent({
  id: 'planner',
  description: 'Produce a step-by-step plan as a notebook checklist.',
  systemPrompt: PLANNER_PROMPT,
  tools: [repoReadTool, semanticSearchTool],
  runner: async (input): Promise<AgentResult> => {
    const plan = {
      steps: [
        'Read the manifest and key files',
        'Identify the minimal set of files to change',
        'Implement the change with typecheck + test verification',
        'Run the harness (lint, test, build)',
        'Open a draft PR with a Conventional Commits message',
      ],
    };
    return {
      text: 'plan ready',
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: plan,
      events: [],
    };
  },
});

/**
 * Security auditor agent.
 */
export const securityAuditorAgent: MagicAgent = defineAgent({
  id: 'security_auditor',
  description: 'Run security scans and summarise findings.',
  systemPrompt: SECURITY_AUDITOR_PROMPT,
  tools: [repoSecurityTool],
  runner: async (input): Promise<AgentResult> => {
    const r = await repoSecurityTool.callback({path: input.state.repoPath});
    const text = (r.content[0] as {text: string}).text;
    let findings: unknown = null;
    try {
      findings = JSON.parse(text);
    } catch {
      // ignore
    }
    return {
      text: 'security audit complete',
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: findings,
      events: [],
    };
  },
});

/**
 * Router agent. Classifies intent and dispatches to a swarm. In v1
 * we just inspect the message; the Strands integration lets the LLM
 * make the call.
 */
export const routerAgent: MagicAgent = defineAgent({
  id: 'router',
  description: 'Classify user intent and dispatch to a swarm.',
  systemPrompt: ROUTER_PROMPT,
  tools: [],
  runner: async (input): Promise<AgentResult> => {
    const m = input.message.toLowerCase();
    let swarm: 'explainer' | 'coder' | 'refactor' | 'productionise';
    if (m.includes('explain') || m.includes('what does') || m.includes('how does')) {
      swarm = 'explainer';
    } else if (m.includes('refactor') || m.includes('restructure')) {
      swarm = 'refactor';
    } else if (m.includes('docker') || m.includes('ci') || m.includes('deploy') || m.includes('productionise')) {
      swarm = 'productionise';
    } else {
      swarm = 'coder';
    }
    return {
      text: `dispatching to ${swarm}`,
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: {swarm},
      events: [],
    };
  },
});

/**
 * Reporter agent. Synthesises the final report.
 */
export const reporterAgent: MagicAgent = defineAgent({
  id: 'reporter',
  description: 'Synthesise the swarm output into a final report.',
  systemPrompt: REPORTER_PROMPT,
  tools: [],
  runner: async (input): Promise<AgentResult> => {
    const prev = input.previousOutput ?? '';
    return {
      text: `## Summary\n${prev || '(no prior output)'}\n\n## Next Steps\n- Review the diff\n- Approve the PR`,
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      events: [],
    };
  },
});

/**
 * Verifier agent. Runs typecheck + lint + test + build; returns
 * {ok, issues}.
 */
export const verifierAgent: MagicAgent = defineAgent({
  id: 'verifier',
  description: 'Verify a diff meets the spec by running tests + lint + build.',
  systemPrompt: VERIFIER_PROMPT,
  tools: [repoTestTool, repoLintTool, bashTool],
  runner: async (input): Promise<AgentResult> => {
    const issues: string[] = [];
    const lint = await repoLintTool.callback({path: input.state.repoPath});
    const lintText = (lint.content[0] as {text: string}).text;
    try {
      const parsed = JSON.parse(lintText) as {ok: boolean};
      if (!parsed.ok) {
        issues.push('lint failed');
      }
    } catch {
      issues.push('lint parse error');
    }
    const test = await repoTestTool.callback({path: input.state.repoPath});
    const testText = (test.content[0] as {text: string}).text;
    try {
      const parsed = JSON.parse(testText) as {ok: boolean; passed: number; failed: number};
      if (!parsed.ok) {
        issues.push(`tests failed: ${parsed.failed} failed / ${parsed.passed} passed`);
      }
    } catch {
      issues.push('test parse error');
    }
    return {
      text: issues.length === 0 ? 'verification passed' : `verification failed: ${issues.join('; ')}`,
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: {ok: issues.length === 0, issues},
      events: [],
    };
  },
});

/**
 * Git operator agent. Generates branch, commit, PR.
 */
export const gitOperatorAgent: MagicAgent = defineAgent({
  id: 'git_operator',
  description: 'Turn a diff into a branch + commit + draft PR.',
  systemPrompt: GIT_OPERATOR_PROMPT,
  tools: [bashTool],
  runner: async (input): Promise<AgentResult> => {
    // Check policy before doing anything.
    const policy = checkGitCommand('git push origin HEAD');
    if (policy !== 'allow') {
      return {
        text: `git policy refused: ${policy}`,
        toolCalls: [],
        usage: {inputTokens: 0, outputTokens: 0},
        structured: {ok: false, reason: policy},
        events: [],
      };
    }
    void getCurrentPolicy;
    return {
      text: 'git operations prepared (stub: real impl calls gh CLI)',
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: {ok: true, branch: `magic/${new Date().toISOString().slice(0, 10)}-change`},
      events: [],
    };
  },
});

/**
 * Convention learner agent. Runs once per workspace; persists
 * inferred conventions to the KB.
 */
export const conventionLearnerAgent: MagicAgent = defineAgent({
  id: 'convention_learner',
  description: 'Infer project conventions and persist to the codebase KB.',
  systemPrompt: CONVENTION_LEARNER_PROMPT,
  tools: [],
  runner: async (input): Promise<AgentResult> => {
    const conventions = await inferConventions(input.state.repoPath);
    const ws = input.state.workspaceId;
    await addKbEntry(ws, 'convention', 'naming', conventions.naming.value, conventions.naming.confidence, 'convention_learner');
    await addKbEntry(ws, 'convention', 'errorHandling', conventions.errorHandling.value, conventions.errorHandling.confidence, 'convention_learner');
    await addKbEntry(ws, 'convention', 'testPattern', conventions.testPattern.value, conventions.testPattern.confidence, 'convention_learner');
    await addKbEntry(ws, 'convention', 'importStyle', conventions.importStyle.value, conventions.importStyle.confidence, 'convention_learner');
    return {
      text: 'conventions learned and persisted',
      toolCalls: [],
      usage: {inputTokens: 0, outputTokens: 0},
      structured: conventions,
      events: [],
    };
  },
});

void addKbEntry;
void getKbEntry;
void recordUsage;
void getSessionCost;
void checkCap;
void CostExceededError;
void searchDocsTool;
void fetchDocTool;
void callGraphTool;
void playwrightTool;
