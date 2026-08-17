/**
 * @fileoverview Renders oversized tool output into a preview + locator,
 * so the model's context window doesn't blow up. Full output is written
 * to `${spillDir}/<hash>.json`; the model sees the preview + a
 * `SpillLocator` it can pass back to `retrieveSpill()`.
 */

import {writeFile, readFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spillDir} from '@magic/storage/data_dir';
import {brand, unbrand, type SpillLocator} from '@magic/shared/branded';

const DEFAULT_THRESHOLD = 50 * 1024; // 50 KB
const PREVIEW_HEAD = 2 * 1024;
const PREVIEW_TAIL = 1 * 1024;

export interface SpilledRecord {
  readonly locator: SpillLocator;
  readonly byteSize: number;
  readonly preview: string;
}

/**
 * Hashes content to produce a stable locator.
 */
function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Spills content if it exceeds the threshold. Returns either the
 * original (when under threshold) or a `SpilledRecord` with preview.
 */
export async function maybeSpill(
  content: string,
  threshold: number = DEFAULT_THRESHOLD,
): Promise<{spilled: false; content: string} | {spilled: true; record: SpilledRecord}> {
  if (content.length <= threshold) {
    return {spilled: false, content};
  }
  await mkdir(spillDir(), {recursive: true});
  const hex = hash(content);
  const locator = brand<string, 'SpillLocator'>(hex);
  const path = `${spillDir()}/${hex}.json`;
  await writeFile(path, JSON.stringify({content}), {mode: 0o600});

  const head = content.slice(0, PREVIEW_HEAD);
  const tail = content.slice(-PREVIEW_TAIL);
  const preview = `${head}\n\n[… ${content.length - PREVIEW_HEAD - PREVIEW_TAIL} bytes spilled to ${hex} …]\n\n${tail}`;

  return {
    spilled: true,
    record: {
      locator,
      byteSize: content.length,
      preview,
    },
  };
}

/**
 * Retrieves a previously-spilled record by its locator.
 */
export async function retrieveSpill(locator: SpillLocator): Promise<string> {
  const path = `${spillDir()}/${unbrand(locator)}.json`;
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as {content: string};
  return parsed.content;
}

/**
 * Wraps a tool result's text content. If the text exceeds the
 * threshold, it's spilled and the text is replaced with the preview +
 * locator. Returns the (possibly modified) text and an optional
 * locator.
 */
export async function spillResult(
  text: string,
  threshold: number = DEFAULT_THRESHOLD,
): Promise<{text: string; locator?: SpillLocator}> {
  const result = await maybeSpill(text, threshold);
  if (!result.spilled) {
    return {text};
  }
  return {text: result.record.preview, locator: result.record.locator};
}
