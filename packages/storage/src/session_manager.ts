/**
 * @fileoverview Session manager abstraction. The real Strands SDK
 * provides a `SessionManager` with `FileStorage`; this module wraps the
 * same interface around our local JSONL backend so the rest of the
 * codebase has a single seam to depend on. The Strands integration
 * (when added) will be a drop-in replacement behind the same interface.
 */

import {appendFile, readFile, mkdir, writeFile, access} from 'node:fs/promises';
import {join} from 'node:path';
import type {SessionId} from '@magic/shared/branded';
import {sessionDir, ensureDataDir} from './data_dir.js';

/**
 * A single message in the session log.
 */
export interface SessionMessage {
  /** Branded message id. */
  readonly id: string;
  /** Role of the speaker. */
  readonly role: 'user' | 'assistant' | 'system' | 'tool';
  /** Plain text content. */
  readonly content: string;
  /** ISO timestamp. */
  readonly ts: string;
  /** Optional tool call id (for `tool` role). */
  readonly toolCallId?: string;
}

/**
 * Abstract session manager. The Strands SDK has a `SessionManager` with a
 * similar shape; this is the local stand-in.
 */
export interface SessionManager {
  /** Append a message to the session log. */
  append(message: SessionMessage): Promise<void>;
  /** Replay the entire message log in order. */
  replay(): Promise<ReadonlyArray<SessionMessage>>;
  /** Flush any buffered writes to disk. */
  flush(): Promise<void>;
}

/**
 * Path of the JSONL message log for a given session.
 */
function logPath(id: SessionId): string {
  return join(sessionDir(id), 'messages.jsonl');
}

/**
 * JSONL-backed session manager. One message per line. Append-only with a
 * periodic compaction to a fresh file on `flush()`.
 */
export class JsonlSessionManager implements SessionManager {
  private readonly id: SessionId;
  private buffer: SessionMessage[] = [];
  private bufferBytes = 0;
  private static readonly FLUSH_THRESHOLD = 64 * 1024;

  constructor(id: SessionId) {
    this.id = id;
  }

  async append(message: SessionMessage): Promise<void> {
    this.buffer.push(message);
    this.bufferBytes += JSON.stringify(message).length + 1;
    if (this.bufferBytes >= JsonlSessionManager.FLUSH_THRESHOLD) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    await ensureDataDir();
    await mkdir(sessionDir(this.id), {recursive: true});
    const lines =
      this.buffer.map((m) => JSON.stringify(m)).join('\n') + '\n';
    await appendFile(logPath(this.id), lines, 'utf8');
    this.buffer = [];
    this.bufferBytes = 0;
  }

  async replay(): Promise<ReadonlyArray<SessionMessage>> {
    await this.flush();
    try {
      await access(logPath(this.id));
    } catch {
      return [];
    }
    const raw = await readFile(logPath(this.id), 'utf8');
    const out: SessionMessage[] = [];
    for (const line of raw.split('\n')) {
      if (line.length === 0) {
        continue;
      }
      try {
        out.push(JSON.parse(line) as SessionMessage);
      } catch {
        // Skip malformed lines; they should not block replay.
        continue;
      }
    }
    return out;
  }
}

/**
 * Factory: create a SessionManager for the given id. The local JSONL
 * implementation is used today; the Strands SDK adapter can be swapped in
 * behind this same factory without changing call sites.
 */
export function createSessionManager(id: SessionId): SessionManager {
  return new JsonlSessionManager(id);
}

/**
 * Replaces a session's message log with a compacted copy (drops any
 * buffered writes and rewrites the file from the in-memory replay).
 * Used after large replays or migrations.
 */
export async function compactSessionLog(
  id: SessionId,
  messages: ReadonlyArray<SessionMessage>,
): Promise<void> {
  await ensureDataDir();
  await mkdir(sessionDir(id), {recursive: true});
  const content = messages.map((m) => JSON.stringify(m)).join('\n');
  await writeFile(logPath(id), content.length > 0 ? content + '\n' : '', 'utf8');
}
