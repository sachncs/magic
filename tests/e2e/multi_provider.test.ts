/**
 * @fileoverview Tests for the model factory detection chain. Asserts
 * every provider path resolves correctly.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {buildModel, ModelNotConfiguredError} from '@magic/agent-graph/model';

const PROVIDER_KEYS = [
  'MAGIC_MODEL_PROVIDER',
  'MAGIC_MODEL_BASE_URL',
  'MAGIC_MODEL_NAME',
  'MAGIC_MODEL_API_KEY',
  'AWS_BEARER_TOKEN_BEDROCK',
  'AWS_ACCESS_KEY_ID',
  'AWS_PROFILE',
  'AWS_REGION',
  'MAGIC_BEDROCK_MODEL_ID',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'MINIMAX_API_KEY',
  'MINIMAX_BASE_URL',
  'MINIMAX_MODEL',
];

describe('e2e: model factory', () => {
  const savedValues = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of PROVIDER_KEYS) {
      savedValues.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of savedValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    savedValues.clear();
  });

  it('local ollama', () => {
    process.env['MAGIC_MODEL_PROVIDER'] = 'ollama';
    process.env['MAGIC_MODEL_NAME'] = 'qwen2.5-coder:14b';
    const m = buildModel();
    expect(m.providerId).toBe('ollama');
  });

  it('bedrock with bearer', () => {
    process.env['AWS_BEARER_TOKEN_BEDROCK'] = 'tok';
    const m = buildModel();
    expect(m.providerId).toBe('bedrock');
    expect(m.apiKey).toBe('tok');
  });

  it('anthropic', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-...';
    const m = buildModel();
    expect(m.providerId).toBe('anthropic');
  });

  it('openai', () => {
    process.env['OPENAI_API_KEY'] = 'sk-...';
    const m = buildModel();
    expect(m.providerId).toBe('openai');
  });

  it('google', () => {
    process.env['GOOGLE_API_KEY'] = 'AI...';
    const m = buildModel();
    expect(m.providerId).toBe('google');
  });

  it('minimax requires all three envs', () => {
    process.env['MINIMAX_API_KEY'] = 'k';
    expect(() => {
      buildModel();
    }).toThrow(ModelNotConfiguredError);
  });

  it('minimax with all three', () => {
    process.env['MINIMAX_API_KEY'] = 'k';
    process.env['MINIMAX_BASE_URL'] = 'https://api.minimax/v1';
    process.env['MINIMAX_MODEL'] = 'MiniMax-M3';
    const m = buildModel();
    expect(m.providerId).toBe('minimax');
    expect(m.modelId).toBe('MiniMax-M3');
  });
});
