/**
 * @fileoverview Types describing a consumed repository: the manifest
 * emitted by the indexer, the harness commands detected, and the
 * monorepo information if applicable. All shapes are zod-validated at
 * I/O boundaries.
 */

import {z} from 'zod';

/**
 * Languages we recognise when indexing a repo. Anything else maps to
 * `'other'`. Used to pick AST tools and code-search strategies.
 */
export const LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'java',
  'kotlin',
  'swift',
  'ruby',
  'php',
  'csharp',
  'cpp',
  'c',
  'shell',
  'other',
] as const;

/**
 * Branded type for a language identifier. Compile-time safety only.
 */
export type LanguageId = (typeof LANGUAGES)[number];

/**
 * Zod schema for `LanguageId`. Used at I/O boundaries.
 */
export const languageIdSchema = z.enum(LANGUAGES);

/**
 * A manifest entry for a single file. Paths are repo-relative POSIX
 * (forward slashes) regardless of host OS.
 */
export interface RepoFileEntry {
  /** Repo-relative path (POSIX). */
  readonly path: string;
  /** File size in bytes. */
  readonly bytes: number;
  /** Detected language, or undefined if unrecognised. */
  readonly language?: LanguageId;
  /** sha256 of file contents, hex. Optional — only set when computed. */
  readonly sha256?: string;
}

/**
 * A package detected within a monorepo. Only present for monorepos.
 */
export interface MonorepoPackage {
  /** Package name (from manifest). */
  readonly name: string;
  /** Repo-relative path to the package root. */
  readonly path: string;
  /** Detected manifest path (e.g. `package.json`, `pyproject.toml`). */
  readonly manifest: string;
  /** Detected dependencies, key = name, value = version range. */
  readonly dependencies: Readonly<Record<string, string>>;
}

/**
 * Monorepo information. Only set when the indexer detects a workspace.
 */
export interface MonorepoInfo {
  /** Workspace tool: `'pnpm' | 'npm' | 'yarn' | 'turbo' | 'nx'`. */
  readonly type: 'pnpm' | 'npm' | 'yarn' | 'turbo' | 'nx';
  /** Detected packages within the workspace. */
  readonly packages: ReadonlyArray<MonorepoPackage>;
}

/**
 * Top-level manifest emitted by the repo indexer. Persisted as JSON.
 */
export interface RepoManifest {
  /** Branded repo id. */
  readonly id: string;
  /** Absolute path to the repo root on the local filesystem. */
  readonly rootPath: string;
  /** ISO timestamp of when this manifest was produced. */
  readonly indexedAt: string;
  /** SHA256 of the manifest itself (for dedupe / change detection). */
  readonly manifestHash: string;
  /** Per-file entries. */
  readonly files: ReadonlyArray<RepoFileEntry>;
  /** Languages present, deduplicated. */
  readonly languages: ReadonlyArray<LanguageId>;
  /** Top-level dependencies (root manifest). */
  readonly dependencies: Readonly<Record<string, string>>;
  /** Top-level scripts (e.g. npm scripts). */
  readonly scripts: Readonly<Record<string, string>>;
  /** Detected harness commands. */
  readonly harness: HarnessCommands;
  /** Monorepo information, if applicable. */
  readonly monorepo?: MonorepoInfo;
}

/**
 * The provenance of the harness detection. The indexer tries manifests in
 * order: `package.json` → `Makefile` → `pyproject.toml` → `Cargo.toml` →
 * `go.mod`. The first match wins.
 */
export type HarnessSource =
  | 'package.json'
  | 'Makefile'
  | 'pyproject.toml'
  | 'Cargo.toml'
  | 'go.mod'
  | 'unknown';

/**
 * Detected harness commands. Each field is optional — only what we
 * successfully detected is set. `packageManager` is always set when
 * detection succeeds.
 */
export interface HarnessCommands {
  /** Package manager (e.g. `npm`, `pnpm`, `yarn`, `cargo`, `go`, `pip`). */
  readonly packageManager: string;
  /** Build command (e.g. `npm run build`). */
  readonly build?: string;
  /** Test command (e.g. `npm test`). */
  readonly test?: string;
  /** Lint command (e.g. `npm run lint`). */
  readonly lint?: string;
  /** Format command (e.g. `npm run format`). */
  readonly format?: string;
  /** Source of the detection. `'unknown'` if nothing matched. */
  readonly detectedFrom: HarnessSource;
}

/**
 * Zod schema for `RepoFileEntry`. Validated at I/O boundaries.
 */
export const repoFileEntrySchema = z.object({
  path: z.string(),
  bytes: z.number().int().nonnegative(),
  language: languageIdSchema.optional(),
  sha256: z.string().optional(),
}) as z.ZodType<RepoFileEntry>;

/**
 * Zod schema for `MonorepoPackage`. Validated at I/O boundaries.
 */
export const monorepoPackageSchema = z.object({
  name: z.string(),
  path: z.string(),
  manifest: z.string(),
  dependencies: z.record(z.string(), z.string()),
}) as z.ZodType<MonorepoPackage>;

/**
 * Zod schema for `MonorepoInfo`. Validated at I/O boundaries.
 */
export const monorepoInfoSchema = z.object({
  type: z.enum(['pnpm', 'npm', 'yarn', 'turbo', 'nx']),
  packages: z.array(monorepoPackageSchema),
}) as z.ZodType<MonorepoInfo>;

/**
 * Zod schema for `HarnessCommands`. Validated at I/O boundaries.
 */
export const harnessCommandsSchema = z.object({
  packageManager: z.string(),
  build: z.string().optional(),
  test: z.string().optional(),
  lint: z.string().optional(),
  format: z.string().optional(),
  detectedFrom: z.enum([
    'package.json',
    'Makefile',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'unknown',
  ]),
}) as z.ZodType<HarnessCommands>;

/**
 * Zod schema for `RepoManifest`. Validated at I/O boundaries.
 */
export const repoManifestSchema = z.object({
  id: z.string(),
  rootPath: z.string(),
  indexedAt: z.string(),
  manifestHash: z.string(),
  files: z.array(repoFileEntrySchema),
  languages: z.array(languageIdSchema),
  dependencies: z.record(z.string(), z.string()),
  scripts: z.record(z.string(), z.string()),
  harness: harnessCommandsSchema,
  monorepo: monorepoInfoSchema.optional(),
}) as z.ZodType<RepoManifest>;
