/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from CRA
// src/components/sudoku-grid/grid-lines.js. CSS class names mapped to
// the consolidated SudokuGrid.module.css.

import styles from './SudokuGrid.module.css';

function stopPropagation(e) {
  e.stopPropagation();
}

function GridLines({ cellSize, marginSize }) {
  const gridLength = 9 * cellSize;

  const fineLines = [1, 2, 4, 5, 7, 8]
    .map((i) => {
      const offSet = marginSize + i * cellSize;
      return `M ${marginSize} ${offSet} h ${gridLength} M ${offSet} ${marginSize} v ${gridLength}`;
    })
    .join(' ');
  const boldLines = [3, 6]
    .map((i) => {
      const offSet = marginSize + i * cellSize;
      return `M ${marginSize} ${offSet} h ${gridLength} M ${offSet} ${marginSize} v ${gridLength}`;
    })
    .join(' ');
  return (
    <g>
      <path className={styles.line} d={fineLines} onMouseDown={stopPropagation} />
      <path className={styles.lineBold} d={boldLines} onMouseDown={stopPropagation} />
      {/* QA-3 (#17): outer frame uses its own class so the rect can be
          a touch stronger than the inner 3x3 separators. */}
      <rect
        className={styles.lineOuter}
        x={marginSize}
        y={marginSize}
        width={gridLength}
        height={gridLength}
        fill="transparent"
        onMouseDown={stopPropagation}
      />
    </g>
  );
}

export default GridLines;
