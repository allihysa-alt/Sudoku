# Sudoku

A modern Sudoku web app on Next.js 15 + TypeScript.

This is a standalone build — it does not share storage, URLs, users, or
migrations with any other Sudoku project. The architecture cheat-sheet
in `docs/ARCHITECTURE.md` describes the three orthogonal axes (theme,
numpad-layout, modal-style) and the lock-in posture that keeps the
interactive surface coherent as features land.

## Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript (strict; engine port temporarily relaxes
  `noImplicitAny` per phase plan)
- **State**: Zustand + Immer (lands Phase 4)
- **Styling**: `app/globals.css` with `:root[data-theme]` token blocks
  + CSS Modules per component
- **Testing**: Vitest (unit + component) + Playwright (E2E)
- **Hosting**: Vercel (preview deploys per PR; production on push to `main`)
- **Package manager**: pnpm

## Quickstart

```powershell
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm lint:css
pnpm test
pnpm build
```

## Lock-in posture

Three guardrails keep future drift from re-entering:

- **Stylelint** forbids raw colour values outside `app/globals.css` —
  every component style must resolve to a token.
- **ESLint** forbids `theme === '<literal>'` and
  `numpadLayout === '<literal>'` outside the model layer — components
  branch via data attributes, never JS.
- **Vitest contract test** renders every theme × layout combination of
  the virtual numpad and asserts every contract id is reachable.

Adding a button, a modal, or a theme means walking the corresponding
section in `docs/ARCHITECTURE.md` first.

## Phases

PR-shaped phases drive the build. See the architecture proposal for
the full list. Phase 1 ships the scaffold + CI + Vercel hookup.

## License

Deferred (no `LICENSE` file in the initial commit; `package.json`
declares `UNLICENSED`). Revisit before any public release.
