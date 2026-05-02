/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from CRA
// src/components/sudoku-grid/sudoku-cell-cover.js. Two transparent
// hit-targets per cell: a full-cell rect for click detection and a
// smaller octagon polygon for drag-extend (the .cell-drag-cover the
// touch handler in SudokuGrid uses for elementFromPoint lookups).

import { memo } from 'react';

function SudokuCellCover({ cell, dim, cellSize, mouseDownHandler, mouseOverHandler }) {
  const tooltip = cell.get('errorMessage') ? <title>{cell.get('errorMessage')}</title> : null;
  return (
    <>
      <rect
        className="cell-cover"
        x={dim.x}
        y={dim.y}
        fill="transparent"
        data-cell-index={dim.index}
        width={cellSize + 1}
        height={cellSize + 1}
        onMouseDown={mouseDownHandler}
        pointerEvents="fill"
      >
        {tooltip}
      </rect>
      <polygon
        className="cell-drag-cover"
        points={dim.dragCoverPoints}
        fill="transparent"
        data-cell-index={dim.index}
        onMouseDown={mouseDownHandler}
        onMouseOver={mouseOverHandler}
        pointerEvents="fill"
      >
        {tooltip}
      </polygon>
    </>
  );
}

export default memo(SudokuCellCover);
