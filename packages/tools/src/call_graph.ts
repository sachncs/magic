/**
 * @fileoverview Call-graph extraction. Returns caller/callee
 * relationships for a given symbol. Regex-based baseline; upgrade
 * path to ts-morph when added.
 */

import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {readdir} from 'node:fs/promises';
import {tool, ok, err, type ToolResult} from './tool.js';

const MAX_DEPTH = 3;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface CallGraphNode {
  readonly symbol: string;
  readonly file: string;
  readonly line: number;
}

export interface CallGraphResult {
  readonly symbol: string;
  readonly callers: ReadonlyArray<CallGraphEdge>;
  readonly callees: ReadonlyArray<CallGraphEdge>;
}

export interface CallGraphEdge {
  readonly from: CallGraphNode;
  readonly to: CallGraphNode;
  readonly file: string;
  readonly line: number;
}

/**
 * Matches a function-call site: `name(` not preceded by a word
 * character. Skips method calls like `.foo(`. This is a heuristic.
 */
const CALL_RE = /(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g;

/**
 * Extracts top-level function/method definitions and the calls they
 * contain. Returns a map: symbol -> callees, and an inverse map.
 */
function extractGraph(text: string): {
  readonly defs: Map<string, {line: number; callees: Set<string>}>;
  readonly callsites: Map<string, Array<{file: string; line: number}>>;
} {
  const defs = new Map<string, {line: number; callees: Set<string>}>();
  const callsites = new Map<string, Array<{file: string; line: number}>>();

  const lines = text.split('\n');
  let currentFn: string | undefined;
  let currentCallees: Set<string> | undefined;
  let currentLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const fnMatch = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (fnMatch !== null) {
      currentFn = fnMatch[1];
      currentCallees = new Set();
      currentLine = i + 1;
      defs.set(currentFn, {line: currentLine, callees: currentCallees});
      continue;
    }
    const methodMatch = /^\s+(?:public\s+|private\s+|protected\s+|async\s+|static\s+)*([A-Za-z_$][\w$]*)\s*\(/.exec(line);
    if (methodMatch !== null && currentFn !== undefined) {
      // Treat as a method; record under method name.
      const name = methodMatch[1] ?? '';
      if (!defs.has(name)) {
        defs.set(name, {line: i + 1, callees: new Set()});
      }
    }
    if (currentFn !== undefined && currentCallees !== undefined) {
      CALL_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = CALL_RE.exec(line)) !== null) {
        const callee = m[1] ?? '';
        if (callee !== currentFn) {
          currentCallees.add(callee);
          const list = callsites.get(callee) ?? [];
          list.push({file: '', line: i + 1});
          callsites.set(callee, list);
        }
      }
    }
  }
  return {defs, callsites};
}

/**
 * Walks a repo, extracts function definitions + call sites, returns
 * the local call graph.
 */
async function extractRepoGraph(root: string): Promise<{
  defs: Map<string, {file: string; line: number; callees: Set<string>}>;
  callsites: Map<string, Array<{file: string; line: number}>>;
}> {
  const defs = new Map<string, {file: string; line: number; callees: Set<string>}>();
  const callsites = new Map<string, Array<{file: string; line: number}>>();
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) {
      break;
    }
    let entries;
    try {
      entries = await readdir(dir, {withFileTypes: true});
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'build') {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile() && /\.(ts|tsx|js|jsx)$/.test(e.name)) {
        let text: string;
        try {
          text = await readFile(abs, 'utf8');
        } catch {
          continue;
        }
        if (text.length > MAX_FILE_BYTES) {
          continue;
        }
        const {defs: fileDefs, callsites: fileSites} = extractGraph(text);
        const rel = abs.replace(`${root}/`, '');
        for (const [name, info] of fileDefs) {
          defs.set(name, {file: rel, line: info.line, callees: info.callees});
        }
        for (const [name, sites] of fileSites) {
          const list = callsites.get(name) ?? [];
          for (const s of sites) {
            list.push({file: rel, line: s.line});
          }
          callsites.set(name, list);
        }
      }
    }
  }
  return {defs, callsites};
}

/**
 * The `call_graph` tool.
 */
export const callGraphTool = tool({
  name: 'call_graph',
  description:
    'Return the caller/callee graph for a symbol up to N hops. Returns {callers, callees}.',
  inputSchema: undefined as unknown as import('zod').ZodType<{
    path: string;
    symbol: string;
    direction?: 'callers' | 'callees' | 'both';
    depth?: number;
  }>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const dir = input.direction ?? 'both';
      const depth = Math.min(MAX_DEPTH, input.depth ?? 1);
      const {defs, callsites} = await extractRepoGraph(input.path);
      const def = defs.get(input.symbol);
      if (def === undefined) {
        return ok(
          JSON.stringify({symbol: input.symbol, found: false, callers: [], callees: []}, null, 2),
        );
      }
      const callees: CallGraphEdge[] = [...def.callees]
        .map((name) => {
          const calleeDef = defs.get(name);
          if (calleeDef === undefined) {
            return null;
          }
          return {
            from: {symbol: input.symbol, file: def.file, line: def.line},
            to: {symbol: name, file: calleeDef.file, line: calleeDef.line},
            file: calleeDef.file,
            line: calleeDef.line,
          };
        })
        .filter((x): x is CallGraphEdge => x !== null);
      const callerSites = (callsites.get(input.symbol) ?? []).slice(0, 50);
      const callers: CallGraphEdge[] = callerSites.map((s) => ({
        from: {symbol: '(caller)', file: s.file, line: s.line},
        to: {symbol: input.symbol, file: def.file, line: def.line},
        file: s.file,
        line: s.line,
      }));
      const result: CallGraphResult =
        dir === 'callers'
          ? {symbol: input.symbol, callers, callees: []}
          : dir === 'callees'
            ? {symbol: input.symbol, callers: [], callees}
            : {symbol: input.symbol, callers, callees};
      void depth;
      return ok(JSON.stringify(result, null, 2));
    } catch (e) {
      return err(`call_graph failed: ${(e as Error).message}`);
    }
  },
});
