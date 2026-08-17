/**
 * @fileoverview Model factory. Resolves a `Model` from environment.
 * Detection chain (first match wins):
 *
 *   1. `MAGIC_MODEL_PROVIDER` set → local model (ollama / llamacpp /
 *      openai-compat) using `MAGIC_MODEL_BASE_URL` +
 *      `MAGIC_MODEL_NAME` (+ optional `MAGIC_MODEL_API_KEY`).
 *   2. `AWS_BEARER_TOKEN_BEDROCK` or `AWS_*` creds → Bedrock.
 *   3. `ANTHROPIC_API_KEY` → Anthropic.
 *   4. `OPENAI_API_KEY` → OpenAI.
 *   5. `GOOGLE_API_KEY` → Google.
 *   6. `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL` → MiniMax.
 *   7. None → throw an onboarding error listing every supported env.
 *
 * The real concrete `Model` classes are imported from the Strands SDK
 * when the dependency is wired in. For now we define a local `Model`
 * type and return a thin provider descriptor; the agent runtime adapts
 * to the descriptor.
 */

import {env} from 'node:process';
import type {ProviderId} from '@magic/shared/types/pricing';

const SUPPORTED_PROVIDERS = [
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
 * Onboarding error thrown when no model provider is configured.
 */
export class ModelNotConfiguredError extends Error {
  constructor() {
    super(
      'no model provider configured; set one of:\n' +
        '  • MAGIC_MODEL_PROVIDER + MAGIC_MODEL_BASE_URL + MAGIC_MODEL_NAME (local)\n' +
        '  • AWS_BEARER_TOKEN_BEDROCK (Bedrock)\n' +
        '  • ANTHROPIC_API_KEY (Anthropic)\n' +
        '  • OPENAI_API_KEY (OpenAI)\n' +
        '  • GOOGLE_API_KEY (Google)\n' +
        '  • MINIMAX_API_KEY + MINIMAX_BASE_URL + MINIMAX_MODEL (MiniMax)',
    );
    this.name = 'ModelNotConfiguredError';
  }
}

/**
 * The resolved model descriptor. `providerId` and `modelId` are the
 * canonical identity; `baseUrl` is set for local / openai-compat
 * providers; `apiKey` is optional.
 */
export interface ModelDescriptor {
  readonly providerId: ProviderId;
  readonly modelId: string;
  readonly baseUrl?: string;
  readonly apiKey?: string;
  readonly region?: string;
}

/**
 * Resolves the model from env. Throws `ModelNotConfiguredError` if no
 * provider is configured.
 */
export function buildModel(): ModelDescriptor {
  // 1. Local model (explicit provider)
  if (env.MAGIC_MODEL_PROVIDER !== undefined && env.MAGIC_MODEL_PROVIDER.length > 0) {
    const provider = env.MAGIC_MODEL_PROVIDER as ProviderId;
    const baseUrl = env.MAGIC_MODEL_BASE_URL ?? 'http://localhost:11434/v1';
    const modelId = env.MAGIC_MODEL_NAME ?? 'qwen2.5-coder:14b';
    return {
      providerId: provider,
      modelId,
      baseUrl,
      apiKey: env.MAGIC_MODEL_API_KEY,
    };
  }

  // 2. Bedrock
  if (
    env.AWS_BEARER_TOKEN_BEDROCK !== undefined ||
    env.AWS_ACCESS_KEY_ID !== undefined ||
    env.AWS_PROFILE !== undefined
  ) {
    return {
      providerId: 'bedrock',
      modelId: env.MAGIC_BEDROCK_MODEL_ID ?? 'global.anthropic.claude-sonnet-4-6',
      region: env.AWS_REGION ?? 'us-east-1',
      apiKey: env.AWS_BEARER_TOKEN_BEDROCK,
    };
  }

  // 3. Anthropic
  if (env.ANTHROPIC_API_KEY !== undefined && env.ANTHROPIC_API_KEY.length > 0) {
    return {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      apiKey: env.ANTHROPIC_API_KEY,
    };
  }

  // 4. OpenAI
  if (env.OPENAI_API_KEY !== undefined && env.OPENAI_API_KEY.length > 0) {
    return {
      providerId: 'openai',
      modelId: 'gpt-4o',
      apiKey: env.OPENAI_API_KEY,
    };
  }

  // 5. Google
  if (env.GOOGLE_API_KEY !== undefined && env.GOOGLE_API_KEY.length > 0) {
    return {
      providerId: 'google',
      modelId: 'gemini-2.5-pro',
      apiKey: env.GOOGLE_API_KEY,
    };
  }

  // 6. MiniMax
  if (
    env.MINIMAX_API_KEY !== undefined &&
    env.MINIMAX_BASE_URL !== undefined &&
    env.MINIMAX_MODEL !== undefined
  ) {
    return {
      providerId: 'minimax',
      modelId: env.MINIMAX_MODEL,
      baseUrl: env.MINIMAX_BASE_URL,
      apiKey: env.MINIMAX_API_KEY,
    };
  }

  throw new ModelNotConfiguredError();
}

/**
 * Returns the list of provider ids this factory knows about. Useful
 * for the settings UI and error messages.
 */
export function supportedProviders(): ReadonlyArray<ProviderId> {
  return SUPPORTED_PROVIDERS;
}
