# Style

magic follows the [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html) and the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) in full.

See [STYLE_GUIDE.md](../STYLE_GUIDE.md) for the project-level summary and the enforced rules. The cheat-sheet there is the source of truth; this document is a one-page reminder.

## Enforcement

`gts` (Google TypeScript Style) provides ESLint + Prettier configs. Install once, run on every PR.

```bash
npm run lint
npm run format
```

CI runs `gts lint` on every PR. PRs with lint errors cannot merge.

## Most-violated rules (learn these)

- **No default exports** — always `export function foo()` not `export default foo`
- **`import type` for type-only imports** — `import type {Foo} from './foo'`
- **No `any`** — use `unknown` and narrow, or define a proper type
- **2-space indent, LF line endings, no trailing whitespace, final newline**
- **Single quotes for strings, template literals for interpolation**
- **Named functions, not const-arrow**: `function foo()` not `const foo = () =>`
- **`const` by default, never `var`**
- **One variable per declaration**
- **Always declare return types on exported functions**
- **`===`/`!==` only**
- **Trailing commas in multi-line array/object literals**
- **No namespaces; use ES modules**

## File naming

- `snake_case.ts` for non-component TS
- `PascalCase.tsx` for React components
- `kebab-case` for tooling files (Dockerfile, .github)
- `lowercase` for documentation (README, CONTRIBUTING)

## React component style

- Function components only; no class components except error boundaries
- Hooks at the top of the component; no conditional hooks
- Props destructured in the signature
- Use `cn()` from `@/lib/utils` for conditional class names
- Use shadcn primitives from `@/components/ui/*` rather than raw HTML elements
- Tailwind utility classes; no inline `style={}` except for dynamic values

## TypeScript style

- `strict: true` everywhere; `noUncheckedIndexedAccess: true`
- Prefer `readonly` on public surface types
- Use `zod` schemas at I/O boundaries
- Branded types for opaque IDs (`SessionId`, `WorkspaceId`, etc.)
- `as` casts are forbidden; if you need one, fix the type
- `any` is forbidden; use `unknown` and narrow
