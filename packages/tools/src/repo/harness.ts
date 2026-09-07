/**
 * @fileoverview Detects build/test/lint/format commands by inspecting
 * common manifest files in priority order: package.json, Makefile,
 * pyproject.toml, Cargo.toml, go.mod.
 */

import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {HarnessCommands, HarnessSource} from '@magic/shared/types/repo';

/**
 * Attempts to detect the harness. Returns a default-`unknown` shape when
 * no manifest is found.
 */
export async function detectHarness(root: string): Promise<HarnessCommands> {
  // Priority order.
  const fromPackage = await detectFromPackageJson(root);
  if (fromPackage !== null) {
    return fromPackage;
  }
  const fromMake = await detectFromMakefile(root);
  if (fromMake !== null) {
    return fromMake;
  }
  const fromPy = await detectFromPyproject(root);
  if (fromPy !== null) {
    return fromPy;
  }
  const fromCargo = await detectFromCargo(root);
  if (fromCargo !== null) {
    return fromCargo;
  }
  const fromGo = await detectFromGoMod(root);
  if (fromGo !== null) {
    return fromGo;
  }
  return {packageManager: 'unknown', detectedFrom: 'unknown'};
}

async function detectFromPackageJson(root: string): Promise<HarnessCommands | null> {
  let text: string;
  try {
    text = await readFile(join(root, 'package.json'), 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const pm = typeof obj['packageManager'] === 'string'
    ? obj['packageManager'].split('@')[0] ?? 'npm'
    : (await hasPnpmLock(root)) ? 'pnpm' : (await hasYarnLock(root)) ? 'yarn' : 'npm';
  const scripts = (obj['scripts'] as Record<string, string> | undefined) ?? {};
  return {
    packageManager: pm,
    build: scripts['build'],
    test: scripts['test'],
    lint: scripts['lint'],
    format: scripts['format'],
    detectedFrom: 'package.json',
  };
}

async function hasPnpmLock(root: string): Promise<boolean> {
  try {
    await readFile(join(root, 'pnpm-lock.yaml'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function hasYarnLock(root: string): Promise<boolean> {
  try {
    await readFile(join(root, 'yarn.lock'), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function detectFromMakefile(root: string): Promise<HarnessCommands | null> {
  let text: string;
  try {
    text = await readFile(join(root, 'Makefile'), 'utf8');
  } catch {
    return null;
  }
  const has = (target: string): string | undefined =>
    new RegExp(`^${target}\\s*:`, 'm').test(text) ? `make ${target}` : undefined;
  return {
    packageManager: 'make',
    build: has('build'),
    test: has('test'),
    lint: has('lint'),
    format: has('format'),
    detectedFrom: 'Makefile',
  };
}

async function detectFromPyproject(root: string): Promise<HarnessCommands | null> {
  let text: string;
  try {
    text = await readFile(join(root, 'pyproject.toml'), 'utf8');
  } catch {
    return null;
  }
  const pm = text.includes('[tool.poetry]') ? 'poetry' : 'pip';
  return {
    packageManager: pm,
    test: text.includes('[tool.pytest') ? 'pytest' : undefined,
    lint: text.includes('[tool.ruff') ? 'ruff check' : undefined,
    format: text.includes('[tool.black') ? 'black .' : undefined,
    detectedFrom: 'pyproject.toml',
  };
}

async function detectFromCargo(root: string): Promise<HarnessCommands | null> {
  try {
    await readFile(join(root, 'Cargo.toml'), 'utf8');
  } catch {
    return null;
  }
  return {
    packageManager: 'cargo',
    build: 'cargo build',
    test: 'cargo test',
    lint: 'cargo clippy',
    format: 'cargo fmt',
    detectedFrom: 'Cargo.toml',
  };
}

async function detectFromGoMod(root: string): Promise<HarnessCommands | null> {
  try {
    await readFile(join(root, 'go.mod'), 'utf8');
  } catch {
    return null;
  }
  return {
    packageManager: 'go',
    build: 'go build ./...',
    test: 'go test ./...',
    lint: 'go vet ./...',
    format: 'gofmt -w .',
    detectedFrom: 'go.mod',
  };
}

/**
 * Re-exported for tests.
 */
export const _sourceOrder: HarnessSource[] = [
  'package.json',
  'Makefile',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
];
