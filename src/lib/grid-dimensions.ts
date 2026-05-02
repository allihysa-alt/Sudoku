/* eslint-disable */
// @ts-nocheck
// Phase 5 — verbatim port from the CRA blueprint at
// C:\Users\ismoo\Desktop\sudoku-web-app-master\src\components\sudoku-grid\grid-dimensions.js.
// Pure-math module, no DOM. Used by SudokuGrid for the SVG viewBox /
// per-cell rect dimensions.

function calculateGridDimensions(cellSize, marginSize, fontSize) {
    const scaledFontSize = fontSize * cellSize / 100;
    // A weird bit of linear algebra that seems to be necessary to vertically centre
    // text of different sizes in the default sans-serif font on my dev platform :-/
    const scaledTextOffset = Math.floor(cellSize * (51 + (fontSize * -8) / 12) / 100);
    const cells = [...Array(81).keys()].map((v, index) => {
        const row = Math.floor(index / 9) + 1;
        const col = (index % 9) + 1;
        const box = Math.floor((row - 1) / 3) * 3 + Math.floor((col - 1) / 3) + 1;
        const ring = 5 - Math.max(Math.abs(5 - row), Math.abs(5 - col));
        const x = marginSize + (col - 1) * cellSize;
        const y = marginSize + (row - 1) * cellSize;
        return {
            index,
            row,
            col,
            box,
            ring,
            location: `R${row}C${col}`,
            x,
            y,
            textX: x + (cellSize / 2),
            textY: y + scaledFontSize + scaledTextOffset,
            dragCoverPoints: cellDragCoverPoints(x, y, cellSize),
        };
    });
    const borderInset = 5 * cellSize / 100;
    const dim = {
        cellSize,
        marginSize,
        fontSize: scaledFontSize,
        width: (marginSize * 2) + (cellSize * 9),
        height: (marginSize * 2) + (cellSize * 9),
        cell: cells,
        outerPencilOffsets: [
            { key: 'tl', x: 18 * cellSize / 100, y: 30 * cellSize / 100 },
            { key: 'tr', x: 80 * cellSize / 100, y: 30 * cellSize / 100 },
            { key: 'bl', x: 18 * cellSize / 100, y: 90 * cellSize / 100 },
            { key: 'br', x: 80 * cellSize / 100, y: 90 * cellSize / 100 },
            { key: 'tc', x: 49 * cellSize / 100, y: 30 * cellSize / 100 },
            { key: 'bc', x: 49 * cellSize / 100, y: 90 * cellSize / 100 },
            { key: 'cl', x: 18 * cellSize / 100, y: 60 * cellSize / 100 },
            { key: 'cr', x: 80 * cellSize / 100, y: 60 * cellSize / 100 },
            { key: 'cc', x: 49 * cellSize / 100, y: 60 * cellSize / 100 },
        ],
        simplePencilOffsets: {
            '1': { x: 18 * cellSize / 100, y: 30 * cellSize / 100 },
            '2': { x: 49 * cellSize / 100, y: 30 * cellSize / 100 },
            '3': { x: 80 * cellSize / 100, y: 30 * cellSize / 100 },
            '4': { x: 18 * cellSize / 100, y: 60 * cellSize / 100 },
            '5': { x: 49 * cellSize / 100, y: 60 * cellSize / 100 },
            '6': { x: 80 * cellSize / 100, y: 60 * cellSize / 100 },
            '7': { x: 18 * cellSize / 100, y: 90 * cellSize / 100 },
            '8': { x: 49 * cellSize / 100, y: 90 * cellSize / 100 },
            '9': { x: 80 * cellSize / 100, y: 90 * cellSize / 100 },
        },
        outlinePoints: [
            [ cellSize - borderInset, borderInset ],
            [ cellSize - borderInset, cellSize - borderInset ],
            [ borderInset, cellSize - borderInset ],
            [ borderInset, borderInset ],
        ],
    };
    return dim;
}

// QA-3 (#34): a viewport that is at least 720×720 deserves the
// side-by-side desktop layout regardless of the width-vs-height
// ratio. iPad portrait (768×1024) is the canonical case — the prior
// "width > height ⇒ landscape" rule kicked it into the portrait
// (stacked) path, which left the board pinched. The helper below
// returns 'landscape' for any sufficiently large viewport, falling
// back to the legacy comparator for narrower viewports.
export function chooseOrientation(width, height) {
    if (width >= 720 && height >= 720) {
        return 'landscape';
    }
    return width > height ? 'landscape' : 'portrait';
}

// QA-3 (#35): cap the play surface so the board doesn't balloon
// across a 27" 4K monitor. Beyond the cap, surrounding chrome
// (status-bar, CTAs) can grow but the play surface stays
// app-sized — appropriate eye-distance to the numerics is
// maintained at any monitor size. The keypad gets a tighter cap
// at 480 px to keep the side-by-side proportions readable.
export const PLAY_SURFACE_CAPS = {
    boardMax: 720,
    keypadMax: 480,
};

export function clampPlayDimensions(dim) {
    const { boardMax, keypadMax } = PLAY_SURFACE_CAPS;
    if (dim.gridLength > boardMax) {
        dim.gridLength = boardMax;
    }
    if (dim.vkbdWidth > keypadMax) {
        dim.vkbdWidth = keypadMax;
    }
    return dim;
}

function cellDragCoverPoints(x, y, cellSize) {
    const d1 = cellSize * 0.1;
    const d2 = cellSize * 0.3;
    const xa = x + d1;
    const xb = x + d2;
    const xc = x + cellSize - d2;
    const xd = x + cellSize - d1;
    const ya = y + d1;
    const yb = y + d2;
    const yc = y + cellSize - d2;
    const yd = y + cellSize - d1;
    return `${xb},${ya} ${xc},${ya} ${xd},${yb} ${xd},${yc} ${xc},${yd} ${xb},${yd} ${xa},${yc} ${xa},${yb}`;
}
export default calculateGridDimensions;
