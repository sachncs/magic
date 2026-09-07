/**
 * @fileoverview Tests for pricing utilities. Covers lookup and compute.
 */

import {describe, it, expect} from 'vitest';
import {getPricing, computeCostUsd, PRICING} from './pricing.js';

describe('getPricing', () => {
  it('returns known pricing for a documented model', () => {
    const p = getPricing('bedrock', 'global.anthropic.claude-sonnet-4-6');
    expect(p).toEqual({input: 3, output: 15});
  });

  it('returns undefined for unknown model', () => {
    expect(getPricing('bedrock', 'unknown-model')).toBeUndefined();
  });

  it('returns undefined for unknown provider', () => {
    expect(getPricing('openai', 'gpt-4o')).toBeDefined(); // sanity
    expect(getPricing('fake' as 'openai', 'gpt-4o')).toBeUndefined();
  });
});

describe('computeCostUsd', () => {
  it('computes basic input + output cost', () => {
    const cost = computeCostUsd({input: 3, output: 15}, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18, 6);
  });

  it('applies cached input price when provided', () => {
    const cost = computeCostUsd(
      {input: 3, output: 15, cachedInput: 0.3},
      1_000_000,
      0,
      1_000_000,
    );
    expect(cost).toBeCloseTo(0.3, 6);
  });

  it('falls back to input price for cached tokens when no cached price', () => {
    const cost = computeCostUsd({input: 3, output: 15}, 2_000_000, 0, 1_000_000);
    // 1M uncached * 3 + 1M cached * 3 = 6
    expect(cost).toBeCloseTo(6, 6);
  });

  it('handles zero tokens', () => {
    expect(computeCostUsd({input: 3, output: 15}, 0, 0)).toBe(0);
  });
});

describe('PRICING table', () => {
  it('has entries for every documented provider', () => {
    for (const p of [
      'bedrock',
      'anthropic',
      'openai',
      'google',
      'minimax',
      'ollama',
    ] as const) {
      expect(PRICING[p]).toBeDefined();
    }
  });
});
