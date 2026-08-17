/**
 * @fileoverview Tests for prompts module. Verifies every agent has a
 * non-empty prompt and a version constant.
 */

import {describe, it, expect} from 'vitest';
import {
  PROMPTVersion,
  INDEXER_PROMPT,
  HARNESS_DETECTOR_PROMPT,
  PLANNER_PROMPT,
  SECURITY_AUDITOR_PROMPT,
  ROUTER_PROMPT,
  REPORTER_PROMPT,
  VERIFIER_PROMPT,
  GIT_OPERATOR_PROMPT,
  CONVENTION_LEARNER_PROMPT,
} from './index.js';

const PROMPTS: Array<[string, string]> = [
  ['indexer', INDEXER_PROMPT],
  ['harness-detector', HARNESS_DETECTOR_PROMPT],
  ['planner', PLANNER_PROMPT],
  ['security-auditor', SECURITY_AUDITOR_PROMPT],
  ['router', ROUTER_PROMPT],
  ['reporter', REPORTER_PROMPT],
  ['verifier', VERIFIER_PROMPT],
  ['git-operator', GIT_OPERATOR_PROMPT],
  ['convention-learner', CONVENTION_LEARNER_PROMPT],
];

describe('prompts', () => {
  it('PROMPTVersion is v1', () => {
    expect(PROMPTVersion).toBe('v1');
  });

  it.each(PROMPTS)('%s prompt is non-empty and has at least 80 chars', (_name, prompt) => {
    expect(prompt.length).toBeGreaterThan(80);
  });
});
