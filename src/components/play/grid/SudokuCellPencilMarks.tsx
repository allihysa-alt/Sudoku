/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from CRA
// src/components/sudoku-grid/sudoku-cell-pencil-marks.js. Each digit
// glyph carries a per-source class (markUser / markAuto); CSS for the
// two colours lives in SudokuGrid.module.css.

import { memo } from 'react';

import styles from './SudokuGrid.module.css';

const allDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function subtract(set, hidden) {
  if (hidden.size === 0) return set;
  let result = set;
  hidden.toArray().forEach((d) => {
    result = result.delete(d);
  });
  return result;
}

function combinedInner(cell) {
  // Round-10: engineInner (written by applyCalculateCandidates) joins
  // the union so it surfaces in the grid alongside the player's
  // manual centres. The classifier paints them in the auto colour
  // because they're not in the innerPencils manual set.
  const union = cell
    .get('innerPencils')
    .union(cell.get('autoInner'))
    .union(cell.get('engineInner'));
  return subtract(union, cell.get('userHiddenInner'));
}

function combinedOuter(cell) {
  const union = cell.get('outerPencils').union(cell.get('autoOuter'));
  return subtract(union, cell.get('userHiddenOuter'));
}

function shouldBoldInner(pm) {
  return pm.size > 0 && pm.size < 3;
}

// markUser  → digit is in the manual set (player typed it via the numpad).
// markAuto  → digit sourced from any non-manual layer (autoInner /
//             autoOuter / engineInner). User wins if both apply.
function classifySource(cell, digit, kind) {
  const manual = cell.get(kind === 'inner' ? 'innerPencils' : 'outerPencils');
  return manual.includes(digit) ? styles.markUser : styles.markAuto;
}

function SudokuCellOuterPencilMarks({ cell, dim, cellSize, offsets }) {
  const pm = combinedOuter(cell);
  if (cell.get('digit') !== '0' || pm.size === 0) {
    return null;
  }
  const fontSize = (28 * cellSize) / 100;
  const outerClass = shouldBoldInner(pm)
    ? `${styles.outerPencil} ${styles.boldInner}`
    : styles.outerPencil;
  let i = 0;
  const marks = allDigits
    .filter((d) => pm.includes(d))
    .map((d) => {
      const offset = offsets[i++];
      return (
        <text
          key={offset.key}
          className={classifySource(cell, d, 'outer')}
          x={dim.x + offset.x}
          y={dim.y + offset.y}
          fontSize={fontSize}
          textAnchor="middle"
        >
          {d}
        </text>
      );
    });
  return <g className={outerClass}>{marks}</g>;
}

function SudokuCellInnerPencilMarks({ cell, dim, cellSize }) {
  const pm = combinedInner(cell);
  if (cell.get('digit') !== '0' || pm.size === 0) {
    return null;
  }
  const fontSize = (28 * cellSize) / 100;
  const className = shouldBoldInner(pm)
    ? `${styles.innerPencil} ${styles.boldInner}`
    : styles.innerPencil;
  // Inner marks render as a single text element with one tspan per
  // visible digit, each carrying its own user/auto class. SVG tspans
  // inherit the parent text's positioning so the glyphs still join
  // into one centred row.
  const visibleDigits = allDigits.filter((d) => pm.includes(d));
  return (
    <text
      className={className}
      x={dim.x + (49 * cellSize) / 100}
      y={dim.y + (61 * cellSize) / 100}
      fontSize={fontSize}
      textAnchor="middle"
    >
      {visibleDigits.map((d) => (
        <tspan key={d} className={classifySource(cell, d, 'inner')}>
          {d}
        </tspan>
      ))}
    </text>
  );
}

function SudokuCellPencilMarks({ cell, dim, cellSize, pencilOffsets }) {
  return (
    <>
      <SudokuCellOuterPencilMarks cell={cell} dim={dim} cellSize={cellSize} offsets={pencilOffsets} />
      <SudokuCellInnerPencilMarks cell={cell} dim={dim} cellSize={cellSize} />
    </>
  );
}

export default memo(SudokuCellPencilMarks);
