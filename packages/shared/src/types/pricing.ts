/**
 * @fileoverview Per-provider token pricing, in USD per 1M tokens. Used by
 * the cost tracker (Phase 4) to convert token counts to dollar amounts.
 * Prices are best-effort; users should verify against their provider's
 * current pricing page.
 */

import {z} from 'zod';

/**
 * Provider identifiers recognised by `buildModel()`.
 */
export const PROVIDER_IDS = [
  'ollama',
  'llamacpp',
  'openai-compat',
  'bedrock',
  'anthropic',
  'openai',
  'google',
  'minimax',
] as const;

/**
 * Branded type for a provider id.
 */
export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Zod schema for `ProviderId`.
 */
export const providerIdSchema = z.enum(PROVIDER_IDS);

/**
 * Pricing for a single model under a single provider. Prices in USD per
 * 1M tokens. `input` and `output` are required; `cachedInput` is
 * optional (only some providers support prompt caching).
 */
export interface ModelPricing {
  readonly input: number;
  readonly output: number;
  readonly cachedInput?: number;
}

/**
 * Map of `provider -> modelName -> pricing`. Lookup with
 * `PRICING[provider]?.[modelName]`.
 */
export type PricingTable = Readonly<Record<string, Readonly<Record<string, ModelPricing>>>>;

/**
 * The default pricing table. Conservative defaults; users can override per
 * deployment. All values are USD per 1M tokens.
 */
export const PRICING: PricingTable = {
  bedrock: {
    'global.anthropic.claude-sonnet-4-6': {input: 3, output: 15},
    'global.anthropic.claude-opus-4-6': {input: 15, output: 75},
    'global.anthropic.claude-haiku-4-5': {input: 1, output: 5},
  },
  anthropic: {
    'claude-sonnet-4-6': {input: 3, output: 15},
    'claude-opus-4-6': {input: 15, output: 75},
    'claude-haiku-4-5': {input: 1, output: 5},
  },
  openai: {
    'gpt-4o': {input: 5, output: 15},
    'gpt-4o-mini': {input: 0.15, output: 0.6},
    'o1': {input: 15, output: 60},
    'o1-mini': {input: 3, output: 12},
  },
  google: {
    'gemini-2.5-pro': {input: 1.25, output: 10},
    'gemini-2.5-flash': {input: 0.075, output: 0.3},
  },
  minimax: {
    'MiniMax-M3': {input: 1, output: 3},
  },
  ollama: {
    // Local models: no API cost. Tracked for token accounting only.
    'qwen2.5-coder:14b': {input: 0, output: 0},
    'qwen2.5-coder:32b': {input: 0, output: 0},
    'deepseek-coder-v2': {input: 0, output: 0},
    'codellama:34b': {input: 0, output: 0},
  },
  llamacpp: {
    // Local: zero cost.
  },
  'openai-compat': {
    // Generic; users configure per-deployment.
  },
};

/**
 * Looks up pricing for a model. Returns undefined if neither the provider
 * nor the model is known.
 */
export function getPricing(
  provider: ProviderId,
  modelName: string,
): ModelPricing | undefined {
  return PRICING[provider]?.[modelName];
}

/**
 * Computes cost in USD for a given token usage.
 */
export function computeCostUsd(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0,
): number {
  const inputCost = (inputTokens - cachedInputTokens) * (pricing.input / 1_000_000);
  const cachedCost = cachedInputTokens * ((pricing.cachedInput ?? pricing.input) / 1_000_000);
  const outputCost = outputTokens * (pricing.output / 1_000_000);
  return inputCost + cachedCost + outputCost;
}
