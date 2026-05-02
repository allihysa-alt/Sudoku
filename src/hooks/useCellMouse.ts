'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// The grid is the engine's not-mutable Map (@ts-nocheck); typing it
// precisely here would require copying the engine's Map shape into TS.
// The bridge boundary uses `any` deliberately — the engine ops are
// the source of truth, and this hook is a thin dispatch shim.

// Phase 5 — pointer-input bridge. Mirrors the CRA app's
// cellMouseDownHandler / cellMouseOverHandler / commitSingleCandidate
// (src/components/app/app.js, lines 87–185) against the new
// gameStore.dispatch surface.
//
// Returns { mouseDownHandler, mouseOverHandler, doubleClickHandler,
//          inputHandler } — the four props SudokuGrid expects.
//
// inputHandler routes synthetic touch events from useCellTouch
// (defined inside SudokuGrid.tsx). Phase 5 only handles the cell-touch
// path; vkbdKeyPress events arrive in Phase 6 with the keypad.

import { useCallback } from 'react';

import { modelHelpers, SETTINGS } from '@/lib/sudoku-model';
import { useGameStore } from '@/state/gameStore';

function indexFromCellEvent(e: any): number | undefined {
  const index = e.target?.dataset?.cellIndex;
  if (index === undefined) return undefined;
  return parseInt(index, 10);
}

export interface CellMouseHandlers {
  mouseDownHandler: (e: any) => void;
  mouseOverHandler: (e: any) => void;
  doubleClickHandler: (e: any) => void;
  inputHandler: (e: any) => void;
}

export function useCellMouse(): CellMouseHandlers {
  const dispatch = useGameStore((s) => s.dispatch);

  const mouseDownHandler = useCallback(
    (e: any) => {
      e.stopPropagation();
      const index = indexFromCellEvent(e);
      if (index === undefined) {
        // Non-cell mousedown bubbled here: clear selection unless the
        // target is an interactive element (Round-5 fix #1+#2 final).
        const interactive = e.target.closest?.(
          'button, input, a, textarea, select, [role="button"], [contenteditable="true"]'
        );
        if (interactive) return;
        dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'clearSelection'));
        return;
      }
      dispatch((grid: any) => {
        const samMulti = grid.get('selectionMode') === 'multi';
        if (e.ctrlKey || e.metaKey || e.shiftKey || samMulti) {
          return modelHelpers.applySelectionOp(grid, 'toggleExtendSelection', index);
        }
        return modelHelpers.applySelectionOp(grid, 'setSelection', index);
      });
      e.preventDefault();
    },
    [dispatch]
  );

  const mouseOverHandler = useCallback(
    (e: any) => {
      e.stopPropagation();
      if ((e.buttons & 1) === 1) {
        const index = indexFromCellEvent(e);
        if (index === undefined) return;
        dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'extendSelection', index));
        e.preventDefault();
      }
    },
    [dispatch]
  );

  // commitSingleCandidate — universal "double-click to commit single
  // candidate". Fires when the cell is empty, not given, has exactly
  // one visible centre pencil mark (manual ∪ auto, minus user-hidden),
  // AND SETTINGS.doubleClickToCommit is on.
  const commitSingleCandidate = useCallback(
    (index: number) => {
      dispatch((grid: any) => {
        const settings = grid.get('settings');
        if (!settings[SETTINGS.doubleClickToCommit]) return grid;
        const cell = grid.get('cells').get(index);
        if (!cell) return grid;
        if (cell.get('digit') !== '0') return grid;
        if (cell.get('isGiven')) return grid;
        const manual = cell.get('innerPencils');
        const auto = cell.get('autoInner');
        const hidden = cell.get('userHiddenInner');
        let combined = manual.union(auto);
        if (hidden && hidden.size > 0) {
          hidden.toArray().forEach((d: string) => {
            combined = combined.delete(d);
          });
        }
        if (combined.size !== 1) return grid;
        const digit = combined.toArray()[0];
        let g = modelHelpers.applySelectionOp(grid, 'setSelection', index);
        g = modelHelpers.updateSelectedCells(g, 'setDigit', digit);
        return g;
      });
    },
    [dispatch]
  );

  const doubleClickHandler = useCallback(
    (e: any) => {
      const index = indexFromCellEvent(e);
      if (index === undefined) return;
      commitSingleCandidate(index);
      e.preventDefault?.();
    },
    [commitSingleCandidate]
  );

  // Synthetic touch event handler — receives {type: 'cellTouched' |
  // 'cellSwipedTo', cellIndex, ...} from useCellTouch in SudokuGrid.
  // Round-8 (iOS reliability): two cellTouched events on the same cell
  // within 650ms flag isDoubleClick → commit path.
  const inputHandler = useCallback(
    (e: any) => {
      if (e.type === 'cellTouched') {
        if (e.isDoubleClick) {
          commitSingleCandidate(e.cellIndex);
          return;
        }
        dispatch((grid: any) => {
          const samMulti = grid.get('selectionMode') === 'multi';
          const op = samMulti ? 'toggleExtendSelection' : 'setSelection';
          return modelHelpers.applySelectionOp(grid, op, e.cellIndex);
        });
        return;
      }
      if (e.type === 'cellSwipedTo') {
        dispatch((grid: any) => modelHelpers.applySelectionOp(grid, 'extendSelection', e.cellIndex));
        return;
      }
      // 'vkbdKeyPress' deferred to Phase 6.
    },
    [dispatch, commitSingleCandidate]
  );

  return { mouseDownHandler, mouseOverHandler, doubleClickHandler, inputHandler };
}
