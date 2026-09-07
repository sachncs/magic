/**
 * @fileoverview Cost cap behaviour. Recording usage above the session
 * cap throws.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {recordUsage, setSessionCap, checkCap, CostExceededError, __resetCostTrackerForTests} from '@magic/agent-graph/cost_tracker';
import {newSessionId} from '@magic/shared/branded';

describe('e2e: cost cap', () => {
  beforeEach(async () => {
    process.env['MAGIC_DATA_DIR'] = await mkdtemp(join(tmpdir(), 'magic-costcap-'));
    __resetCostTrackerForTests();
  });

  afterEach(async () => {
    const dir = process.env['MAGIC_DATA_DIR'];
    delete process.env['MAGIC_DATA_DIR'];
    if (dir !== undefined) {
      await rm(dir, {recursive: true, force: true});
    }
  });

  it('throws CostExceededError above the cap', () => {
    const id = newSessionId();
    setSessionCap(id, 0.001);
    recordUsage(id, 'bedrock', 'global.anthropic.claude-sonnet-4-6', 1_000_000, 0);
    expect(() => checkCap(id)).toThrow(CostExceededError);
  });

  it('does not throw below the cap', () => {
    const id = newSessionId();
    setSessionCap(id, 1_000);
    recordUsage(id, 'bedrock', 'global.anthropic.claude-sonnet-4-6', 100, 100);
    expect(() => checkCap(id)).not.toThrow();
  });
});
