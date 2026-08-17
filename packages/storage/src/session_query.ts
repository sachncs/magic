/**
 * @fileoverview Cross-session search. Routes to SQLite FTS5 when the
 * SQLite backend is active; falls back to a linear scan across all
 * session JSONL files when on the JSONL backend.
 */

import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {SessionId} from '@magic/shared/branded';
import {sessionsDir} from './data_dir.js';
import {
  SqliteBackend,
  type PersistenceBackend,
  type PersistedRecord,
} from './persistence/index.js';

/**
 * A single search hit.
 */
export interface SearchHit {
  readonly sessionId: SessionId;
  readonly recordId: string;
  readonly snippet: string;
  readonly score: number;
}

/**
 * Routes to the most efficient backend available. Prefers SQLite (FTS5)
 * when the SQLite file exists; otherwise does a linear scan.
 */
export async function searchAllSessions(
  query: string,
  opts: {
    limit?: number;
    persistence?: PersistenceBackend;
    sqlite?: SqliteBackend;
  } = {},
): Promise<ReadonlyArray<SearchHit>> {
  const limit = opts.limit ?? 20;
  if (query.trim().length === 0) {
    return [];
  }
  if (opts.sqlite !== undefined) {
    return opts.sqlite.search(query, limit);
  }
  return linearSearch(query, limit);
}

/**
 * Linear search across all session JSONL files. Slow but correct; used
 * when SQLite is not available.
 */
async function linearSearch(
  query: string,
  limit: number,
): Promise<ReadonlyArray<SearchHit>> {
  const needle = query.toLowerCase();
  const hits: SearchHit[] = [];

  let entries: string[] = [];
  try {
    entries = await readdir(sessionsDir());
  } catch {
    return [];
  }

  for (const entry of entries) {
    const sessionId = entry as SessionId;
    const file = join(sessionsDir(), entry, 'records.jsonl');
    let raw: string;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of raw.split('\n')) {
      if (line.length === 0) {
        continue;
      }
      let rec: PersistedRecord;
      try {
        rec = JSON.parse(line) as PersistedRecord;
      } catch {
        continue;
      }
      const haystack = JSON.stringify(rec.payload).toLowerCase();
      if (haystack.includes(needle)) {
        const text = String(rec.payload);
        hits.push({
          sessionId,
          recordId: rec.id,
          snippet: makeSnippet(text, needle),
          score: -haystack.split(needle).length, // crude: more matches = lower (better) score
        });
      }
    }
  }

  hits.sort((a, b) => a.score - b.score);
  return hits.slice(0, limit);
}

/**
 * Builds a small context snippet around the first occurrence of `needle`.
 */
function makeSnippet(text: string, needle: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) {
    return text.slice(0, 80);
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + needle.length + 30);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
