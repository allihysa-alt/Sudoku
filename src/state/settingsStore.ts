'use client';

// Phase 4 — settings store. The single source of truth for every
// user-tunable setting in the app. Persisted via Zustand's `persist`
// middleware to localStorage key `sudoku:settings` in the standard
// `{ state: {...}, version: 1 }` envelope — the same shape the
// anti-FOUC script in app/layout.tsx already reads.
//
// Settings shape mirrors the CRA blueprint's DEFAULT_SETTINGS
// (sudoku-model.ts L311). Property names are camelCased for idiomatic
// TS; the kebab-case `SETTINGS` keys from the CRA model live only
// inside the engine's own loadSettings/saveSettings (Phase 5/6 will
// neuter that code path so this store is the sole writer).
//
// The engine's loadSettings ALSO targets the OLD CRA key 'settings'
// (un-namespaced); Phase 4 leaves it untouched because nothing in
// app/ calls into the engine yet. Bridge lands when the dispatch
// table wires up.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ThemeValue = 'classic' | 'modern' | 'editorial';
export type NumpadLayoutValue = 'auto' | 'stacked' | 'calculator';
export type HintBudgetValue = 'unlimited' | '5' | '3' | '0';
export type HintStyleValue = 'reveal' | 'nudge';

export interface Settings {
  showTimer: boolean;
  outlineSelection: boolean;
  highlightMatches: boolean;
  highlightConflicts: boolean;
  autocleanPencilmarks: boolean;
  flipNumericKeys: boolean;
  playVictoryAnimation: boolean;
  showRestrictionHighlight: boolean;
  hardcoreMode: boolean;
  showConflictCount: boolean;
  showRatings: boolean;
  autoSave: boolean;
  shortenLinks: boolean;
  passProgressToSolver: boolean;
  snyderModeAdvanced: boolean;
  hintBudget: HintBudgetValue;
  hintStyle: HintStyleValue;
  theme: ThemeValue;
  doubleClickToCommit: boolean;
  numpadLayout: NumpadLayoutValue;
  numpadLayoutTouched: boolean;
  numpadConflictIndicator: boolean;
  compactSettingsLayout: boolean;
  compactSettingsLayoutTouched: boolean;
}

// Defaults match the CRA blueprint's DEFAULT_SETTINGS verbatim
// (sudoku-model.ts L311 — see comments there for the rationale on
// each toggle). Theme is Modern by default; numpadLayout is auto;
// hintStyle is nudge.
export const DEFAULT_SETTINGS: Settings = {
  showTimer: true,
  outlineSelection: false,
  highlightMatches: true,
  highlightConflicts: true,
  autocleanPencilmarks: true,
  flipNumericKeys: true,
  playVictoryAnimation: true,
  showRestrictionHighlight: false,
  hardcoreMode: false,
  showConflictCount: true,
  showRatings: false,
  autoSave: true,
  shortenLinks: true,
  passProgressToSolver: false,
  snyderModeAdvanced: true,
  hintBudget: 'unlimited',
  hintStyle: 'nudge',
  theme: 'modern',
  doubleClickToCommit: true,
  numpadLayout: 'auto',
  numpadLayoutTouched: false,
  numpadConflictIndicator: false,
  compactSettingsLayout: false,
  compactSettingsLayoutTouched: false,
};

// Type-level enumeration of allowed values. Used for runtime
// validation in the action setters; the model layer (engine, Phase 3)
// is the only place where literal-string equality on `theme` /
// `numpadLayout` is allowed by the lock-in ESLint rule. State store
// validation goes through these arrays instead.
export const THEMES: readonly ThemeValue[] = ['classic', 'modern', 'editorial'] as const;
export const NUMPAD_LAYOUTS: readonly NumpadLayoutValue[] = [
  'auto',
  'stacked',
  'calculator',
] as const;
export const HINT_BUDGETS: readonly HintBudgetValue[] = ['unlimited', '5', '3', '0'] as const;
export const HINT_STYLES: readonly HintStyleValue[] = ['reveal', 'nudge'] as const;

interface SettingsActions {
  setTheme: (next: ThemeValue) => void;
  setNumpadLayout: (next: NumpadLayoutValue) => void;
  setHintBudget: (next: HintBudgetValue) => void;
  setHintStyle: (next: HintStyleValue) => void;
  // Generic setter for boolean/scalar settings. Typed by key so calls
  // like setSetting('showTimer', false) keep type-safety end-to-end.
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetToDefaults: () => void;
}

export type SettingsStore = Settings & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      ...DEFAULT_SETTINGS,
      setTheme: (next) =>
        set((draft) => {
          if (THEMES.includes(next)) {
            draft.theme = next;
          }
        }),
      setNumpadLayout: (next) =>
        set((draft) => {
          if (NUMPAD_LAYOUTS.includes(next)) {
            draft.numpadLayout = next;
            // Auto-flip the touched flag — once the user has explicitly
            // picked a layout, future theme changes do NOT auto-track
            // (mirrors the CRA blueprint's saveSettings rule).
            draft.numpadLayoutTouched = true;
          }
        }),
      setHintBudget: (next) =>
        set((draft) => {
          if (HINT_BUDGETS.includes(next)) {
            draft.hintBudget = next;
          }
        }),
      setHintStyle: (next) =>
        set((draft) => {
          if (HINT_STYLES.includes(next)) {
            draft.hintStyle = next;
          }
        }),
      setSetting: (key, value) =>
        set((draft) => {
          (draft as Settings)[key] = value;
        }),
      resetToDefaults: () =>
        set((draft) => {
          Object.assign(draft, DEFAULT_SETTINGS);
        }),
    })),
    {
      name: 'sudoku:settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Defensive merge — persisted state may be partial (older
      // schema, missing keys). Layer defaults under persisted so
      // newly-introduced settings show up with their default value
      // for returning users.
      merge: (persisted, current) => ({
        ...current,
        ...((persisted as Partial<Settings>) ?? {}),
      }),
    }
  )
);
