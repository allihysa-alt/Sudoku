/* eslint-disable */
// @ts-nocheck
// Phase 5 — port from CRA src/components/sudoku-grid/sudoku-grid.js.
// Class strings translated to the consolidated SudokuGrid.module.css;
// hint-mode and solved-animate state classes deferred to later phases.
//
// The component takes the engine grid (a not-mutable Map) plus four
// handlers: mouseDownHandler / mouseOverHandler / doubleClickHandler
// drive selection; inputHandler receives synthetic touch events
// dispatched by useCellTouch (Round-8: iOS double-tap reliability).
//
// buildGridAnnouncement (a11y live region) is preserved verbatim per
// D5; tests for it land in Phase 11.

import { useState, useMemo } from 'react';

import { SETTINGS, modelHelpers } from '@/lib/sudoku-model';
import calculateGridDimensions from '@/lib/grid-dimensions';

import SudokuCellPaused from './SudokuCellPaused';
import SudokuCellBackground from './SudokuCellBackground';
import SudokuCellRegionOutline from './SudokuCellRegionOutline';
import SudokuCellPencilMarks from './SudokuCellPencilMarks';
import SudokuCellDigit from './SudokuCellDigit';
import SudokuCellCover from './SudokuCellCover';
import GridLines from './GridLines';

import styles from './SudokuGrid.module.css';

function layerCellBackgrounds({ cells, cellSize, dim, matchDigit, peerIndexes, showPencilmarks, extendedHighlight }) {
  return cells.map((cell, i) => {
    const cellDim = dim.cell[i];
    return (
      <SudokuCellBackground
        key={`bg${i}`}
        cell={cell}
        dim={cellDim}
        cellSize={cellSize}
        matchDigit={matchDigit}
        isPeer={peerIndexes.has(i)}
        showPencilmarks={showPencilmarks}
        extendedHighlight={extendedHighlight}
      />
    );
  });
}

// Compute the soft peer-tint set per the highlight spec.
//
//   Always — row/col/box of every selected cell (union for multi-select).
//
//   Only when extendedHighlight (= showRestrictionHighlight ON) — also adds
//   every cell where the focus digit is genuinely restricted from being
//   placed: peers of any cell that ACTUALLY HOLDS the focus digit. A
//   pencil mark is a "could be", not an "is" — pencil marks are NOT a
//   source of restriction.
function computePeerIndexes(cells, dim, focusDigit, extendedHighlight) {
  const peers = new Set();

  // Step 1 — peers of every selected cell. Always-on.
  const selRows = new Set();
  const selCols = new Set();
  const selBoxes = new Set();
  cells.forEach((cell) => {
    if (cell.get('isSelected')) {
      const cd = dim.cell[cell.get('index')];
      if (cd) {
        selRows.add(cd.row);
        selCols.add(cd.col);
        selBoxes.add(cd.box);
      }
    }
  });
  if (selRows.size > 0) {
    dim.cell.forEach((cd) => {
      if (selRows.has(cd.row) || selCols.has(cd.col) || selBoxes.has(cd.box)) {
        peers.add(cd.index);
      }
    });
  }

  // Step 2 — restriction set. Only when extendedHighlight is ON.
  if (extendedHighlight && focusDigit && focusDigit !== '0') {
    // (a) Every filled cell with a non-focus digit.
    cells.forEach((cell) => {
      const digit = cell.get('digit');
      if (digit && digit !== '0' && digit !== focusDigit) {
        peers.add(cell.get('index'));
      }
    });

    // (b) Cells in row/col/box of any cell that holds the focus digit.
    const sourceRows = new Set();
    const sourceCols = new Set();
    const sourceBoxes = new Set();
    cells.forEach((cell) => {
      if (cell.get('digit') !== focusDigit) return;
      const cd = dim.cell[cell.get('index')];
      if (!cd) return;
      sourceRows.add(cd.row);
      sourceCols.add(cd.col);
      sourceBoxes.add(cd.box);
    });
    if (sourceRows.size > 0) {
      cells.forEach((cell) => {
        if (cell.get('digit') === focusDigit) return;
        const cd = dim.cell[cell.get('index')];
        if (cd && (sourceRows.has(cd.row) || sourceCols.has(cd.col) || sourceBoxes.has(cd.box))) {
          peers.add(cd.index);
        }
      });
    }
  }
  return peers;
}

function layerSelectionOutline({ cells, dim }) {
  const selectedIndexes = cells.filter((c) => c.get('isSelected')).map((c) => c.get('index'));
  return (
    <SudokuCellRegionOutline
      className={styles.selectionOutline}
      cellSet={selectedIndexes}
      dim={dim}
    />
  );
}

function layerCellPencilMarks({ cells, cellSize, dim }) {
  const pencilOffsets = dim.outerPencilOffsets;
  return cells.map((cell, i) => {
    const cellDim = dim.cell[i];
    return (
      <SudokuCellPencilMarks
        key={`pm${i}`}
        cell={cell}
        dim={cellDim}
        cellSize={cellSize}
        pencilOffsets={pencilOffsets}
      />
    );
  });
}

function layerCellDigits({ cells, dim, completedDigits }) {
  return cells.map((cell, i) => {
    const cellDim = dim.cell[i];
    const digit = cell.get('digit');
    const isCompleted = digit && digit !== '0' && !!completedDigits[digit];
    return (
      <SudokuCellDigit
        key={`dig${i}`}
        cell={cell}
        dim={cellDim}
        fontSize={dim.fontSize}
        completed={isCompleted}
      />
    );
  });
}

function layerCellCovers({ cells, cellSize, dim, mouseDownHandler, mouseOverHandler }) {
  return cells.map((cell, i) => {
    const cellDim = dim.cell[i];
    return (
      <SudokuCellCover
        key={`cov${i}`}
        cell={cell}
        dim={cellDim}
        cellSize={cellSize}
        mouseDownHandler={mouseDownHandler}
        mouseOverHandler={mouseOverHandler}
      />
    );
  });
}

function layerCellPaused({ cells, cellSize, dim }) {
  return cells.map((cell, i) => {
    const cellDim = dim.cell[i];
    return <SudokuCellPaused key={`pau${i}`} cell={cell} dim={cellDim} />;
  });
}

function cellContentLayers({
  cells,
  cellSize,
  dim,
  matchDigit,
  peerIndexes,
  showPencilmarks,
  outlineSelection,
  extendedHighlight,
  completedDigits,
}) {
  const backgrounds = layerCellBackgrounds({
    cells,
    cellSize,
    dim,
    matchDigit,
    peerIndexes,
    showPencilmarks,
    extendedHighlight,
  });
  const selectionOutline = outlineSelection ? layerSelectionOutline({ cells, dim }) : null;
  const pencilMarks = showPencilmarks ? layerCellPencilMarks({ cells, cellSize, dim }) : [];
  const digits = layerCellDigits({ cells, cellSize, dim, completedDigits });
  return (
    <>
      {backgrounds}
      {selectionOutline}
      {pencilMarks}
      {digits}
    </>
  );
}

function indexFromTouchEvent(e) {
  const t = (e.touches || {})[0];
  if (t) {
    let index = t.target.dataset.cellIndex;
    if (t.pageX) {
      const el = document.elementFromPoint(t.pageX, t.pageY);
      if (el && el !== t.target && el.classList.contains('cell-drag-cover')) {
        index = el.dataset.cellIndex;
      }
    }
    if (index !== undefined) {
      return parseInt(index, 10);
    }
  }
  return;
}

// Round-8 (iOS reliability): cellTouched events carry wantDoubleClick:
// true so the input handler can detect two consecutive same-cell taps
// within 650ms (proven reliable on iOS where DOM dblclick is unreliable).
function useCellTouch(inputHandler) {
  const [lastCellTouched, setLastCellTouched] = useState(false);
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    const eventType = e.type;
    if (eventType === 'touchend') {
      setLastCellTouched(undefined);
      return;
    }
    const cellIndex = indexFromTouchEvent(e);
    if (cellIndex !== undefined && cellIndex !== lastCellTouched) {
      if (eventType === 'touchstart') {
        inputHandler({
          type: 'cellTouched',
          cellIndex,
          value: cellIndex,
          source: 'touch',
          wantDoubleClick: true,
        });
      } else if (eventType === 'touchmove') {
        inputHandler({ type: 'cellSwipedTo', cellIndex, value: cellIndex, source: 'touch' });
      }
      setLastCellTouched(cellIndex);
    }
  };
}

// U-02 — polite live-region announcement for the focused cell. Fires
// on focusIndex / matchDigit / cell-content / errorMessage changes.
// P2-d: blank cells also announce their pencil candidates.
const ALL_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function combinedPencilSet(cell, kind) {
  const Cap = kind.charAt(0).toUpperCase() + kind.slice(1);
  const manual = cell.get(`${kind}Pencils`);
  const auto = cell.get(`auto${Cap}`);
  const hidden = cell.get(`userHidden${Cap}`);
  if (!manual) return null;
  let merged = manual;
  if (auto) merged = merged.union(auto);
  if (hidden && hidden.size > 0) {
    hidden.toArray().forEach((d) => {
      merged = merged.delete(d);
    });
  }
  if (merged.size === 0) return null;
  return ALL_DIGITS.filter((d) => merged.includes(d)).join(' ');
}

function buildGridAnnouncement(focusIndex, cells, matchDigit) {
  if (focusIndex === null || focusIndex === undefined) {
    return '';
  }
  const cell = cells[focusIndex];
  if (!cell) return '';
  const row = Math.floor(focusIndex / 9) + 1;
  const col = (focusIndex % 9) + 1;
  const digit = cell.get('digit');
  const isGiven = cell.get('isGiven');
  const errorMessage = cell.get('errorMessage');
  const parts = [`Row ${row}`, `column ${col}`];
  if (digit && digit !== '0') {
    parts.push(digit);
    if (isGiven) parts.push('given');
  } else {
    parts.push('blank');
    const outer = combinedPencilSet(cell, 'outer');
    const inner = combinedPencilSet(cell, 'inner');
    if (outer) parts.push(`candidates ${outer} corner`);
    if (inner) parts.push(`${outer ? '' : 'candidates '}${inner} centre`);
  }
  if (errorMessage) parts.push('duplicate digit');
  if (matchDigit && matchDigit !== '0' && matchDigit !== digit) {
    parts.push(`highlighting ${matchDigit}`);
  }
  return parts.join(', ');
}

function SudokuGrid({
  grid,
  gridId = null,
  dimensions,
  isPaused = false,
  mouseDownHandler,
  mouseOverHandler,
  doubleClickHandler,
  inputHandler,
}) {
  const cellSize = 100;
  const marginSize = 50;
  const fontSize = 72;
  const dim = useMemo(
    () => calculateGridDimensions(cellSize, marginSize, fontSize),
    [cellSize, marginSize, fontSize]
  );
  const settings = grid.get('settings');
  const outlineSelection = settings[SETTINGS.outlineSelection];
  const showPencilmarks = grid.get('showPencilmarks');
  // Batch-5: in enter mode every typed given would shade most of the
  // board — force the highlight off in that mode.
  const isEnterMode = grid.get('mode') === 'enter';
  const showRestrictionHighlight =
    modelHelpers.getSetting(grid, SETTINGS.showRestrictionHighlight) && !isEnterMode;
  const cells = grid.get('cells').toArray();
  // Focus digit drives the .matched / .matched-pencil classes. Always
  // derived (not gated by the restriction setting) so cells holding
  // the focus digit get the selected-blue tint in both ON and OFF
  // states.
  const focusDigit = (() => {
    const sel = cells.find((c) => c.get('isSelected'));
    const selDigit = sel && sel.get('digit');
    if (selDigit && selDigit !== '0') return selDigit;
    const md = grid.get('matchDigit');
    return md && md !== '0' ? md : null;
  })();
  const matchDigit = focusDigit;
  const focusIndex = grid.get('focusIndex');
  const liveAnnouncement = buildGridAnnouncement(focusIndex, cells, matchDigit);
  const peerIndexes = computePeerIndexes(cells, dim, focusDigit, showRestrictionHighlight);
  const completedDigits = grid.get('completedDigits') || {};
  const cellContents = isPaused
    ? layerCellPaused({ cells, cellSize, dim })
    : cellContentLayers({
        cells,
        cellSize,
        dim,
        matchDigit,
        peerIndexes,
        showPencilmarks,
        outlineSelection,
        extendedHighlight: showRestrictionHighlight,
        completedDigits,
      });
  const cellCovers = layerCellCovers({ cells, cellSize, dim, mouseDownHandler, mouseOverHandler });
  const rawTouchHandler = useCellTouch(inputHandler);
  return (
    <div
      className={styles.sudokuGrid}
      id={gridId || null}
      onTouchStart={rawTouchHandler}
      onTouchEnd={rawTouchHandler}
      onTouchMove={rawTouchHandler}
      onDoubleClick={doubleClickHandler}
    >
      <svg
        version="1.1"
        style={{ width: dimensions.gridLength }}
        viewBox={`0 0 ${dim.width} ${dim.height}`}
      >
        <rect className={styles.gridBg} width="100%" height="100%" />
        {cellContents}
        <GridLines cellSize={dim.cellSize} marginSize={dim.marginSize} />
        {cellCovers}
      </svg>
      {/* U-02 — polite live region. Sibling of the SVG so it stays inside
          the grid's container but doesn't paint. */}
      <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>
    </div>
  );
}

export default SudokuGrid;
