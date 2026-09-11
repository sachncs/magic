/**
 * @fileoverview Typed fetch wrapper for the Fastify REST API.
 */

import {useSessionTokenStore} from '@/stores/session';

const BASE = '';

/**
 * Builds a URL with query parameters.
 */
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = `${BASE}${path}`;
  if (params === undefined) {
    return url;
  }
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return qs.length > 0 ? `${url}?${qs}` : url;
}

/**
 * Reads the bearer token from the session-token store. The store is
 * populated from the \`POST /api/sessions\` response (or the
 * user-supplied Settings → General API token).
 */
function bearer(): string | undefined {
  return useSessionTokenStore.getState().apiToken ?? undefined;
}

/**
 * Performs a typed JSON fetch. Throws on non-2xx with the response
 * body included.
 */
export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts?: {
    body?: unknown;
    params?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
  },
): Promise<T> {
  const headers: Record<string, string> = {'content-type': 'application/json'};
  const tok = bearer();
  if (tok !== undefined) {
    headers['authorization'] = `Bearer ${tok}`;
  }
  const r = await fetch(buildUrl(path, opts?.params), {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts?.signal,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${method} ${path} ${r.status}: ${text}`);
  }
  if (r.status === 204) {
    return undefined as T;
  }
  return (await r.json()) as T;
}

/**
 * Convenience: GET with typed response.
 */
export function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  return api<T>('GET', path, {params});
}

/**
 * Convenience: POST with typed body + response.
 */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return api<T>('POST', path, {body});
}

/**
 * Convenience: DELETE.
 */
export function del<T>(path: string): Promise<T> {
  return api<T>('DELETE', path);
}
