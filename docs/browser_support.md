# Browser support

magic is a web app. This document lists which browsers and runtimes we support and test against.

## Supported browsers

| Browser | Minimum version | Notes |
|---|---|---|
| Chrome | last 2 stable | Primary target |
| Firefox | last 2 stable | Primary target |
| Safari (macOS) | last 2 stable | Primary target |
| Edge (Chromium) | last 2 stable | Inherits Chrome support |
| Safari (iOS) | last 2 stable | Mobile-responsive; no installable PWA in v1 |
| Chrome (Android) | last 2 stable | Mobile-responsive; no installable PWA in v1 |

## Runtime requirements

| Runtime | Minimum version | Notes |
|---|---|---|
| Node.js | 20.x | Server-side; pinned via `.nvmrc` |
| npm | 10.x | Ships with Node 20 |

## Not supported

- **Internet Explorer** (any version). React 19 does not support it.
- **Legacy mobile browsers** (Android < 9, iOS < 15). UI uses modern CSS (`gap`, `:has()`, container queries) and JavaScript (top-level await, optional chaining).
- **Browsers without ES2022 support**. The bundled output assumes native `class` fields, private methods, and `Object.hasOwn`.

## Why we don't go lower

- React 19's automatic batching and concurrent features assume modern engines
- shadcn/ui + Radix primitives use modern DOM APIs
- TanStack Router / Query depend on `fetch`, `AbortController`, and structured cloning
- Better-sqlite3 (server) targets Node 20+ specifically

## Testing

- Playwright runs against the latest 2 versions of Chrome, Firefox, and WebKit (Safari) on every CI run
- axe-core scans the running app in Chromium on every CI run
- Mobile viewport testing via Playwright's `iPhone 14` and `Pixel 7` device descriptors

## Reporting a browser bug

Open an issue with:
- Browser + version (`navigator.userAgent`)
- OS + version
- Steps to reproduce
- Expected vs actual behaviour

We may add support for older browsers if there's a real user need, but it is not on the v1 roadmap.
