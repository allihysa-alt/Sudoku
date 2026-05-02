'use client';

// Phase 5 — game store. Holds the engine-produced grid plus the
// transient UI fields the bridge keeps in sync (input mode, SAM
// selection mode). The grid type is a not-mutable Map under @ts-nocheck
// in the engine; we hold it as `unknown` at the store boundary and
// pass it through opaque dispatch functions. Tighter typing comes in a
// later pass once the engine is annotated.
//
// NOT persisted — game state is volatile. Saved-puzzles persistence
// lives in `savedPuzzlesStore`; periodic auto-save lands in Phase 10.
//
// Dispatch surface
// ----------------
// Components and hooks call gameStore.dispatch((grid) => engine.X(grid, ...))
// — exactly the CRA `setGrid((grid) => modelHelpers.X(grid, ...))`
// pattern. The engine returns a fresh NMMap; Immer treats not-mutable
// Maps as opaque values, so `draft.grid = next` swaps references
// without wrapping in a draft.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { modelHelpers, newSudokuModel } from '@/lib/sudoku-model';
import { generatePuzzle } from '@/lib/sudoku-generator';

// Grid is the engine's not-mutable Map. Held as `unknown` at the store
// boundary to keep gameStore type-safe under TS strict; consumers cast
// or shrug via the engine's @ts-nocheck.
export type Grid = unknown;
export type GridDispatch = (grid: Grid) => Grid;

export type InputMode = 'digit' | 'inner' | 'outer' | 'color';
export type SelectionMode = 'single' | 'multi';

export interface GameState {
  grid: Grid | null;
  inputMode: InputMode;
  selectionMode: SelectionMode;
}

interface GameActions {
  /** Apply an engine operation to the current grid and replace it. */
  dispatch: (fn: GridDispatch) => void;
  setInputMode: (mode: InputMode) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  /**
   * Generate a level-2 puzzle synchronously and seat it in the store.
   * Phase 5 boot path. Worker-backed generation lands in Phase 10.
   */
  initStartingPuzzle: () => void;
  /**
   * Re-bake settings from useSettingsStore into the current grid.
   * Called by PlayClient when the settingsStore notifies a change so
   * downstream getSetting() reads see the latest values without
   * round-tripping through saveSettings (which would loop).
   */
  reseedSettings: () => void;
  reset: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    grid: null,
    inputMode: 'digit',
    selectionMode: 'single',

    dispatch: (fn) => {
      const current = get().grid;
      if (!current) return;
      const next = fn(current);
      set((draft) => {
        // Immer treats not-mutable NMMap instances as non-draftable —
        // assignment swaps the reference, no deep clone.
        draft.grid = next;
      });
    },

    setInputMode: (mode) =>
      set((draft) => {
        draft.inputMode = mode;
      }),

    setSelectionMode: (mode) =>
      set((draft) => {
        draft.selectionMode = mode;
      }),

    initStartingPuzzle: () => {
      // Synchronous level-2 generation. Sub-200ms typical;
      // higher levels block longer and move to the worker in Phase 10.
      const { digits } = generatePuzzle(2) as { digits: string };
      // newSudokuModel destructures all 5 params without defaults —
      // pass undefined for the optional ones so TS doesn't complain
      // about missing properties at the call site. difficultyLevel is
      // a STRING in the engine ('1'..'6') — newSudokuModel runs
      // `.replace(/[^1-6]/g, '')` on it, which crashes if you pass a
      // number.
      const grid = newSudokuModel({
        initialDigits: digits,
        difficultyLevel: '2',
        onPuzzleStateChange: undefined,
        entryPoint: undefined,
        skipCheck: true,
      });
      set((draft) => {
        draft.grid = grid;
      });
    },

    reseedSettings: () => {
      const current = get().grid;
      if (!current) return;
      // loadSettings reads useSettingsStore.getState() and runs
      // syncSettingsToDom; we re-bake the result into grid.settings
      // so engine helpers (getSetting, etc.) see fresh values.
      const settings = modelHelpers.loadSettings();
      // @ts-expect-error grid is the engine's not-mutable Map; .set is part of its API
      const next = current.set('settings', settings);
      set((draft) => {
        draft.grid = next;
      });
    },

    reset: () =>
      set((draft) => {
        draft.grid = null;
        draft.inputMode = 'digit';
        draft.selectionMode = 'single';
      }),
  }))
);
