/**
 * @fileoverview Tests for the secret scanner (subset of repo_security).
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

describe('secret scanning (via repo_security)', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-secret-'));
  });

  afterEach(async () => {
    await rm(work, {recursive: true, force: true});
  });

  it('detects an AWS access key', async () => {
    await writeFile(
      join(work, 'package.json'),
      JSON.stringify({name: 'x', scripts: {test: 'vitest'}}),
    );
    await writeFile(join(work, 'leaked.js'), 'const k = "AKIAIOSFODNN7EXAMPLE";\n');
    const {repoSecurityTool} = await import('./security.js');
    const result = await repoSecurityTool.callback({path: work});
    expect(result.status).toBe('success');
    const text = (result.content[0] as {text: string}).text;
    const parsed = JSON.parse(text) as {findings: Array<{title: string}>};
    const titles = parsed.findings.map((f) => f.title);
    expect(titles).toContain('AWS access key');
  });

  it('detects a GitHub PAT', async () => {
    await writeFile(
      join(work, 'package.json'),
      JSON.stringify({name: 'x', scripts: {test: 'vitest'}}),
    );
    await writeFile(join(work, 'a.js'), 'const t = "ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";\n');
    const {repoSecurityTool} = await import('./security.js');
    const result = await repoSecurityTool.callback({path: work});
    const parsed = JSON.parse((result.content[0] as {text: string}).text) as {
      findings: Array<{title: string}>;
    };
    expect(parsed.findings.map((f) => f.title)).toContain('GitHub PAT');
  });

  it('returns empty findings for a clean repo', async () => {
    await writeFile(
      join(work, 'package.json'),
      JSON.stringify({name: 'x', scripts: {test: 'vitest'}}),
    );
    await writeFile(join(work, 'clean.js'), 'export const x = 1;\n');
    const {repoSecurityTool} = await import('./security.js');
    const result = await repoSecurityTool.callback({path: work});
    const parsed = JSON.parse((result.content[0] as {text: string}).text) as {
      findings: Array<{kind: string}>;
    };
    const secrets = parsed.findings.filter((f) => f.kind === 'secret');
    expect(secrets.length).toBe(0);
  });
});
