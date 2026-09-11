# Model providers

magic supports six model providers. Set the env vars for whichever
you have; detection is automatic.

## Provider catalogue

Every provider magic can talk to today is documented below. We list
what each provider is and whether the upstream service is run by the
maintainer (`self-hosted`) or a third party (`hosted`). The default
shipped providers are intentionally a mix so an operator can choose
between data-residency and operational convenience.

| Provider       | Who runs it | Notes |
|----------------|-------------|-------|
| Local (Ollama / llama.cpp / any OpenAI-compatible) | self-hosted | Bring your own model; defaults to `qwen2.5-coder:14b`. |
| Amazon Bedrock | hosted (AWS) | Bearer token preferred; also accepts standard AWS creds. |
| Anthropic      | hosted      | Direct API access to the Claude family. |
| OpenAI         | hosted      | OpenAI or any OpenAI-compatible endpoint via `MAGIC_MODEL_PROVIDER=openai-compat`. |
| Google         | hosted      | Gemini models. |
| MiniMax        | hosted      | OpenAI-compatible inference API at `https://api.minimax.chat/v1`; default model id `MiniMax-M3`. See `## MiniMax` below. |

The provider list lives in `packages/agent-graph/src/model.ts`
(`SUPPORTED_PROVIDERS`); adding a new one is a one-line append plus
a detection branch.

## Detection priority

`buildModel()` walks this list and uses the first match:

1. `MAGIC_MODEL_PROVIDER` set → local model
2. AWS credentials → Bedrock
3. `ANTHROPIC_API_KEY` → Anthropic
4. `OPENAI_API_KEY` → OpenAI
5. `GOOGLE_API_KEY` → Google
6. `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL` → MiniMax
7. None → `ModelNotConfiguredError` listing every supported env

## Amazon Bedrock

```bash
# Option 1: bearer token (preferred)
export AWS_BEARER_TOKEN_BEDROCK=<token>
export AWS_REGION=us-east-1
export MAGIC_BEDROCK_MODEL_ID=global.anthropic.claude-sonnet-4-6

# Option 2: standard AWS credentials
export AWS_ACCESS_KEY_ID=<key>
export AWS_SECRET_ACCESS_KEY=<secret>
export AWS_REGION=us-east-1
```

Available models (override `MAGIC_BEDROCK_MODEL_ID`):
- `global.anthropic.claude-sonnet-4-6` (default)
- `global.anthropic.claude-opus-4-6`
- `global.anthropic.claude-haiku-4-5`

Make sure model access is enabled in the Bedrock console. See the
[AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access-modify.html).

## Anthropic (direct)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Model: `claude-sonnet-4-6` (default). Override via a model override
once the Strands integration lands.

## OpenAI

```bash
export OPENAI_API_KEY=sk-...
```

Model: `gpt-4o` (default). To use a different model, set
`MAGIC_MODEL_PROVIDER=openai-compat` and the three local env vars.

## Google

```bash
export GOOGLE_API_KEY=AI...
```

Model: `gemini-2.5-pro` (default).

## MiniMax

```bash
export MINIMAX_API_KEY=<key>
export MINIMAX_BASE_URL=https://<your-minimax-endpoint>/v1
export MINIMAX_MODEL=MiniMax-M3
```

All three envs are required. The base URL depends on which MiniMax
endpoint you have; the default `https://api.minimax.chat/v1` in
`.env.example` is the public OpenAI-compatible inference API. Use
this provider when you want a single environment variable triple
(`MINIMAX_*`) and no regional cloud account — useful for evaluation
runs and quick demos. For production work we recommend one of the
hosted-via-cloud providers above.

## Local (Ollama / llama.cpp / any OpenAI-compatible)

```bash
# Install Ollama
brew install ollama
ollama serve
ollama pull qwen2.5-coder:14b

# Configure magic
export MAGIC_MODEL_PROVIDER=ollama
# MAGIC_MODEL_BASE_URL defaults to http://localhost:11434/v1
# MAGIC_MODEL_NAME defaults to qwen2.5-coder:14b
```

To use a different OpenAI-compatible endpoint (LM Studio, vLLM,
LiteLLM proxy, etc):

```bash
export MAGIC_MODEL_PROVIDER=openai-compat
export MAGIC_MODEL_BASE_URL=https://my-proxy.example/v1
export MAGIC_MODEL_NAME=my-model
export MAGIC_MODEL_API_KEY=<optional>
```

### llama.cpp

llama.cpp is supported via the same `openai-compat` provider since
its server speaks the OpenAI protocol. Start it with:

```bash
./llama-server -m model.gguf --port 8080
export MAGIC_MODEL_PROVIDER=openai-compat
export MAGIC_MODEL_BASE_URL=http://localhost:8080/v1
export MAGIC_MODEL_NAME=model
```

## Verifying setup

After configuring, hit the health endpoint:

```bash
curl http://localhost:4317/api/health/ready
# {"ok":true,"model":"bedrock","dataDir":true}
```

The response includes the detected provider. If you see 503, the
server will report the reason in the `reason` field.

## Pricing

Default per-provider pricing lives in
`packages/shared/src/types/pricing.ts` and is used by the cost
tracker. Local models are zero-cost. Override `PRICING` if your
billing differs.

## Provider fallback

Set `MAGIC_PROVIDER_FALLBACK=openai,anthropic` (comma-separated) to
specify a fallback chain. After `MAGIC_PROVIDER_FALLBACK_THRESHOLD=3`
(default) consecutive retryable failures on the primary, magic
swaps to the next provider.
