# Sudoku — Architecture

A 30-second tour of the consistency contract. Read this before
touching themes, modals, the numpad, or any cross-component visual
surface.

This file is seeded in Phase 1 from the architecture proposal. Each
later phase amends the relevant section as features land. Phase 12
re-reads this file end-to-end against the as-built product.

## The three orthogonal axes

The interactive surface is parameterised on **three independent
axes**. Each axis owns one slice of the UX; mixing them is what
produces drift over time.

| Axis            | Values                                       | Drives                                                                                                             | Decided by                                       |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **Theme**       | `classic`, `modern`, `editorial`             | Visual language: colours, radii, shadows, motion (font is universal Manrope across all themes)                     | User (Settings → Appearance → Theme)             |
| **Numpad layout** | `auto`, `stacked`, `calculator`            | Editorial keypad's dies-grid variant. `auto` resolves at runtime from orientation                                  | User (Settings → Digit pad style); default `auto` |
| **Modal style** | `centered`, `drawer`, `hint`                 | Modal structure: dialog vs side-edge panel vs marginalia                                                           | Modal type (declared in `MODAL_STYLE_BY_TYPE`); not user-facing |

The three axes are wired into the DOM as data attributes on
`documentElement` and on the `.modal-container` element:

```
<html
  data-theme="modern"
  data-numpad-layout="auto"
  data-numpad-layout-effective="calculator"
>
  ...
  <div class="modal-container" data-modal-style="drawer">
    <div class="modal settings"> ... </div>
  </div>
</html>
```

`data-numpad-layout` carries the **raw setting** (`auto` / `stacked`
/ `calculator`); `data-numpad-layout-effective` carries the
**runtime resolution** (`stacked` or `calculator`) — `auto` is
resolved by `useEffectiveNumpadLayout()` from viewport orientation.
**Structural CSS branches on the effective attribute**, not the raw
setting, so orientation flips re-cascade without a settings
round-trip.

CSS keys off these attributes; **components do not branch on theme
in JS at render time.**

## Token surface

`app/globals.css` is the single source of truth for visual tokens.
Three blocks land in Phase 2:

- **`:root { ... }`** — Classic theme baseline (~70 tokens: colours,
  shadows, motion, type-scale, radii).
- **`:root[data-theme="modern"] { ... }`** — overrides for Modern.
- **`:root[data-theme="editorial"] { ... }`** — overrides for
  Editorial.

Any value a component renders should resolve to a token, e.g.
`color: var(--ink-2)`. Raw hex / rgba / named colours are forbidden
in component CSS by stylelint's
`scale-unlimited/declaration-strict-value` rule. The only exception
is `app/globals.css` itself (where the tokens are defined).

Component styling goes through CSS Modules — class names are scoped
per file, but token resolution still flows through `var(--…)`, so
the no-raw-colour rule applies unchanged.

## Numpad contract

`src/lib/numpad-contract.ts` lists every button the player can press
on the virtual numpad. The single Editorial keypad
(`src/components/numpad/VirtualNumpad.tsx`) hangs a `data-vkbd-id`
attribute on each interactive element; the value is derived from the
contract's runtime dispatch key via `contractIdFor()`.

`tests/component/numpad-contract.test.tsx` renders **every theme ×
layout variant combination** (3 themes × 2 dies-grid variants = 6)
against the single `VirtualNumpad` component and asserts each
combination exposes every contract id. Missing ids fail CI. The two
layout variants (`stacked`, `calculator`) flow through the same
component — only CSS branches structurally; the contract surface is
identical.

The contract test is the load-bearing CI gate. Adding a button
without adding a contract entry — or vice versa — fails the build.

## Modal style decoupling

`src/components/modal/ModalContainer.tsx` exports a
`MODAL_STYLE_BY_TYPE` map that determines which `data-modal-style`
the modal-container element gets. Three styles:

| Style      | Used by                                                                              | Geometry                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `centered` | confirm-restart, paused, check-result, welcome, etc.                                 | Dialog, scale-in, blurred backdrop                                                                                |
| `drawer`   | settings, help, stats, share, about, saved-puzzles, paste, features                  | Right-edge full-height, slide-in                                                                                  |
| `hint`     | hint modal                                                                           | Right-edge marginalia panel under all themes: 380 px wide, 100 vh tall, transparent click-through backdrop. Mobile-portrait collapses to a bottom-sheet. |

CSS rules in `modal.module.css` key off `data-modal-style`, NOT
`data-theme`. **No theme-scoped structural exceptions exist.**

## Lock-in mechanisms

Three guardrails keep future drift from re-entering:

**Stylelint** (`.stylelintrc.json`, runs via `pnpm lint:css`) forbids
raw colours on `color`, `*-color`, `fill`, `stroke` properties
outside `app/globals.css`. Any new raw value fails CI.

**ESLint** (`eslint.config.mjs`) forbids `theme === '<literal>'` and
`numpadLayout === '<literal>'` expressions outside
`src/lib/sudoku-model.ts`. This prevents component-level theme
branching from regressing.

**Vitest contract test**
(`tests/component/numpad-contract.test.tsx`) renders every theme ×
layout combination and fails if a renderer misses any contract id.
Adding a new button means adding a contract entry _and_ the renderer
honouring it — or the test fails.

## Anti-FOUC

The root layout (`app/layout.tsx`) inlines a tiny `<Script
strategy="beforeInteractive">` that reads
`localStorage['sudoku:settings']` (Zustand-persist shape) and writes
`data-theme` + `data-numpad-layout-effective` on
`documentElement` before React hydrates. Private-mode browsers,
corrupt JSON, and missing keys all silently fall back to Modern +
stacked, which are the intended defaults for first-time users.

The script lands in Phase 2 alongside the token surface.

## State management

Zustand + Immer. Four stores under `src/state/`:

- `gameStore` — puzzle, grid, mode, selection, history, future, hint state. Not persisted.
- `settingsStore` — every setting from the spec. Persisted to `localStorage` key `sudoku:settings` via Zustand persist.
- `savedPuzzlesStore` — saved-puzzle list. Persisted to `localStorage` key `sudoku:saved-puzzles`.
- `modalStore` — current modal type + payload. Not persisted.

The dispatch surface (the keys passed to `gameStore.dispatch(keyValue)`)
matches the keys used by `vkbdKeyPressHandler` in the CRA blueprint —
preserving the contract makes per-feature porting straightforward.
The implementation is Zustand actions producing Immer mutations; the
not-mutable shim from the CRA app does not exist in this build.

## Engine

`src/lib/` holds platform-neutral engine code: state machine
(`sudoku-model.ts`), strategy ladder (`sudoku-strategies.ts`),
generator (`sudoku-generator.ts`), hinter (`sudoku-hinter.ts`),
puzzle cache (`puzzle-cache.ts`), and the worker
(`workers/sudoku-generator.worker.ts`).

Performance-critical paths preserved from the blueprint:

- **PEERS table** (precomputed in `sudoku-strategies.ts`) — each
  cell's 20 row/col/box peers, used by `applyStep`'s incremental
  candidate update.
- **Incremental `applyStep`** for `kind: 'place'` steps — mutates
  only the affected cells' candidates rather than re-deriving the
  full grid.
- **`opts.maxRating` short-circuit** — bails out of the ladder walk
  once running max exceeds the cap. Hell-level generation depends on
  this.
- **Symmetric digger** — 180° rotational symmetry in `digHoles` for
  newspaper-style givens layout.
- **Snyder single-pass, pair-corners-only** — no cascade. Hidden
  singles surface by absence (the pedagogical contract).

## How to add a feature

### Add a numpad button

1. Add an entry to the appropriate group in
   `src/lib/numpad-contract.ts`:
   `{ id: '...', dispatchKeyValue: '...', ariaLabel: '...', ... }`.
2. Wire the button in `src/components/numpad/VirtualNumpad.tsx`. Use
   `contractIdFor(dispatchKey)` to source the `data-vkbd-id`
   attribute.
3. Handle the dispatch key in `gameStore.dispatch`.
4. The contract test will pass automatically once the renderer
   exposes the id under all 3 themes × 2 layout variants.

### Add a modal

1. Define a new `MODAL_TYPE_*` in `src/lib/modal-types.ts`.
2. Create `src/components/modal/Modal<Name>.tsx`.
3. Wire into `ModalContainer.tsx`'s dispatch.
4. Decide which style the modal wants (`centered`, `drawer`, `hint`)
   and add an entry to `MODAL_STYLE_BY_TYPE`.
5. Style the modal's content using existing tokens. Do NOT branch on
   `data-theme` for structure — only for tokens (which is already
   handled by the cascade).

### Add a theme

1. Add a new block in `app/globals.css`:
   `:root[data-theme="<name>"] { ... }` — override the ~70 base
   tokens with values for the new theme.
2. Update the validation in `settingsStore`'s setTheme action so the
   new value is accepted.
3. Add a `<button>` to `ThemePicker` in `ModalSettings.tsx`.
4. Run the app — the new theme should "just work" if every component
   CSS is token-driven.

### Add a setting

1. Add a key to the settings type in `settingsStore.ts`.
2. Add a default value in the store's initial state.
3. If the setting affects DOM beyond CSS tokens (e.g. needs a
   document-root data attribute), update the
   `syncSettingsToDom` effect.
4. Add a UI control in `ModalSettings.tsx`.

## Out of scope (v1)

- PWA / offline / installability
- Internationalisation
- Multiplayer / sync / accounts
- Telemetry / analytics
- Solver service network backend
