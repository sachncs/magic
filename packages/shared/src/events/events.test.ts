/**
 * @fileoverview Tests for the WS event union. Verifies that each event
 * kind round-trips through its schema, and that the discriminated union
 * accepts every documented kind while rejecting malformed payloads.
 */

import {describe, it, expect} from 'vitest';
import {
  wsEventSchema,
  nodeStartEventSchema,
  nodeEndEventSchema,
  toolUseEventSchema,
  fileEditEventSchema,
  testResultEventSchema,
  messageEventSchema,
  doneEventSchema,
  errorEventSchema,
  spillEventSchema,
  checkpointEventSchema,
  costUpdateEventSchema,
  memoryHitEventSchema,
  titleUpdateEventSchema,
} from './index.js';

const ts = 1700000000000;

describe('individual event schemas', () => {
  it('nodeStart', () => {
    const e = {version: 1, ts, type: 'nodeStart', nodeId: 'indexer'};
    expect(nodeStartEventSchema.parse(e)).toEqual(e);
  });

  it('nodeEnd', () => {
    const e = {
      version: 1,
      ts,
      type: 'nodeEnd',
      nodeId: 'indexer',
      status: 'ok',
      durationMs: 1234,
    };
    expect(nodeEndEventSchema.parse(e)).toEqual(e);
  });

  it('toolUse', () => {
    const e = {
      version: 1,
      ts,
      type: 'toolUse',
      toolName: 'repo_search',
      toolCallId: 'tc-1',
      args: {query: 'foo'},
      presentCall: {kind: 'search', preview: 'foo', isCall: true},
    };
    expect(toolUseEventSchema.parse(e)).toEqual(e);
  });

  it('fileEdit', () => {
    const e = {
      version: 1,
      ts,
      type: 'fileEdit',
      path: 'src/index.ts',
      toolCallId: 'tc-1',
      hunk: '@@ -1 +1 @@\n-old\n+new',
    };
    expect(fileEditEventSchema.parse(e)).toEqual(e);
  });

  it('testResult', () => {
    const e = {
      version: 1,
      ts,
      type: 'testResult',
      passed: 10,
      failed: 1,
      durationMs: 5000,
    };
    expect(testResultEventSchema.parse(e)).toEqual(e);
  });

  it('message', () => {
    const e = {
      version: 1,
      ts,
      type: 'message',
      role: 'assistant',
      content: 'Hello',
      messageId: 'm-1',
    };
    expect(messageEventSchema.parse(e)).toEqual(e);
  });

  it('done', () => {
    const e = {
      version: 1,
      ts,
      type: 'done',
      stopReason: 'end_turn',
    };
    expect(doneEventSchema.parse(e)).toEqual(e);
  });

  it('error', () => {
    const e = {
      version: 1,
      ts,
      type: 'error',
      message: 'boom',
      recoverable: false,
    };
    expect(errorEventSchema.parse(e)).toEqual(e);
  });

  it('spill', () => {
    const e = {
      version: 1,
      ts,
      type: 'spill',
      toolCallId: 'tc-1',
      locator: 'hash-abc',
      byteSize: 102400,
      preview: 'first 2KB...',
    };
    expect(spillEventSchema.parse(e)).toEqual(e);
  });

  it('checkpoint', () => {
    const e = {
      version: 1,
      ts,
      type: 'checkpoint',
      kind: 'plan',
      checkpointId: 'cp-1',
      payload: {steps: ['a', 'b']},
    };
    expect(checkpointEventSchema.parse(e)).toEqual(e);
  });

  it('costUpdate', () => {
    const e = {
      version: 1,
      ts,
      type: 'costUpdate',
      sessionCostUsd: 0.42,
      capUsd: 5.0,
    };
    expect(costUpdateEventSchema.parse(e)).toEqual(e);
  });

  it('memoryHit', () => {
    const e = {
      version: 1,
      ts,
      type: 'memoryHit',
      entries: [
        {
          id: 'kb-1',
          kind: 'convention',
          key: 'naming',
          value: 'camelCase',
          confidence: 0.95,
        },
      ],
    };
    expect(memoryHitEventSchema.parse(e)).toEqual(e);
  });

  it('titleUpdate', () => {
    const e = {
      version: 1,
      ts,
      type: 'titleUpdate',
      title: 'Add health endpoint',
    };
    expect(titleUpdateEventSchema.parse(e)).toEqual(e);
  });
});

describe('wsEventSchema (discriminated union)', () => {
  it('accepts every documented kind', () => {
    const events = [
      {version: 1, ts, type: 'nodeStart', nodeId: 'x'},
      {version: 1, ts, type: 'nodeEnd', nodeId: 'x', status: 'ok', durationMs: 1},
      {version: 1, ts, type: 'message', role: 'user', content: 'hi', messageId: 'm'},
      {version: 1, ts, type: 'done', stopReason: 'end_turn'},
    ];
    for (const e of events) {
      expect(wsEventSchema.parse(e).type).toBe(e.type);
    }
  });

  it('rejects unknown event type', () => {
    const e = {version: 1, ts, type: 'somethingNew'};
    expect(() => wsEventSchema.parse(e)).toThrow();
  });

  it('rejects wrong payload for known type', () => {
    const e = {version: 1, ts, type: 'nodeStart'}; // missing nodeId
    expect(() => wsEventSchema.parse(e)).toThrow();
  });

  it('rejects wrong version', () => {
    const e = {version: 2, ts, type: 'message', role: 'user', content: 'x', messageId: 'm'};
    expect(() => wsEventSchema.parse(e)).toThrow();
  });
});
