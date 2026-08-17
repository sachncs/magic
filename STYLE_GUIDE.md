# Style Guide

magic follows the [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html) and the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) in full.

## Enforcement

We use [`gts`](https://github.com/google/gts) which provides ESLint + Prettier configurations matching the Google guides.

```bash
npm run lint      # check for issues
npm run format    # auto-fix what's safe
```

CI runs `npm run lint` on every PR. PRs with lint errors cannot merge.

## Key rules (cheat-sheet)

- 2-space indent, LF line endings, no trailing whitespace, final newline
- 80-column limit
- Semicolons required
- Single quotes for ordinary strings, template literals for interpolation/multi-line
- `const` by default, `let` only when reassigning, never `var`
- Named exports only — **no default exports anywhere**
- `import type { ... }` for type-only imports
- No `namespace`, no `require()`, no `import x = require(...)`
- `===`/`!==` only
- Function declarations for named functions; arrow functions for callbacks/nested
- JSDoc on all exported symbols
- No `#private` fields — use TS `private`
- `readonly` on never-reassigned members
- No `public` modifier (it's the default)
- No `export let` (mutable exports)
- File names: `snake_case.ts` for non-component TS; `PascalCase.tsx` for React components
- File order: `@fileoverview` JSDoc → imports → implementation, one blank line between sections

## Project-specific deviations

None for v1.

## How to write JSDoc

```typescript
/**
 * Brief description on one line.
 *
 * Longer description if needed, with full sentences.
 *
 * @param paramName - Description of the parameter.
 * @returns Description of the return value.
 * @throws Description of when this throws.
 */
export function example(paramName: string): string {
  return paramName;
}
```

## When in doubt

Open a PR. The CI linter will tell you. If a rule seems wrong for the codebase, raise it in a discussion — we'll either update the codebase or document a project-specific deviation here.
