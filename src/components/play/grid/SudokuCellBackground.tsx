/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from CRA
// src/components/sudoku-grid/sudoku-cell-background.js. Class names
// resolved through the consolidated SudokuGrid.module.css; CSS rules
// for .peer / .selected / .matched / .matchedPencil / .error etc.
// live there.

import { memo } from 'react';

import styles from './SudokuGrid.module.css';

function cellHasPencilledDigit(cell, d) {
  if (!cell.get('userHiddenInner').includes(d)) {
    if (cell.get('innerPencils').includes(d) || cell.get('autoInner').includes(d)) {
      return true;
    }
  }
  if (!cell.get('userHiddenOuter').includes(d)) {
    if (cell.get('outerPencils').includes(d) || cell.get('autoOuter').includes(d)) {
      return true;
    }
  }
  return false;
}

function SudokuCellBackground({ cell, dim, cellSize, matchDigit, isPeer, showPencilmarks, extendedHighlight }) {
  const bgColorCode = showPencilmarks ? cell.get('colorCode') : '1';
  const bgClasses = [styles.cellBg];
  if (cell.get('isGiven')) {
    bgClasses.push(styles.given);
  }
  const isSelected = cell.get('isSelected');
  if (isSelected) {
    bgClasses.push(styles.selected);
  }
  if (cell.get('errorMessage') !== undefined) {
    bgClasses.push(styles.error);
  }
  const digit = cell.get('digit');
  if (matchDigit && matchDigit !== '0') {
    if (digit === matchDigit) {
      // Cell holds the focus digit — selected blue.
      bgClasses.push(styles.matched);
    } else if (
      (digit === '0' || digit === undefined) &&
      showPencilmarks &&
      cellHasPencilledDigit(cell, matchDigit)
    ) {
      // QA-3 (#16): empty cell with focus digit pencilled.
      bgClasses.push(styles.matchedPencil);
    }
  }
  if (isPeer && !isSelected) {
    bgClasses.push(styles.peer);
  }
  return (
    <g
      className={bgClasses.join(' ')}
      data-cell-index={dim.index}
      data-row={dim.row}
      data-col={dim.col}
      data-box={dim.box}
      data-ring={dim.ring}
    >
      <rect
        className={styles[`colorCode${bgColorCode}`]}
        x={dim.x}
        y={dim.y}
        width={cellSize}
        height={cellSize}
      />
      <rect
        className={styles.cellSelectMatchOverlay}
        x={dim.x}
        y={dim.y}
        width={cellSize}
        height={cellSize}
      />
    </g>
  );
}

export default memo(SudokuCellBackground);
