# Keyboard shortcuts

magic is keyboard-first. Every action has a shortcut; the UI
exposes them in tooltips.

## Global

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open commands palette |
| `⌘/` / `Ctrl+/` | Toggle trajectory view |
| `⌘.` / `Ctrl+.` | Cancel current session |
| `Esc` | Close any modal/palette |

## Sessions page

| Shortcut | Action |
|---|---|
| `Enter` | Send composer message |
| `Shift+Enter` | Newline in composer |
| `/` (empty composer) | Open commands palette |
| `⌘Z` / `Ctrl+Z` | Undo last file edit (per session) |
| `⌘⇧P` / `Ctrl+Shift+P` | Open PR preview |
| `⌘⇧N` / `Ctrl+Shift+N` | New session |

## Settings

| Shortcut | Action |
|---|---|
| `⌘S` / `Ctrl+S` | Save current settings form |
| `Esc` | Close settings drawer |

## Commands palette (`⌘K`)

Type any of the following slash commands:

- `/plan <spec>` — generate a plan for the given spec
- `/commit <message>` — commit current changes with the given message
- `/restore <sessionId>` — restore an old session
- `/cancel [reason]` — cancel the current session
- `/search <query>` — search across all sessions

## Trajectory view (`⌘/`)

A power-user view of the session's event log. Hover over a turn row
to see TTFT / decoding time / duration / tokens. Use the zoom/pan
slider to focus on a specific interval.

## Notes

- macOS uses `⌘` (Command); Windows / Linux use `Ctrl`
- Shortcuts are suppressed while focus is in a textarea or
  contenteditable element
- Custom shortcuts (per user) are a v1.5 candidate
