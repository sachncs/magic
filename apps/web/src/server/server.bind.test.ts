/**
 * @fileoverview Tests for the Fastify server's bind address helper.
 * Default is 127.0.0.1; opt-in to 0.0.0.0 only when
 * `MAGIC_BIND_ALL_INTERFACES=true`.
 */

import {describe, it, expect, afterEach} from 'vitest';
import {bindHost} from './server.js';

describe('bindHost', () => {
  const originalFlag = process.env['MAGIC_BIND_ALL_INTERFACES'];

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env['MAGIC_BIND_ALL_INTERFACES'];
    } else {
      process.env['MAGIC_BIND_ALL_INTERFACES'] = originalFlag;
    }
  });

  it('defaults to 127.0.0.1', () => {
    delete process.env['MAGIC_BIND_ALL_INTERFACES'];
    expect(bindHost()).toBe('127.0.0.1');
  });

  it('uses 0.0.0.0 only when MAGIC_BIND_ALL_INTERFACES=true', () => {
    process.env['MAGIC_BIND_ALL_INTERFACES'] = 'true';
    expect(bindHost()).toBe('0.0.0.0');
  });

  it('treats other values as 127.0.0.1', () => {
    process.env['MAGIC_BIND_ALL_INTERFACES'] = 'yes';
    expect(bindHost()).toBe('127.0.0.1');
    process.env['MAGIC_BIND_ALL_INTERFACES'] = '1';
    expect(bindHost()).toBe('127.0.0.1');
  });
});