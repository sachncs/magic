/**
 * @fileoverview Cost tracker. Records token usage per session, applies
 * per-provider pricing, enforces per-session and global caps.
 */

import {computeCostUsd, getPricing, type ProviderId} from '@magic/shared/types/pricing';
import type {SessionId} from '@magic/shared/branded';

interface Usage {
  readonly provider: ProviderId;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens: number;
  readonly ts: number;
}

interface SessionAccumulator {
  sessionId: SessionId;
  costUsd: number;
  capUsd: number;
  usage: Usage[];
}

/**
 * Per-session accumulators.
 */
const sessions = new Map<SessionId, SessionAccumulator>();

/**
 * Per-process global cap (USD). Read once from env.
 */
const GLOBAL_CAP_USD = Number.parseFloat(process.env['MAGIC_COST_CAP_USD'] ?? '0') || 0;

let globalCost = 0;

/**
 * Records token usage for a session. Returns the cost incurred.
 */
export function recordUsage(
  sessionId: SessionId,
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0,
): number {
  const pricing = getPricing(provider, model);
  if (pricing === undefined) {
    return 0;
  }
  const cost = computeCostUsd(pricing, inputTokens, outputTokens, cachedInputTokens);
  let acc = sessions.get(sessionId);
  if (acc === undefined) {
    const envCap = Number.parseFloat(process.env['MAGIC_COST_CAP_USD'] ?? '0') || 0;
    acc = {sessionId, costUsd: 0, capUsd: envCap, usage: []};
    sessions.set(sessionId, acc);
  }
  acc.costUsd += cost;
  globalCost += cost;
  acc.usage.push({provider, model, inputTokens, outputTokens, cachedInputTokens, ts: Date.now()});
  return cost;
}

/**
 * Sets the per-session cap (USD). Pass 0 for no cap.
 */
export function setSessionCap(sessionId: SessionId, capUsd: number): void {
  let acc = sessions.get(sessionId);
  if (acc === undefined) {
    acc = {sessionId, costUsd: 0, capUsd, usage: []};
    sessions.set(sessionId, acc);
  } else {
    acc = {...acc, capUsd};
    sessions.set(sessionId, acc);
  }
}

/**
 * Returns the running cost for a session.
 */
export function getSessionCost(sessionId: SessionId): number {
  return sessions.get(sessionId)?.costUsd ?? 0;
}

/**
 * Returns the global cost.
 */
export function getGlobalCost(): number {
  return globalCost;
}

/**
 * Thrown when a per-session or global cap is exceeded.
 */
export class CostExceededError extends Error {
  constructor(public readonly sessionId: SessionId, public readonly kind: 'session' | 'global') {
    super(`cost cap exceeded (${kind}) for session ${sessionId}`);
    this.name = 'CostExceededError';
  }
}

/**
 * Throws CostExceededError if the session or global cap is exceeded.
 */
export function checkCap(sessionId: SessionId): void {
  const acc = sessions.get(sessionId);
  if (acc === undefined) {
    return;
  }
  if (acc.capUsd > 0 && acc.costUsd >= acc.capUsd) {
    throw new CostExceededError(sessionId, 'session');
  }
  if (GLOBAL_CAP_USD > 0 && globalCost >= GLOBAL_CAP_USD) {
    throw new CostExceededError(sessionId, 'global');
  }
}

/**
 * Test-only: reset all accumulators.
 */
export function __resetCostTrackerForTests(): void {
  sessions.clear();
  globalCost = 0;
}
