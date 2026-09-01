# pi-pism-frame

A [pi](https://pi.dev) extension that **frames your session** — a colored, named
header on top, a status bar, and the terminal tab title — so you always know
which session you're in. Built to pair with [pism](https://github.com/vandlol/pism)'s
memorable session names, but it works on its own too.

```
⬢ calm-otter  ·  mac ─────────────────────────────────────────
  … your pi conversation …
                                              ⬢ calm-otter · mac
```

No forced box, no fighting pi's TUI — it decorates the official header, footer
and title surfaces and nothing else. **You pick the style and color.**

---

## Install

From git (works today, no npm account needed) — pin a released tag:

```sh
pi install git:github.com/vandlol/pi-pism-frame@0.0.1
```

From npm (stable releases, once published):

```sh
pi install npm:pi-pism-frame
```

Or drop a built copy in `~/.pi/agent/extensions/`, or load it ad-hoc for a run:

```sh
pi -e ./dist/index.js
```

> Stable releases ship to npm; pre-releases are git-only (`…@<tag>`). See
> [CONTRIBUTING.md](CONTRIBUTING.md) for the release model.

The extension stays **dormant unless `PISM_SESSION_NAME` is set**, so installing
it never changes plain `pi` — it only lights up when a session name is provided
(pism sets it automatically; see below).

---

## Configure

All configuration is via environment variables (pism sets these when it launches
pi; set them yourself for standalone use):

| Env var | Meaning | Default |
|---|---|---|
| `PISM_SESSION_NAME` | Name to display. **Required to activate.** | — (dormant) |
| `PISM_HOST` | Host label shown after the name (`local` is hidden in the title) | — |
| `PISM_FRAME_STYLE` | `full` · `header` · `bar` · `title` · `off` | `full` |
| `PISM_FRAME_COLOR` | A pastel name, a theme color, or a hex (see [Colors](#colors)) | `auto` |
| `PISM_FRAME_ICON` | Glyph shown before the name | `⬢` |

**Styles** (you choose — there is deliberately no full-screen rectangle):

- `full` — header line + status bar + terminal title
- `header` — header line + title
- `bar` — status bar + title
- `title` — terminal title only
- `off` — nothing

### Colors

`PISM_FRAME_COLOR` (or the color token to `/pism-frame`) accepts, in priority
order:

1. **A curated pastel name** — 32 modern pastels, each with a hand-tuned,
   high-contrast text color (all verified **WCAG AAA** in truecolor, **AA** after
   256-color quantization), so bar text is always readable:

   ```
   rose  coral  salmon  peach  apricot  amber  honey  gold
   lemon citron lime    fern   green    sage   mint   emerald
   teal  aqua   cyan    sky    azure    cerulean blue  denim
   indigo violet grape  plum   orchid   magenta fuchsia blush
   ```

2. **A pi theme color** — `accent`, `warning`, `success`, `error`, `muted`, … —
   mapped through the active theme.
3. **A hex value** — `#c96442` (truecolor; nearest 256 on 256-color terminals),
   with black/white text chosen by luminance.

The default is **`auto`**: each session *name* deterministically maps to one of
the 32 pastels, so different sessions get different (readable) colors for free.

### Change it live

```
/pism-frame                 show current style
/pism-frame bar             switch to the status-bar style
/pism-frame header rose     header style in the rose pastel
/pism-frame bar #c96442     bar style in a custom hex color
/pism-frame off             hide the frame
```

---

## How it pairs with pism

[pism](https://github.com/vandlol/pism) gives every session a memorable
`adjective-noun` name (e.g. `calm-otter`). When it launches pi it can export
`PISM_SESSION_NAME` / `PISM_HOST` / `PISM_FRAME_*`, and this extension turns that
into an always-visible header/bar/title — so when you switch between sessions
(even across hosts) you can see exactly where you landed, without running any
command.

Using it without pism is fine too — just set `PISM_SESSION_NAME` yourself.

---

## Develop

Requires Node ≥ 22.19.

```sh
npm install
npm run typecheck   # tsc --noEmit
npm test            # node:test via tsx
npm run build       # tsup -> dist/index.js (+ .d.ts)
npm run check       # typecheck + test + build
```

The extension imports the pi SDK **types only**, so the runtime bundle has zero
dependencies — it's a single small ESM file.

Built against `@earendil-works/pi-coding-agent` (pi) using the official
`ExtensionUIContext` surface: `setHeader`, `setStatus`, `setTitle`.

---

## License

MIT © vandlol
