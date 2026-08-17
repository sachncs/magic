/**
 * @fileoverview Pre-clone size guard. Refuses to clone (or attach to)
 * repos larger than `MAGIC_MAX_REPO_MB` (default 500 MB) to prevent
 * disk exhaustion. Warns (does not block) for paths between 80–100% of
 * the cap.
 */

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {stat} from 'node:fs/promises';
import {env} from 'node:process';
import {join} from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * Default maximum size in MB. Overridden by `MAGIC_MAX_REPO_MB`.
 */
const DEFAULT_MAX_MB = 500;

/**
 * Returns the configured cap in MB.
 */
export function getMaxRepoMb(): number {
  const raw = env.MAGIC_MAX_REPO_MB;
  if (raw === undefined) {
    return DEFAULT_MAX_MB;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_MB;
  }
  return parsed;
}

/**
 * Measures the on-disk size of a directory in bytes, using `du -sb` on
 * Unix and a recursive walk on other platforms.
 */
export async function measureDirBytes(path: string): Promise<number> {
  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    return measureDirBytesWalk(path);
  }
  try {
    const {stdout} = await execFileAsync('du', ['-sb', path]);
    const first = stdout.trim().split(/\s+/)[0];
    const bytes = Number.parseInt(first ?? '0', 10);
    if (Number.isNaN(bytes)) {
      return measureDirBytesWalk(path);
    }
    return bytes;
  } catch {
    return measureDirBytesWalk(path);
  }
}

async function measureDirBytesWalk(path: string): Promise<number> {
  const {readdir} = await import('node:fs/promises');
  const entries = await readdir(path, {withFileTypes: true});
  let total = 0;
  for (const entry of entries) {
    const p = join(path, entry.name);
    if (entry.isDirectory()) {
      total += await measureDirBytesWalk(p);
    } else if (entry.isFile()) {
      const s = await stat(p);
      total += s.size;
    }
  }
  return total;
}

/**
 * Format helper for error messages.
 */
function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Throws if `path` exceeds the configured cap. Logs a warning between
 * 80% and 100% of the cap.
 */
export async function repoSizeGuard(path: string): Promise<void> {
  const bytes = await measureDirBytes(path);
  const capBytes = getMaxRepoMb() * 1024 * 1024;
  if (bytes > capBytes) {
    throw new Error(
      `repo at ${path} is ${mb(bytes)}, exceeds cap of ${mb(capBytes)} ` +
        `(MAGIC_MAX_REPO_MB=${getMaxRepoMb()})`,
    );
  }
  if (bytes > capBytes * 0.8) {
    // Warning band: >80% of cap.
    // eslint-disable-next-line no-console
    console.warn(
      `[magic] repo at ${path} is ${mb(bytes)}, approaching cap of ${mb(capBytes)}`,
    );
  }
}
