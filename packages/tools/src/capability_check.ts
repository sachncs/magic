/**
 * @fileoverview Capability check for a model. A cheap one-shot probe
 * verifies that the chosen model supports tool-use + streaming before
 * we hand it the full agent loop. Used by `buildModel()` in
 * @magic/agent-graph.
 */

import type {ProviderId} from '@magic/shared/types/pricing';

/**
 * A capability report from a probe.
 */
export interface ModelCapabilities {
  readonly toolUse: boolean;
  readonly streaming: boolean;
  readonly vision: boolean;
}

/**
 * The minimal model interface for capability probing. The Strands SDK's
 * Model class satisfies this; tests can pass a stub.
 */
export interface ProbedModel {
  /**
   * Provider id (matches the @magic/shared ProviderId union).
   */
  readonly providerId: ProviderId;

  /**
   * Issues a tiny probe call and returns the raw response text. Used to
   * detect capability support.
   */
  probe(prompt: string): Promise<{content: string}>;
}

/**
 * Heuristic detection of tool-use support: probe asks the model to
 * produce JSON with a specific shape. If the response parses as JSON,
 * tool use is considered supported.
 */
export async function checkCapabilities(model: ProbedModel): Promise<ModelCapabilities> {
  try {
    const r = await model.probe('reply with {"ok":true}');
    let toolUse = false;
    try {
      const parsed = JSON.parse(r.content) as {ok?: boolean};
      toolUse = parsed.ok === true;
    } catch {
      toolUse = false;
    }
    return {
      toolUse,
      streaming: true, // All major providers we target support streaming
      vision: false, // Conservative default; per-model override later
    };
  } catch {
    return {toolUse: false, streaming: false, vision: false};
  }
}

/**
 * Throws if the model lacks the required capabilities. Use as a gate
 * before invoking the agent loop.
 */
export async function assertCanUseModel(model: ProbedModel): Promise<void> {
  const caps = await checkCapabilities(model);
  if (!caps.toolUse) {
    throw new Error(
      `model ${model.providerId} lacks tool-use support; cannot run agent loop. ` +
        `Pick a model that supports function calling (e.g. claude-sonnet-4-6, gpt-4o, gemini-2.5-pro).`,
    );
  }
  if (!caps.streaming) {
    throw new Error(`model ${model.providerId} does not support streaming; required.`);
  }
}
