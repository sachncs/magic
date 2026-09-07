/**
 * @fileoverview Network egress guard. When `MAGIC_NETWORK_MODE=localhost-only`,
 * only URLs pointing to localhost / 127.0.0.1 / ::1 are allowed. Used by
 * `httpRequest`, the MCP docs client, and the repo security scanner's
 * external calls.
 */

import {env} from 'node:process';

/**
 * Resolves the current network mode.
 */
export function networkMode(): 'open' | 'localhost-only' {
  return env.MAGIC_NETWORK_MODE === 'localhost-only' ? 'localhost-only' : 'open';
}

/**
 * Returns true if the given URL is allowed under the current mode.
 */
export function isUrlAllowed(url: string): boolean {
  const mode = networkMode();
  if (mode === 'open') {
    return true;
  }
  return isLocalhostUrl(url);
}

/**
 * Returns true if the URL points to localhost. Supports http, https, and
 * ssh (git) URLs. Anything malformed or non-localhost returns false.
 */
export function isLocalhostUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // git-style URL: user@host:path
    const m = /^[a-zA-Z0-9_.-]+@([^:]+):/.exec(url);
    if (m === null) {
      return false;
    }
    return isLocalhostHost(m[1] ?? '');
  }
  return isLocalhostHost(parsed.hostname);
}

/**
 * Returns true if the host is localhost.
 */
function isLocalhostHost(host: string): boolean {
  const lower = host.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '0:0:0:0:0:0:0:1' ||
    lower === '[::1]' ||
    lower === '0.0.0.0'
  );
}

/**
 * Throws if the URL is not allowed under the current mode.
 */
export function assertUrlAllowed(url: string): void {
  if (!isUrlAllowed(url)) {
    throw new Error(
      `network mode '${networkMode()}' forbids URL ${url}; ` +
        `set MAGIC_NETWORK_MODE=open to allow non-localhost egress`,
    );
  }
}
