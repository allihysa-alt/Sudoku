/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from CRA
// src/components/sudoku-grid/sudoku-cell-paused.js. The .paused class
// on the .sudokuGrid wrapper blurs the SVG via CSS (Phase 7); this
// component renders an empty <g> so the render path stays uniform
// across running and paused states.

import { memo } from 'react';

function SudokuCellPaused({ cell, dim }) {
  return <g className="cell" aria-hidden="true" />;
}

export default memo(SudokuCellPaused);
