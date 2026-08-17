# ADR 0004 — Model detection priority

## Status
Accepted (v1).

## Context
We support six model providers (Ollama, llama.cpp, any OpenAI-
compatible, Bedrock, Anthropic, OpenAI, Google, MiniMax). Users
configure credentials via env. We need a deterministic priority so
that the same env always picks the same provider.

## Decision
Detection order (first match wins):
1. `MAGIC_MODEL_PROVIDER` set → local model (ollama / llamacpp /
   openai-compat). Uses `MAGIC_MODEL_BASE_URL`,
   `MAGIC_MODEL_NAME`, optional `MAGIC_MODEL_API_KEY`.
2. AWS credentials (`AWS_BEARER_TOKEN_BEDROCK` or `AWS_ACCESS_KEY_ID`)
   → Bedrock with `MAGIC_BEDROCK_MODEL_ID` (default
   `global.anthropic.claude-sonnet-4-6`).
3. `ANTHROPIC_API_KEY` → Anthropic.
4. `OPENAI_API_KEY` → OpenAI.
5. `GOOGLE_API_KEY` → Google.
6. `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL` → MiniMax.
7. None → throw `ModelNotConfiguredError` listing every supported env.

The detection is centralised in `buildModel()`; no agent code reads
env directly.

## Consequences
- Predictable for users: setting any single provider's env selects
  that provider
- Provider-agnostic: the agent runtime takes a `ModelDescriptor`,
  not a provider-specific client
- Easy to add a new provider: extend the chain

## Alternatives considered
- User-picks-via-UI-only: rejected — the runtime needs to bootstrap
  before the UI can offer a choice
- Always require explicit `MAGIC_MODEL_PROVIDER`: rejected — the
  default behaviour (Bedrock if creds present) matches the most
  common cloud user

## Date
2026-08-17.
