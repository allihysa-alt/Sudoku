'use client';

// Phase 4 — game store skeleton. Holds the engine-produced grid plus
// transient UI state (current input mode, selection, dispatch hooks).
//
// The engine returns a "grid" object built from the not-mutable shim
// (immutable.js subset). Until Phase 5/6 wires the dispatch table and
// types-pass, we hold the grid as `unknown` so the store compiles
// cleanly under TS strict.
//
// NOT persisted — game state is volatile. Saved-puzzles persistence
// lives in `savedPuzzlesStore`; periodic auto-save is wired in
// Phase 10.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type InputMode = 'digit' | 'inner' | 'outer' | 'color';
export type SelectionMode = 'single' | 'multi';

export interface GameState {
  // Engine-produced grid. Type narrowed in Phase 5 when the dispatch
  // bridge lands.
  grid: unknown | null;
  // Current keypad input mode. Mirrors the CRA model's `inputMode`
  // field for cross-store consistency; also driven by the keypad
  // mode tabs.
  inputMode: InputMode;
  // SAM (single/multi) selection mode toggle.
  selectionMode: SelectionMode;
}

interface GameActions {
  setGrid: (grid: unknown) => void;
  setInputMode: (mode: InputMode) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  reset: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    grid: null,
    inputMode: 'digit',
    selectionMode: 'single',
    setGrid: (grid) =>
      set((draft) => {
        draft.grid = grid;
      }),
    setInputMode: (mode) =>
      set((draft) => {
        draft.inputMode = mode;
      }),
    setSelectionMode: (mode) =>
      set((draft) => {
        draft.selectionMode = mode;
      }),
    reset: () =>
      set((draft) => {
        draft.grid = null;
        draft.inputMode = 'digit';
        draft.selectionMode = 'single';
      }),
  }))
);
