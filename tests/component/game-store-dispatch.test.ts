/* eslint-disable */
// @ts-nocheck
// Phase 5 — gameStore dispatch bridge. Verifies that the
// dispatch(fn => engine.X(grid, ...)) round-trip swaps the grid
// reference and that the engine sees the updated state on the next
// dispatch.
//
// initStartingPuzzle is the real entry point — it generates a
// level-2 puzzle synchronously. To keep this test fast and
// deterministic, we seed the store with a hand-built grid via
// newSudokuModel + a known initialDigits string instead of calling
// generatePuzzle.

import { describe, it, expect, beforeEach } from 'vitest';
import { newSudokuModel, modelHelpers } from '@/lib/sudoku-model';
import { useGameStore } from '@/state/gameStore';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/state/settingsStore';

const initialDigitsPartial =
  '000008000' +
  '000007000' +
  '123456789' +
  '000005000' +
  '000004000' +
  '000003000' +
  '000002000' +
  '000001000' +
  '000009000';

function seedGrid() {
  const grid = newSudokuModel({
    initialDigits: initialDigitsPartial,
    skipCheck: true,
  });
  useGameStore.setState({ grid });
}

beforeEach(() => {
  // Reset both stores so cross-test state doesn't bleed.
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  useGameStore.getState().reset();
  seedGrid();
});

describe('gameStore.dispatch', () => {
  it('replaces the grid reference when dispatch returns a new grid', () => {
    const before = useGameStore.getState().grid;
    useGameStore.getState().dispatch((grid: any) =>
      modelHelpers.applySelectionOp(grid, 'setSelection', 0)
    );
    const after = useGameStore.getState().grid as any;
    expect(after).not.toBe(before);
    expect(after.get('cells').get(0).get('isSelected')).toBe(true);
  });

  it('passes the latest grid into successive dispatches', () => {
    const dispatch = useGameStore.getState().dispatch;
    dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'setSelection', 0));
    dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'extendSelection', 1));
    const grid = useGameStore.getState().grid as any;
    const selected = grid
      .get('cells')
      .filter((c: any) => c.get('isSelected'))
      .map((c: any) => c.get('index'))
      .toArray();
    expect(selected).toEqual([0, 1]);
  });

  it('writes a digit on the selected cell via updateSelectedCells', () => {
    const dispatch = useGameStore.getState().dispatch;
    // Index 0 is a blank cell in the partial fixture (top-left).
    dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'setSelection', 0));
    dispatch((grid: any) => modelHelpers.updateSelectedCells(grid, 'setDigit', '5'));
    const grid = useGameStore.getState().grid as any;
    expect(grid.get('cells').get(0).get('digit')).toBe('5');
  });

  it('toggleSelectionMode flips the engine grid AND mirrors to gameStore.selectionMode if a bridge update is added', () => {
    const dispatch = useGameStore.getState().dispatch;
    expect((useGameStore.getState().grid as any).get('selectionMode')).toBe('single');
    dispatch((grid: any) => modelHelpers.toggleSelectionMode(grid));
    expect((useGameStore.getState().grid as any).get('selectionMode')).toBe('multi');
  });

  it('moveFocus advances focusIndex and writes setSelection to that cell', () => {
    const dispatch = useGameStore.getState().dispatch;
    dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'setSelection', 0));
    dispatch((grid: any) => modelHelpers.moveFocus(grid, 1, 0, false));
    const grid = useGameStore.getState().grid as any;
    expect(grid.get('focusIndex')).toBe(1);
    expect(grid.get('cells').get(1).get('isSelected')).toBe(true);
    expect(grid.get('cells').get(0).get('isSelected')).toBe(false);
  });
});

describe('settings bridge', () => {
  it('loadSettings reads from useSettingsStore (camelCase) and emits kebab-case keys', () => {
    useSettingsStore.setState({ theme: 'editorial', highlightMatches: false });
    const settings = modelHelpers.loadSettings();
    expect(settings['theme']).toBe('editorial');
    expect(settings['highlight-matches']).toBe(false);
  });

  it('saveSettings persists into useSettingsStore (camelCase) and never touches the legacy "settings" key', () => {
    // Wipe both keys so we can detect either being written.
    window.localStorage.removeItem('settings');
    window.localStorage.removeItem('sudoku:settings');
    const grid = useGameStore.getState().grid as any;
    const oldSettings = grid.get('settings');
    const newSettings = { ...oldSettings, ['highlight-matches']: false };
    modelHelpers.saveSettings(grid, newSettings);
    expect(useSettingsStore.getState().highlightMatches).toBe(false);
    expect(window.localStorage.getItem('settings')).toBeNull();
  });

  it('reseedSettings re-bakes the latest store state into the grid', () => {
    useSettingsStore.setState({ highlightMatches: false });
    useGameStore.getState().reseedSettings();
    const grid = useGameStore.getState().grid as any;
    expect(grid.get('settings')['highlight-matches']).toBe(false);
  });
});
