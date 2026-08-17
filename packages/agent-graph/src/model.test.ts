/**
 * @fileworkspace Tests for the model factory. Covers each provider
 * detection path and the onboarding-error fallback.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {buildModel, ModelNotConfiguredError, supportedProviders} from './model.js';

describe('buildModel', () => {
  const savedEnv = {...process.env};

  beforeEach(() => {
    // Clear all provider-relevant env.
    delete process.env.MAGIC_MODEL_PROVIDER;
    delete process.env.MAGIC_MODEL_BASE_URL;
    delete process.env.MAGIC_MODEL_NAME;
    delete process.env.MAGIC_MODEL_API_KEY;
    delete process.env.AWS_BEARER_TOKEN_BEDROCK;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_REGION;
    delete process.env.MAGIC_BEDROCK_MODEL_ID;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MINIMAX_BASE_URL;
    delete process.env.MINIMAX_MODEL;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it('throws when no provider is configured', () => {
    expect(() => buildModel()).toThrow(ModelNotConfiguredError);
  });

  it('resolves local ollama from MAGIC_MODEL_PROVIDER', () => {
    process.env.MAGIC_MODEL_PROVIDER = 'ollama';
    process.env.MAGIC_MODEL_NAME = 'qwen2.5-coder:14b';
    const m = buildModel();
    expect(m.providerId).toBe('ollama');
    expect(m.modelId).toBe('qwen2.5-coder:14b');
    expect(m.baseUrl).toBe('http://localhost:11434/v1');
  });

  it('resolves openai-compat with custom base URL', () => {
    process.env.MAGIC_MODEL_PROVIDER = 'openai-compat';
    process.env.MAGIC_MODEL_BASE_URL = 'https://my-proxy.example/v1';
    process.env.MAGIC_MODEL_NAME = 'my-model';
    const m = buildModel();
    expect(m.providerId).toBe('openai-compat');
    expect(m.baseUrl).toBe('https://my-proxy.example/v1');
  });

  it('resolves Bedrock when AWS_BEARER_TOKEN_BEDROCK is set', () => {
    process.env.AWS_BEARER_TOKEN_BEDROCK = 'token';
    const m = buildModel();
    expect(m.providerId).toBe('bedrock');
    expect(m.modelId).toContain('claude');
    expect(m.region).toBe('us-east-1');
  });

  it('resolves Anthropic', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-...';
    const m = buildModel();
    expect(m.providerId).toBe('anthropic');
  });

  it('resolves OpenAI', () => {
    process.env.OPENAI_API_KEY = 'sk-...';
    const m = buildModel();
    expect(m.providerId).toBe('openai');
  });

  it('resolves Google', () => {
    process.env.GOOGLE_API_KEY = 'AI...';
    const m = buildModel();
    expect(m.providerId).toBe('google');
  });

  it('resolves MiniMax when all three envs are set', () => {
    process.env.MINIMAX_API_KEY = 'k';
    process.env.MINIMAX_BASE_URL = 'https://api.minimax/v1';
    process.env.MINIMAX_MODEL = 'MiniMax-M3';
    const m = buildModel();
    expect(m.providerId).toBe('minimax');
    expect(m.modelId).toBe('MiniMax-M3');
  });

  it('does not resolve MiniMax if any of the three envs is missing', () => {
    process.env.MINIMAX_API_KEY = 'k';
    process.env.MINIMAX_BASE_URL = 'https://api.minimax/v1';
    // missing MINIMAX_MODEL
    expect(() => buildModel()).toThrow(ModelNotConfiguredError);
  });
});

describe('supportedProviders', () => {
  it('returns 8 providers', () => {
    expect(supportedProviders().length).toBe(8);
  });
});
