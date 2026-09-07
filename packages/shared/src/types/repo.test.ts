/**
 * @fileoverview Tests for repo types. Covers zod round-trip on every
 * defined shape.
 */

import {describe, it, expect} from 'vitest';
import {
  repoManifestSchema,
  harnessCommandsSchema,
  monorepoInfoSchema,
  languageIdSchema,
  LANGUAGES,
} from './repo.js';

const validHarness = {
  packageManager: 'npm',
  build: 'npm run build',
  test: 'npm test',
  lint: 'npm run lint',
  format: 'npm run format',
  detectedFrom: 'package.json',
} as const;

const validManifest = {
  id: 'repo-123',
  rootPath: '/tmp/repo',
  indexedAt: '2026-08-17T16:00:00.000Z',
  manifestHash: 'abc123',
  files: [
    {path: 'src/index.ts', bytes: 1024, language: 'typescript' as const},
    {path: 'README.md', bytes: 256},
  ],
  languages: ['typescript' as const],
  dependencies: {lodash: '^4.17.0'},
  scripts: {test: 'vitest'},
  harness: validHarness,
} as const;

describe('languageIdSchema', () => {
  it('accepts every documented language', () => {
    for (const lang of LANGUAGES) {
      expect(languageIdSchema.parse(lang)).toBe(lang);
    }
  });

  it('rejects unknown language', () => {
    expect(() => languageIdSchema.parse('cobol')).toThrow();
  });
});

describe('harnessCommandsSchema', () => {
  it('round-trips a fully-populated harness', () => {
    const parsed = harnessCommandsSchema.parse(validHarness);
    expect(parsed).toEqual(validHarness);
  });

  it('accepts a minimal harness (only packageManager + detectedFrom)', () => {
    const minimal = {packageManager: 'go', detectedFrom: 'go.mod' as const};
    const parsed = harnessCommandsSchema.parse(minimal);
    expect(parsed.build).toBeUndefined();
    expect(parsed.test).toBeUndefined();
  });

  it('rejects missing required fields', () => {
    expect(() =>
      harnessCommandsSchema.parse({packageManager: 'npm'}),
    ).toThrow();
  });
});

describe('monorepoInfoSchema', () => {
  it('round-trips a pnpm workspace', () => {
    const ws = {
      type: 'pnpm' as const,
      packages: [
        {
          name: '@scope/pkg-a',
          path: 'packages/pkg-a',
          manifest: 'packages/pkg-a/package.json',
          dependencies: {react: '^18.0.0'},
        },
      ],
    };
    expect(monorepoInfoSchema.parse(ws)).toEqual(ws);
  });
});

describe('repoManifestSchema', () => {
  it('round-trips a full manifest', () => {
    const parsed = repoManifestSchema.parse(validManifest);
    expect(parsed).toEqual(validManifest);
  });

  it('round-trips with optional monorepo', () => {
    const withMonorepo = {
      ...validManifest,
      monorepo: {
        type: 'npm' as const,
        packages: [],
      },
    };
    const parsed = repoManifestSchema.parse(withMonorepo);
    expect(parsed.monorepo).toEqual(withMonorepo.monorepo);
  });

  it('rejects manifest with bad language in file entry', () => {
    const bad = {
      ...validManifest,
      files: [{path: 'x', bytes: 0, language: 'cobol'}],
    };
    expect(() => repoManifestSchema.parse(bad)).toThrow();
  });

  it('rejects manifest with wrong detectedFrom', () => {
    const bad = {
      ...validManifest,
      harness: {...validHarness, detectedFrom: 'something-else'},
    };
    expect(() => repoManifestSchema.parse(bad)).toThrow();
  });
});
