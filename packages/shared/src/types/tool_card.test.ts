/**
 * @fileoverview Tests for tool card types. Covers enum round-trip and
 * that view shapes are well-formed.
 */

import {describe, it, expect} from 'vitest';
import {toolCardKindSchema, TOOL_CARD_KINDS} from './tool_card.js';

describe('toolCardKindSchema', () => {
  it('accepts every documented kind', () => {
    for (const k of TOOL_CARD_KINDS) {
      expect(toolCardKindSchema.parse(k)).toBe(k);
    }
  });

  it('rejects unknown kinds', () => {
    expect(() => toolCardKindSchema.parse('chart')).toThrow();
  });

  it('is case-sensitive', () => {
    expect(() => toolCardKindSchema.parse('DIFF')).toThrow();
  });
});
