/**
 * @fileoverview Tests for the credentials store. Covers set/get round-trip,
 * redaction, has/remove, and that getRedactedDescriptors never returns
 * the value.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

describe('credentials', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-credentials-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('set + has + get round-trip', async () => {
    const {setCredential, hasCredential, getCredential} = await import(
      './credentials.js'
    );
    await setCredential('ANTHROPIC_API_KEY', 'sk-test-123');
    expect(await hasCredential('ANTHROPIC_API_KEY')).toBe(true);
    expect(await getCredential('ANTHROPIC_API_KEY')).toBe('sk-test-123');
  });

  it('get returns undefined for unknown name', async () => {
    const {getCredential, hasCredential} = await import('./credentials.js');
    expect(await hasCredential('NEVER_SET')).toBe(false);
    expect(await getCredential('NEVER_SET')).toBeUndefined();
  });

  it('getRedactedDescriptors returns no values', async () => {
    const {setCredential, getRedactedDescriptors} = await import('./credentials.js');
    await setCredential('OPENAI_API_KEY', 'sk-secret-xyz');
    const descriptors = await getRedactedDescriptors();
    expect(descriptors.length).toBe(1);
    expect(descriptors[0]?.name).toBe('OPENAI_API_KEY');
    expect(descriptors[0]?.present).toBe(true);
    expect(descriptors[0]).not.toHaveProperty('value');
    // Plain text check: serialise and ensure 'sk-secret-xyz' does not leak.
    const json = JSON.stringify(descriptors);
    expect(json).not.toContain('sk-secret-xyz');
  });

  it('remove deletes a credential', async () => {
    const {setCredential, removeCredential, hasCredential} = await import(
      './credentials.js'
    );
    await setCredential('FOO', 'bar');
    expect(await hasCredential('FOO')).toBe(true);
    await removeCredential('FOO');
    expect(await hasCredential('FOO')).toBe(false);
  });

  it('remove is a no-op for unknown', async () => {
    const {removeCredential} = await import('./credentials.js');
    await expect(removeCredential('NEVER')).resolves.toBeUndefined();
  });

  it('encrypts at rest (ciphertext does not contain plaintext)', async () => {
    const {setCredential} = await import('./credentials.js');
    const {readFile} = await import('node:fs/promises');
    await setCredential('PLAINTEXT_TEST', 'this-should-not-appear-in-disk');
    const file = await readFile(`${workDir}/credentials.json`, 'utf8');
    expect(file).not.toContain('this-should-not-appear-in-disk');
  });
});
