/**
 * @fileoverview Auto-generates a short session title from the task prompt
 * using a model. The first-prompt-LLM provider is used; on failure falls
 * back to the first 60 characters of the task.
 */

import type {SessionId} from '@magic/shared/branded';
import {writeMeta, readMeta} from './meta.js';

/**
 * Minimal model interface for title generation. Avoids depending on the
 * full Strands SDK in this module — a duck-typed subset is enough.
 */
export interface TitleModel {
  /**
   * Generates a short title for the given task. Implementations should
   * return a single-line string of 3–8 words.
   */
  generateTitle(task: string): Promise<string>;
}

/**
 * Fallback: use the first 60 characters of the task, trimmed.
 */
function fallbackTitle(task: string): string {
  const trimmed = task.trim();
  if (trimmed.length <= 60) {
    return trimmed;
  }
  // Break on the last whitespace before position 60 to avoid mid-word cuts.
  const slice = trimmed.slice(0, 60);
  const lastSpace = slice.lastIndexOf(' ');
  return lastSpace > 20 ? `${slice.slice(0, lastSpace)}…` : `${slice}…`;
}

/**
 * Generates and persists a session title. On model failure, uses the
 * fallback and still persists (so the user always sees a title).
 */
export async function generateAndPersistTitle(
  sessionId: SessionId,
  task: string,
  model: TitleModel,
): Promise<string> {
  let title: string;
  try {
    title = await model.generateTitle(task);
    if (typeof title !== 'string' || title.length === 0) {
      title = fallbackTitle(task);
    } else if (title.length > 80) {
      // Defensive: never let a runaway model produce a 10KB title.
      title = title.slice(0, 77) + '…';
    }
  } catch {
    title = fallbackTitle(task);
  }

  const meta = await readMeta(sessionId);
  if (meta === null) {
    return title;
  }
  await writeMeta(sessionId, {...meta, title});
  return title;
}
