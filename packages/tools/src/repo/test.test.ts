/**
 * @fileoverview Tests for the test output parser.
 */

import {describe, it, expect} from 'vitest';
import {parseTestCounts} from './test.js';

describe('parseTestCounts', () => {
  it('parses vitest output', () => {
    const r = parseTestCounts('Tests  3 passed (3)', '');
    expect(r.passed).toBe(3);
    expect(r.failed).toBe(0);
  });

  it('parses vitest with failures', () => {
    const r = parseTestCounts('Tests  1 failed | 2 passed (3)', '');
    expect(r.passed).toBe(2);
    expect(r.failed).toBe(1);
  });

  it('parses jest output', () => {
    const r = parseTestCounts('Tests:  1 failed, 2 passed, 3 total', '');
    expect(r.passed).toBe(2);
    expect(r.failed).toBe(1);
  });

  it('parses cargo output', () => {
    const r = parseTestCounts('test result: ok. 3 passed; 0 failed', '');
    expect(r.passed).toBe(3);
    expect(r.failed).toBe(0);
  });

  it('parses go ok/FAIL lines', () => {
    const r = parseTestCounts('ok  github.com/x/y\nFAIL github.com/x/z\n', '');
    expect(r.passed).toBe(1);
    expect(r.failed).toBe(1);
  });

  it('returns 0/0 for unparseable output', () => {
    const r = parseTestCounts('nothing parseable here', '');
    expect(r.passed).toBe(0);
    expect(r.failed).toBe(0);
  });
});
