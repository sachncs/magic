/**
 * @fileoverview Tests for the capability check. Covers pass/fail
 * detection and the assertCanUseModel gate.
 */

import {describe, it, expect} from 'vitest';
import {checkCapabilities, assertCanUseModel, type ProbedModel} from './capability_check.js';

const okModel: ProbedModel = {
  providerId: 'bedrock',
  probe: async () => ({content: '{"ok":true}'}),
};

const badModel: ProbedModel = {
  providerId: 'ollama',
  probe: async () => ({content: 'no json here'}),
};

const throwingModel: ProbedModel = {
  providerId: 'ollama',
  probe: async () => {
    throw new Error('network down');
  },
};

describe('checkCapabilities', () => {
  it('detects tool-use from a JSON response', async () => {
    const c = await checkCapabilities(okModel);
    expect(c.toolUse).toBe(true);
    expect(c.streaming).toBe(true);
  });

  it('reports no tool-use for non-JSON response', async () => {
    const c = await checkCapabilities(badModel);
    expect(c.toolUse).toBe(false);
  });

  it('reports all false on probe failure', async () => {
    const c = await checkCapabilities(throwingModel);
    expect(c.toolUse).toBe(false);
    expect(c.streaming).toBe(false);
  });
});

describe('assertCanUseModel', () => {
  it('passes for capable model', async () => {
    await expect(assertCanUseModel(okModel)).resolves.toBeUndefined();
  });

  it('throws for non-tool-use model', async () => {
    await expect(assertCanUseModel(badModel)).rejects.toThrow(/tool-use/);
  });

  it('throws for throwing model', async () => {
    await expect(assertCanUseModel(throwingModel)).rejects.toThrow(/tool-use/);
  });
});
