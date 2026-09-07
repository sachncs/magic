/**
 * @fileoverview Tests for session types. Covers zod round-trip and
 * status helpers.
 */

import {describe, it, expect} from 'vitest';
import {
  sessionMetaSchema,
  sessionStatusSchema,
  allSessionStatuses,
  isTerminalStatus,
  SESSION_STATUSES,
} from './session.js';

const baseMeta = {
  id: 'sess-1',
  workspaceId: 'ws-1',
  repo: '/tmp/repo',
  task: 'add a health endpoint',
  status: 'pending' as const,
  createdAt: '2026-08-17T16:00:00.000Z',
  updatedAt: '2026-08-17T16:00:00.000Z',
  schemaVersion: 'v1',
  graphVersion: 'v1',
};

describe('sessionStatusSchema', () => {
  it('accepts every documented status', () => {
    for (const s of SESSION_STATUSES) {
      expect(sessionStatusSchema.parse(s)).toBe(s);
    }
  });

  it('rejects unknown status', () => {
    expect(() => sessionStatusSchema.parse('in-progress')).toThrow();
  });
});

describe('isTerminalStatus', () => {
  it('returns true for completed, failed, cancelled', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('returns false for pending, running, paused', () => {
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('running')).toBe(false);
    expect(isTerminalStatus('paused')).toBe(false);
  });
});

describe('allSessionStatuses', () => {
  it('returns all 6 statuses', () => {
    expect(allSessionStatuses().length).toBe(6);
  });
});

describe('sessionMetaSchema', () => {
  it('round-trips a minimal meta', () => {
    const parsed = sessionMetaSchema.parse(baseMeta);
    expect(parsed).toEqual(baseMeta);
  });

  it('round-trips with optional fields', () => {
    const full = {
      ...baseMeta,
      currentNode: 'indexer',
      manifestRef: 'manifests/abc.json',
      title: 'Add health endpoint',
      cost: {soFar: 0.12, cap: 5.0},
      providerChain: ['bedrock', 'openai'],
      queuedTasks: [
        {
          id: 't-1',
          prompt: 'next task',
          order: 0,
          queuedAt: '2026-08-17T16:01:00.000Z',
        },
      ],
      completedTasks: [
        {
          id: 't-0',
          prompt: 'first task',
          result: 'done',
          costUsd: 0.05,
          tokens: 1200,
          completedAt: '2026-08-17T16:00:30.000Z',
        },
      ],
    };
    const parsed = sessionMetaSchema.parse(full);
    expect(parsed).toEqual(full);
  });

  it('rejects bad status', () => {
    expect(() =>
      sessionMetaSchema.parse({...baseMeta, status: 'in-progress'}),
    ).toThrow();
  });

  it('rejects negative cost', () => {
    expect(() =>
      sessionMetaSchema.parse({...baseMeta, cost: {soFar: -1, cap: 0}}),
    ).toThrow();
  });
});
