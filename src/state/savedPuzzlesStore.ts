'use client';

// Phase 4 — saved-puzzles store skeleton. Persisted to localStorage
// key `sudoku:saved-puzzles`. Full action surface (auto-save on
// progress, capacity ceiling at 5, share-link generation) lands in
// Phase 10 alongside the saved-puzzles modal.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface SavedPuzzle {
  // 81-character digit string of the initial puzzle.
  digits: string;
  // 1..6 difficulty level.
  level: number;
  // Engine rating, if known.
  rating: number | null;
  // ISO timestamp the entry was saved.
  savedAt: string;
  // Snapshot of in-progress state, opaque blob (engine-defined shape).
  // Phase 10 will narrow this type once auto-save lands.
  snapshot?: unknown;
}

const MAX_SAVED_PUZZLES = 5;

interface SavedPuzzlesState {
  entries: SavedPuzzle[];
  add: (entry: SavedPuzzle) => void;
  remove: (digits: string) => void;
  clear: () => void;
}

export const useSavedPuzzlesStore = create<SavedPuzzlesState>()(
  persist(
    immer((set) => ({
      entries: [],
      add: (entry) =>
        set((draft) => {
          // Drop any existing entry for the same puzzle, then unshift
          // the new one to the front. Cap at MAX_SAVED_PUZZLES.
          draft.entries = [
            entry,
            ...draft.entries.filter((e) => e.digits !== entry.digits),
          ].slice(0, MAX_SAVED_PUZZLES);
        }),
      remove: (digits) =>
        set((draft) => {
          draft.entries = draft.entries.filter((e) => e.digits !== digits);
        }),
      clear: () =>
        set((draft) => {
          draft.entries = [];
        }),
    })),
    {
      name: 'sudoku:saved-puzzles',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
