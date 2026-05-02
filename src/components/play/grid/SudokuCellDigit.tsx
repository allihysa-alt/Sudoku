/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from CRA
// src/components/sudoku-grid/sudoku-cell-digit.js. CSS for digit
// (given / error / completed / animation) lives in SudokuGrid.module.css.

import { memo } from 'react';

import styles from './SudokuGrid.module.css';

function SudokuCellDigit({ cell, dim, fontSize, completed }) {
  const digit = cell.get('digit');
  if (digit === '0') {
    return null;
  }
  const classes = [styles.digit];
  if (cell.get('isGiven')) {
    classes.push(styles.given);
  }
  if (cell.get('errorMessage') !== undefined) {
    classes.push(styles.error);
  }
  // QA-3 (#11): every instance of a completed digit recolours green to
  // mirror the keypad chip. The error class wins over completed if
  // both apply — a conflicting completed digit should still scream red.
  if (completed && cell.get('errorMessage') === undefined) {
    classes.push(styles.completed);
  }
  // A11 — wrap the digit in a <g> so the entry pop animation can scale
  // around the digit's own bounds (transform-box: fill-box). Givens
  // skip the animation since they appear once at puzzle load.
  const animate = !cell.get('isGiven');
  return (
    <g className={animate ? styles.sudokuCellDigitAnim : undefined}>
      <text
        className={classes.join(' ')}
        x={dim.textX}
        y={dim.textY}
        fontSize={fontSize}
        textAnchor="middle"
      >
        {digit}
      </text>
    </g>
  );
}

export default memo(SudokuCellDigit);
