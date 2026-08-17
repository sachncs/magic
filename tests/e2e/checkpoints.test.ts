/**
 * @fileworkspace Checkpoint round-trip. `gate` waits; the
 * `resolveCheckpoint` call from the WS handler unblocks it.
 */

import {describe, it, expect} from 'vitest';
import {gate, resolveCheckpoint, listPending} from '@magic/agent-graph/checkpoints';
import {newSessionId} from '@magic/shared/branded';

describe('e2e: checkpoints', () => {
  it('approve unblocks the gate', async () => {
    const id = newSessionId();
    const events: unknown[] = [];
    const promise = gate(id, 'plan', {steps: ['a']}, (e) => {
      events.push(e);
    });
    expect(events.length).toBe(1);
    const e = events[0] as {checkpointId: string};
    expect(listPending().length).toBe(1);
    expect(resolveCheckpoint(e.checkpointId, true)).toBe(true);
    const r = await promise;
    expect(r.approved).toBe(true);
    expect(listPending().length).toBe(0);
  });

  it('reject with reason', async () => {
    const id = newSessionId();
    const events: unknown[] = [];
    const promise = gate(id, 'destructive', {op: 'rm -rf /'}, (e) => {
      events.push(e);
    });
    const e = events[0] as {checkpointId: string};
    resolveCheckpoint(e.checkpointId, false, 'too dangerous');
    const r = await promise;
    expect(r.approved).toBe(false);
    expect(r.reason).toBe('too dangerous');
  });

  it('unknown checkpoint id resolves to false', () => {
    expect(resolveCheckpoint('not-a-real-id', true)).toBe(false);
  });
});
