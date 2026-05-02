'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// The grid is the engine's not-mutable Map (@ts-nocheck); typing it
// precisely here would require copying the engine's Map shape into TS.
// The bridge boundary uses `any` deliberately — the engine ops are
// the source of truth, and this hook is a thin dispatch shim.

// Phase 5 — physical-keyboard bridge. Mirrors the CRA app's
// docKeyDownHandler + docKeyUpHandler (src/components/app/app.js)
// against the new gameStore.dispatch surface.
//
// Out-of-scope for Phase 5:
//   - "?" (showHintModal), "/" (shortcut overlay), F1 (showHelpPage),
//     "r" (confirm-restart) — modal-opening; deferred to Phase 7.
//   - "F" (fullscreen toggle) — non-essential UX; deferred.
//
// The CRA app gates many of these on `solved` / `modalActive`. Since
// Phase 5 has no modal renderer yet, the gates are simplified — the
// modalActive branch never fires here. Saved-puzzles + game-over
// modals land in Phase 7/9.

import { useEffect } from 'react';

import { modelHelpers, SETTINGS } from '@/lib/sudoku-model';
import { useGameStore } from '@/state/gameStore';

const inputModeFromHotKey: Record<string, 'digit' | 'outer' | 'inner' | 'color'> = {
  z: 'digit',
  x: 'outer',
  c: 'inner',
  v: 'color',
};

// Plain-letter shortcuts. r → restart deferred (modal-tied) until Phase 7.
const actionFromHotKey: Record<string, 'sam' | 'show-candidates' | 'show-snyder-candidates'> = {
  m: 'sam',
  g: 'show-candidates',
  n: 'show-snyder-candidates',
};

export function useGridKeyboard(): void {
  const dispatch = useGameStore((s) => s.dispatch);
  const inputMode = useGameStore((s) => s.inputMode);
  const setInputMode = useGameStore((s) => s.setInputMode);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey) return; // don't intercept browser hot-keys
      const keyName = e.code;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const shiftOrCtrl = e.shiftKey || ctrlOrMeta;

      // Digit row — 0-9 / Numpad0-9
      const digitMatch = /^(?:Digit|Numpad)([0-9])$/.exec(keyName);
      if (digitMatch) {
        const digit = digitMatch[1];
        dispatch((grid: any) => {
          const selectedCellCount = grid.get('cells').count((c: any) => c.get('isSelected'));
          let cellOp: string;
          if ((e.shiftKey && ctrlOrMeta) || inputMode === 'color') {
            cellOp = 'setCellColor';
          } else if (ctrlOrMeta || inputMode === 'inner') {
            cellOp = 'toggleInnerPencilMark';
          } else if (e.shiftKey || inputMode === 'outer' || selectedCellCount > 1) {
            cellOp = 'toggleOuterPencilMark';
          } else {
            cellOp = modelHelpers.defaultDigitOpForSelection(grid);
          }
          return modelHelpers.updateSelectedCells(grid, cellOp, digit);
        });
        e.preventDefault();
        return;
      }

      if (keyName === 'Backspace' || keyName === 'Delete') {
        if (e.target === document.body) e.preventDefault();
        dispatch((grid: any) => modelHelpers.clearSelectionByMode(grid));
        return;
      }

      if (e.key === '.') {
        dispatch((grid: any) => modelHelpers.updateSelectedCells(grid, 'pencilMarksToInner'));
        return;
      }

      if (keyName === 'Escape') {
        dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'clearSelection'));
        return;
      }

      if (keyName === 'KeyZ' && ctrlOrMeta) {
        dispatch((grid: any) => modelHelpers.undoOneAction(grid));
        return;
      }

      if (keyName === 'KeyY' && ctrlOrMeta) {
        dispatch((grid: any) => modelHelpers.redoOneAction(grid));
        return;
      }

      if (keyName === 'ArrowRight' || keyName === 'KeyD') {
        dispatch((grid: any) => modelHelpers.moveFocus(grid, 1, 0, shiftOrCtrl));
        e.preventDefault();
        return;
      }

      if (keyName === 'ArrowLeft' || keyName === 'KeyA') {
        dispatch((grid: any) => modelHelpers.moveFocus(grid, -1, 0, shiftOrCtrl));
        e.preventDefault();
        return;
      }

      if (keyName === 'ArrowUp' || keyName === 'KeyW') {
        dispatch((grid: any) => modelHelpers.moveFocus(grid, 0, -1, shiftOrCtrl));
        if (!(ctrlOrMeta && keyName === 'KeyW')) {
          // Don't prevent Cmd-W closing the window
          e.preventDefault();
        }
        return;
      }

      if (keyName === 'ArrowDown' || keyName === 'KeyS') {
        dispatch((grid: any) => modelHelpers.moveFocus(grid, 0, 1, shiftOrCtrl));
        e.preventDefault();
        return;
      }

      if (keyName === 'KeyP') {
        dispatch((grid: any) => modelHelpers.toggleShowPencilmarks(grid));
        return;
      }

      if (keyName === 'Enter') {
        // Round-6: Hardcore — Enter (= Check shortcut) no-ops.
        dispatch((grid: any) =>
          grid.get('lockedHardcore') ? grid : modelHelpers.gameOverCheck(grid)
        );
        return;
      }

      if (keyName === 'Home') {
        dispatch((grid: any) =>
          modelHelpers.applySelectionOp(grid, 'setSelection', modelHelpers.CENTER_CELL)
        );
        return;
      }

      if (keyName === 'Space') {
        dispatch((grid: any) =>
          modelHelpers.applySelectionOp(grid, 'toggleExtendSelection', grid.get('focusIndex'))
        );
        return;
      }

      if (e.key === 'Control' || e.key === 'Meta') {
        dispatch((grid: any) =>
          modelHelpers.setTempInputMode(grid, e.shiftKey ? 'color' : 'inner')
        );
        return;
      }

      if (e.key === 'Shift') {
        dispatch((grid: any) =>
          modelHelpers.setTempInputMode(grid, ctrlOrMeta ? 'color' : 'outer')
        );
        return;
      }

      if (inputModeFromHotKey[e.key]) {
        const mode = inputModeFromHotKey[e.key];
        // Update both the engine grid state and gameStore.inputMode so
        // downstream digit dispatches read the new mode immediately.
        dispatch((grid: any) => modelHelpers.setInputMode(grid, mode));
        setInputMode(mode);
        return;
      }

      if (!ctrlOrMeta && actionFromHotKey[e.key]) {
        const action = actionFromHotKey[e.key];
        if (action === 'sam') {
          dispatch((grid: any) => modelHelpers.toggleSelectionMode(grid));
        } else if (action === 'show-candidates') {
          dispatch((grid: any) =>
            grid.get('lockedHardcore') ? grid : modelHelpers.toggleShowCandidates(grid)
          );
        } else if (action === 'show-snyder-candidates') {
          dispatch((grid: any) => {
            if (grid.get('lockedHardcore')) return grid;
            if (!modelHelpers.getSetting(grid, SETTINGS.snyderModeAdvanced)) return grid;
            return modelHelpers.toggleShowSnyderMarks(grid);
          });
        }
        return;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Control' || e.key === 'Meta') {
        if (e.shiftKey) {
          dispatch((grid: any) => modelHelpers.setTempInputMode(grid, 'outer'));
        } else {
          dispatch((grid: any) => modelHelpers.clearTempInputMode(grid));
        }
        return;
      }
      if (e.key === 'Shift') {
        if (e.ctrlKey || e.metaKey) {
          dispatch((grid: any) => modelHelpers.setTempInputMode(grid, 'inner'));
        } else {
          dispatch((grid: any) => modelHelpers.clearTempInputMode(grid));
        }
        return;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [dispatch, inputMode, setInputMode]);
}
