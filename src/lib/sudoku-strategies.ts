/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port from the CRA blueprint at
// C:\\Users\\ismoo\\Desktop\\sudoku-web-app-master\\src\\lib\\sudoku-strategies.js.

// Client-side hint engine for Sudoku.
//
// Implements common solving strategies (Naked Single, Hidden Single,
// Locked Candidates, Naked Pair, Hidden Pair, X-Wing, XY-Wing,
// Swordfish) and exposes `computeAnalysis(initialDigits)` which
// returns an analysis object in exactly the shape the existing
// SudokuExplainer (src/lib/sudoku-explainer.js) expects from the
// network /explain/<digits> backend:
//
//   {
//     id: <81-char string of initial digits>,
//     fd: <81-char string of finally-solved digits>,
//     rt: <overall puzzle rating, e.g. "1.5">,
//     ss: [
//       { di: <cell index>, rt, sd, ht, hi? },          // place a digit
//       { ec: { digit: [cell indexes] }, rt, sd, ht, hi? }, // eliminate candidates
//       ...
//     ]
//   }
//
// Cell indexes are 0-80 (row-major). The strategies are tried in order of
// rising difficulty; when none fires we fall back to a brute-force solve
// (using the precomputed `fd`) so the user always gets a hint.

const ALL_DIGITS = '123456789';

// ---------- Unit / peer precomputation ----------

function buildUnits() {
    const units = []; // 27 units: 9 rows, 9 cols, 9 boxes
    for (let r = 0; r < 9; r++) {
        const row = [];
        for (let c = 0; c < 9; c++) row.push(r * 9 + c);
        units.push(row);
    }
    for (let c = 0; c < 9; c++) {
        const col = [];
        for (let r = 0; r < 9; r++) col.push(r * 9 + c);
        units.push(col);
    }
    for (let b = 0; b < 9; b++) {
        const box = [];
        const br = Math.floor(b / 3) * 3;
        const bc = (b % 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                box.push((br + dr) * 9 + (bc + dc));
            }
        }
        units.push(box);
    }
    return units;
}

const UNITS = buildUnits();

function rowOf(i) { return Math.floor(i / 9); }
function colOf(i) { return i % 9; }
function boxOf(i) { return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3); }
function rcLabel(i) { return `R${rowOf(i) + 1}C${colOf(i) + 1}`; }

// Round-11 (2026-05-01): precomputed peer table — for each cell, the
// 20 cells that share its row, column, or box (excluding the cell
// itself). Used by applyStep's incremental candidate update on a
// digit placement: rather than recomputing every cell's candidate
// set from scratch via computeCandidates, we just remove the placed
// digit from each peer's candidate string. ~15-20× faster per place
// step in rateDifficulty and computeAnalysis.
function buildPeers() {
    const peers = new Array(81);
    for (let i = 0; i < 81; i++) {
        const set = new Set();
        const r = rowOf(i), c = colOf(i);
        for (let j = 0; j < 9; j++) {
            set.add(r * 9 + j);
            set.add(j * 9 + c);
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                set.add((br + dr) * 9 + (bc + dc));
            }
        }
        set.delete(i);
        peers[i] = [...set];
    }
    return peers;
}

const PEERS = buildPeers();

// Module-level helpers used by the post-G-04 strategies (subset-3/4,
// fish, single-digit chains, W-Wing). xyWing has its own inline
// `isPeer` lambda that predates this module-level version — left
// untouched to keep that strategy's diff history clean.
function isPeer(a, b) {
    if (a === b) return false;
    return rowOf(a) === rowOf(b)
        || colOf(a) === colOf(b)
        || boxOf(a) === boxOf(b);
}

function combinations(arr, k) {
    const result = [];
    const recur = (start, combo) => {
        if (combo.length === k) {
            result.push(combo.slice());
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            recur(i + 1, combo);
            combo.pop();
        }
    };
    recur(0, []);
    return result;
}

function unionCandidateString(strings) {
    const set = new Set();
    for (const s of strings) for (const c of s) set.add(c);
    return [...set].sort().join('');
}

function unitNameOf(u) {
    return u < 9 ? `row ${u + 1}`
        : u < 18 ? `column ${u - 9 + 1}`
        : `block ${u - 18 + 1}`;
}

// ---------- Candidate computation ----------

export function computeCandidates(digits) {
    const cands = new Array(81);
    for (let i = 0; i < 81; i++) {
        if (digits[i] !== '0') {
            cands[i] = '';
            continue;
        }
        const r = rowOf(i), c = colOf(i);
        const used = new Set();
        for (let j = 0; j < 9; j++) {
            used.add(digits[r * 9 + j]);
            used.add(digits[j * 9 + c]);
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
                used.add(digits[(br + dr) * 9 + (bc + dc)]);
            }
        }
        used.delete('0');
        let s = '';
        for (const d of ALL_DIGITS) if (!used.has(d)) s += d;
        cands[i] = s;
    }
    return cands;
}

// ---------- Brute-force solver (used for fd + uniqueness) ----------

function solveBacktrack(digits, stopAfter) {
    // Returns number of solutions found (capped at `stopAfter`, default 1).
    // If stopAfter === 1 and a solution exists, mutates `digits` to that solution.
    stopAfter = stopAfter || 1;
    const work = digits.slice();
    let count = 0;
    let firstSolution = null;

    function helper() {
        let pos = -1, bestCount = 10, bestUsed = null;
        for (let i = 0; i < 81; i++) {
            if (work[i] !== '0') continue;
            const r = rowOf(i), c = colOf(i);
            const used = new Set();
            for (let j = 0; j < 9; j++) {
                used.add(work[r * 9 + j]);
                used.add(work[j * 9 + c]);
            }
            const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
            for (let dr = 0; dr < 3; dr++) {
                for (let dc = 0; dc < 3; dc++) {
                    used.add(work[(br + dr) * 9 + (bc + dc)]);
                }
            }
            used.delete('0');
            const cnt = 9 - used.size;
            if (cnt < bestCount) {
                bestCount = cnt;
                pos = i;
                bestUsed = used;
                if (cnt === 0) return false; // contradiction
                if (cnt === 1) break;
            }
        }
        if (pos === -1) {
            count++;
            if (firstSolution === null) firstSolution = work.slice();
            return count >= stopAfter;
        }
        for (const d of ALL_DIGITS) {
            if (!bestUsed.has(d)) {
                work[pos] = d;
                if (helper()) return true;
            }
        }
        work[pos] = '0';
        return false;
    }
    helper();
    if (count > 0 && stopAfter === 1) {
        for (let i = 0; i < 81; i++) digits[i] = firstSolution[i];
    }
    return count;
}

export function bruteForceSolve(initialDigits) {
    const arr = initialDigits.split('');
    if (solveBacktrack(arr, 1) === 1) return arr.join('');
    return null;
}

export function countSolutions(initialDigits, cap) {
    return solveBacktrack(initialDigits.split(''), cap || 2);
}

// ---------- Step application ----------

// Round-11 (2026-05-01): place-step path used to call
// computeCandidates(digits) which rebuilds all 81 cells' candidate
// sets from scratch — O(81 × 27) Set ops. Incremental update is
// O(20) string ops: zero the placed cell, remove the placed digit
// from each of the cell's 20 peers. The invariant assumed by callers
// (rateDifficulty, computeAnalysis) is that `state.candidates` is
// correct *before* applyStep runs; both call sites initialise via
// computeCandidates, then chain applyStep, so this holds.
function applyStep(state, step) {
    if (step.kind === 'place') {
        const digits = state.digits.slice();
        digits[step.cell] = step.digit;
        const candidates = state.candidates.slice();
        candidates[step.cell] = '';
        const placed = step.digit;
        for (const p of PEERS[step.cell]) {
            const cs = candidates[p];
            if (cs && cs.indexOf(placed) !== -1) {
                candidates[p] = cs.replace(placed, '');
            }
        }
        return { digits, candidates };
    } else {
        const candidates = state.candidates.slice();
        for (const d in step.removed) {
            for (const cell of step.removed[d]) {
                candidates[cell] = candidates[cell].replace(d, '');
            }
        }
        return { digits: state.digits, candidates };
    }
}

// ---------- Strategies ----------

function nakedSingle(state) {
    const { digits, candidates } = state;
    for (let i = 0; i < 81; i++) {
        if (digits[i] === '0' && candidates[i].length === 1) {
            const d = candidates[i];
            return {
                kind: 'place',
                cell: i,
                digit: d,
                rating: 1.0,
                title: `Naked Single: ${rcLabel(i)}: ${d}`,
                nudgeTitle: 'Naked Single',
                nudge: "There's a Naked Single waiting somewhere on the board. One cell has only one possible candidate.",
                html: `<p>Cell <span class="rc-hot-spot" data-cell-index="${i}">${rcLabel(i)}</span> has only one possible candidate: <strong>${d}</strong>.</p>`,
            };
        }
    }
    return null;
}

function hiddenSingle(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const unitName = u < 9 ? 'row' : u < 18 ? 'column' : 'block';
        for (const d of ALL_DIGITS) {
            const possible = unit.filter(c => candidates[c].includes(d));
            if (possible.length === 1) {
                const cell = possible[0];
                if (candidates[cell].length === 1) continue; // covered by Naked Single
                return {
                    kind: 'place',
                    cell,
                    digit: d,
                    rating: 1.2,
                    title: `Hidden Single: ${rcLabel(cell)}: ${d} in ${unitName}`,
                    nudgeTitle: `Hidden Single in this ${unitName}`,
                    nudge: `There's a Hidden Single in this ${unitName}. One digit has only one place it can go.`,
                    html: `<p>Cell <span class="rc-hot-spot" data-cell-index="${cell}">${rcLabel(cell)}</span> is the only possible position for <strong>${d}</strong> in this ${unitName}.</p>`,
                    highlight: [cell],
                };
            }
        }
    }
    return null;
}

function lockedCandidates(state) {
    const { candidates } = state;

    // Pointing: in a box, digit's candidates are confined to a single row/col
    for (let b = 0; b < 9; b++) {
        const box = UNITS[18 + b];
        for (const d of ALL_DIGITS) {
            const cells = box.filter(c => candidates[c].includes(d));
            if (cells.length < 2) continue;
            const rows = new Set(cells.map(rowOf));
            const cols = new Set(cells.map(colOf));
            if (rows.size === 1) {
                const r = [...rows][0];
                const targets = UNITS[r].filter(c => !cells.includes(c) && candidates[c].includes(d));
                if (targets.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [d]: targets },
                        highlight: cells,
                        rating: 2.6,
                        title: `Pointing: ${d} in row ${r + 1} (block ${b + 1})`,
                        nudgeTitle: `Pointing in block ${b + 1}`,
                        nudge: `In block ${b + 1}, a digit's positions line up in a single row. That lets you eliminate it from the rest of that row.`,
                        html: `<p>In block ${b + 1}, the digit <strong>${d}</strong> can only appear in row ${r + 1}, so it can be eliminated from the rest of that row.</p>`,
                    };
                }
            }
            if (cols.size === 1) {
                const c = [...cols][0];
                const targets = UNITS[9 + c].filter(cell => !cells.includes(cell) && candidates[cell].includes(d));
                if (targets.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [d]: targets },
                        highlight: cells,
                        rating: 2.6,
                        title: `Pointing: ${d} in column ${c + 1} (block ${b + 1})`,
                        nudgeTitle: `Pointing in block ${b + 1}`,
                        nudge: `In block ${b + 1}, a digit's positions line up in a single column. That lets you eliminate it from the rest of that column.`,
                        html: `<p>In block ${b + 1}, the digit <strong>${d}</strong> can only appear in column ${c + 1}, so it can be eliminated from the rest of that column.</p>`,
                    };
                }
            }
        }
    }

    // Claiming: in a row/col, digit's candidates are confined to a single box
    for (let r = 0; r < 9; r++) {
        for (const d of ALL_DIGITS) {
            const cells = UNITS[r].filter(c => candidates[c].includes(d));
            if (cells.length < 2) continue;
            const boxes = new Set(cells.map(boxOf));
            if (boxes.size === 1) {
                const b = [...boxes][0];
                const targets = UNITS[18 + b].filter(c => !cells.includes(c) && candidates[c].includes(d));
                if (targets.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [d]: targets },
                        highlight: cells,
                        rating: 2.8,
                        title: `Claiming: ${d} in row ${r + 1} (block ${b + 1})`,
                        nudgeTitle: `Claiming in row ${r + 1}`,
                        nudge: `In row ${r + 1}, a digit's positions all sit inside one block. That lets you eliminate it from the rest of that block.`,
                        html: `<p>In row ${r + 1}, the digit <strong>${d}</strong> can only appear in block ${b + 1}, so it can be eliminated from the rest of that block.</p>`,
                    };
                }
            }
        }
    }
    for (let c = 0; c < 9; c++) {
        for (const d of ALL_DIGITS) {
            const cells = UNITS[9 + c].filter(cell => candidates[cell].includes(d));
            if (cells.length < 2) continue;
            const boxes = new Set(cells.map(boxOf));
            if (boxes.size === 1) {
                const b = [...boxes][0];
                const targets = UNITS[18 + b].filter(cell => !cells.includes(cell) && candidates[cell].includes(d));
                if (targets.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [d]: targets },
                        highlight: cells,
                        rating: 2.8,
                        title: `Claiming: ${d} in column ${c + 1} (block ${b + 1})`,
                        nudgeTitle: `Claiming in column ${c + 1}`,
                        nudge: `In column ${c + 1}, a digit's positions all sit inside one block. That lets you eliminate it from the rest of that block.`,
                        html: `<p>In column ${c + 1}, the digit <strong>${d}</strong> can only appear in block ${b + 1}, so it can be eliminated from the rest of that block.</p>`,
                    };
                }
            }
        }
    }
    return null;
}

function nakedPair(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const unitName = u < 9 ? `row ${u + 1}` : u < 18 ? `column ${u - 9 + 1}` : `block ${u - 18 + 1}`;
        const twoCandCells = unit.filter(c => candidates[c].length === 2);
        for (let i = 0; i < twoCandCells.length; i++) {
            for (let j = i + 1; j < twoCandCells.length; j++) {
                const a = twoCandCells[i], b = twoCandCells[j];
                if (candidates[a] !== candidates[b]) continue;
                const cands = candidates[a].split('');
                const eliminations = {};
                let any = false;
                for (const d of cands) {
                    const targets = unit.filter(c => c !== a && c !== b && candidates[c].includes(d));
                    if (targets.length > 0) {
                        eliminations[d] = targets;
                        any = true;
                    }
                }
                if (any) {
                    return {
                        kind: 'eliminate',
                        removed: eliminations,
                        highlight: [a, b],
                        rating: 3.0,
                        title: `Naked Pair: {${candidates[a]}} in ${unitName}`,
                        nudgeTitle: `Naked Pair in ${unitName}`,
                        nudge: `There's a Naked Pair in this ${unitName}. Two cells together hold only two digits — those digits can be cleared elsewhere in the unit.`,
                        html: `<p>Cells <span class="rc-hot-spot" data-cell-index="${a}">${rcLabel(a)}</span> and <span class="rc-hot-spot" data-cell-index="${b}">${rcLabel(b)}</span> together can only hold ${cands.join(' and ')}, so those digits can be removed from other cells in this ${unitName}.</p>`,
                    };
                }
            }
        }
    }
    return null;
}

function hiddenPair(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const unitName = u < 9 ? `row ${u + 1}` : u < 18 ? `column ${u - 9 + 1}` : `block ${u - 18 + 1}`;
        const where = {};
        for (const d of ALL_DIGITS) {
            where[d] = unit.filter(c => candidates[c].includes(d));
        }
        const twoCellDigits = ALL_DIGITS.split('').filter(d => where[d].length === 2);
        for (let i = 0; i < twoCellDigits.length; i++) {
            for (let j = i + 1; j < twoCellDigits.length; j++) {
                const d1 = twoCellDigits[i], d2 = twoCellDigits[j];
                const c1 = where[d1], c2 = where[d2];
                if (c1[0] !== c2[0] || c1[1] !== c2[1]) continue;
                const a = c1[0], b = c1[1];
                const eliminations = {};
                let any = false;
                for (const d of ALL_DIGITS) {
                    if (d === d1 || d === d2) continue;
                    const targets = [a, b].filter(c => candidates[c].includes(d));
                    if (targets.length > 0) {
                        eliminations[d] = targets;
                        any = true;
                    }
                }
                if (any) {
                    return {
                        kind: 'eliminate',
                        removed: eliminations,
                        highlight: [a, b],
                        rating: 3.4,
                        title: `Hidden Pair: ${d1}${d2} in ${unitName}`,
                        nudgeTitle: `Hidden Pair in ${unitName}`,
                        nudge: `There's a Hidden Pair in this ${unitName}. Two digits can only appear in two cells — try to find them.`,
                        html: `<p>In ${unitName}, the digits <strong>${d1}</strong> and <strong>${d2}</strong> can only appear in cells <span class="rc-hot-spot" data-cell-index="${a}">${rcLabel(a)}</span> and <span class="rc-hot-spot" data-cell-index="${b}">${rcLabel(b)}</span>, so other candidates can be removed from those two cells.</p>`,
                    };
                }
            }
        }
    }
    return null;
}

function xWing(state) {
    const { candidates } = state;
    for (const d of ALL_DIGITS) {
        // Row-based X-Wing
        const byCols = {};
        for (let r = 0; r < 9; r++) {
            const cells = UNITS[r].filter(c => candidates[c].includes(d));
            if (cells.length === 2) {
                const key = cells.map(colOf).sort().join(',');
                (byCols[key] = byCols[key] || []).push({ row: r, cells });
            }
        }
        for (const key in byCols) {
            if (byCols[key].length >= 2) {
                const [a, b] = byCols[key];
                const cols = key.split(',').map(Number);
                const elim = [];
                for (const c of cols) {
                    for (const cell of UNITS[9 + c]) {
                        const r = rowOf(cell);
                        if (r !== a.row && r !== b.row && candidates[cell].includes(d)) {
                            elim.push(cell);
                        }
                    }
                }
                if (elim.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [d]: elim },
                        highlight: [...a.cells, ...b.cells],
                        rating: 4.2,
                        title: `X-Wing: ${d} in rows ${a.row + 1} & ${b.row + 1}`,
                        nudgeTitle: `X-Wing on digit ${d}`,
                        nudge: `There's an X-Wing on digit ${d}. Try to find the rectangle of candidates spanning two rows and two columns.`,
                        html: `<p>The digit <strong>${d}</strong> forms an X-Wing in rows ${a.row + 1} and ${b.row + 1} (columns ${cols.map(c => c + 1).join(' & ')}). It can be eliminated from those columns elsewhere.</p>`,
                    };
                }
            }
        }
        // Column-based X-Wing
        const byRows = {};
        for (let c = 0; c < 9; c++) {
            const cells = UNITS[9 + c].filter(cell => candidates[cell].includes(d));
            if (cells.length === 2) {
                const key = cells.map(rowOf).sort().join(',');
                (byRows[key] = byRows[key] || []).push({ col: c, cells });
            }
        }
        for (const key in byRows) {
            if (byRows[key].length >= 2) {
                const [a, b] = byRows[key];
                const rows = key.split(',').map(Number);
                const elim = [];
                for (const r of rows) {
                    for (const cell of UNITS[r]) {
                        const c = colOf(cell);
                        if (c !== a.col && c !== b.col && candidates[cell].includes(d)) {
                            elim.push(cell);
                        }
                    }
                }
                if (elim.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [d]: elim },
                        highlight: [...a.cells, ...b.cells],
                        rating: 4.2,
                        title: `X-Wing: ${d} in columns ${a.col + 1} & ${b.col + 1}`,
                        nudgeTitle: `X-Wing on digit ${d}`,
                        nudge: `There's an X-Wing on digit ${d}. Try to find the rectangle of candidates spanning two columns and two rows.`,
                        html: `<p>The digit <strong>${d}</strong> forms an X-Wing in columns ${a.col + 1} and ${b.col + 1} (rows ${rows.map(r => r + 1).join(' & ')}). It can be eliminated from those rows elsewhere.</p>`,
                    };
                }
            }
        }
    }
    return null;
}

// G-04 — XY-Wing.
//
// A bivalue-cell chain. A pivot cell holds candidates {X, Y}. Two
// pincer cells, both peers of the pivot, hold {X, Z} and {Y, Z} for
// some third digit Z. Whichever digit the pivot eventually takes,
// exactly one pincer is forced to Z. Therefore any cell that is a
// peer of BOTH pincers (and thus would conflict with whichever pincer
// holds Z) cannot itself be Z.
//
// Implementation walks every bivalue cell as a candidate pivot, then
// looks for two bivalue peers that satisfy the {pivX,Z}/{pivY,Z}
// shape. We require Z to differ from both pivot digits, which weeds
// out the degenerate "same digit" pairings that some references
// classify as XY-wings but which other techniques (naked pair,
// locked candidates) already handle.
export function xyWing(state) {
    const { candidates } = state;

    const isPeer = (a, b) => a !== b && (
        rowOf(a) === rowOf(b) ||
        colOf(a) === colOf(b) ||
        boxOf(a) === boxOf(b)
    );

    const bivalues = [];
    for (let i = 0; i < 81; i++) {
        if (candidates[i].length === 2) bivalues.push(i);
    }

    for (const pivot of bivalues) {
        const [pivX, pivY] = candidates[pivot].split('');
        const peerBivalues = bivalues.filter(b => isPeer(pivot, b));

        for (const p1 of peerBivalues) {
            const p1Cands = candidates[p1];
            const p1HasX = p1Cands.includes(pivX);
            const p1HasY = p1Cands.includes(pivY);
            // p1 must share exactly one digit with pivot — both or
            // neither rules p1 out as a pincer.
            if (p1HasX === p1HasY) continue;
            const sharedFromPivot = p1HasX ? pivX : pivY;
            const Z = p1Cands.replace(sharedFromPivot, '');
            // Z must be a fresh third digit, distinct from both
            // pivot candidates.
            if (Z === pivX || Z === pivY) continue;
            const otherPivotDigit = (sharedFromPivot === pivX) ? pivY : pivX;

            for (const p2 of peerBivalues) {
                if (p2 === p1) continue;
                const p2Cands = candidates[p2];
                if (!p2Cands.includes(otherPivotDigit)) continue;
                if (!p2Cands.includes(Z)) continue;
                // Now {pivot, p1, p2} = {pivX/pivY, sharedFromPivot/Z,
                // otherPivotDigit/Z} — a textbook XY-wing.

                const targets = [];
                for (let i = 0; i < 81; i++) {
                    if (i === pivot || i === p1 || i === p2) continue;
                    if (!candidates[i].includes(Z)) continue;
                    if (isPeer(i, p1) && isPeer(i, p2)) targets.push(i);
                }
                if (targets.length > 0) {
                    return {
                        kind: 'eliminate',
                        removed: { [Z]: targets },
                        highlight: [pivot, p1, p2],
                        rating: 4.4,
                        title: `XY-Wing: pivot ${rcLabel(pivot)} (${pivX}${pivY}), pincers ${rcLabel(p1)} & ${rcLabel(p2)} — eliminate ${Z}`,
                        nudgeTitle: 'XY-Wing',
                        nudge: "There's an XY-Wing somewhere on the board. Look for three bivalue cells forming a chain through a third digit.",
                        html:
                            `<p>The cell <span class="rc-hot-spot" data-cell-index="${pivot}">${rcLabel(pivot)}</span> ` +
                            `holds the two candidates <strong>${pivX}</strong> and <strong>${pivY}</strong>. ` +
                            `Whichever digit ends up there, one of its bivalue peers — ` +
                            `<span class="rc-hot-spot" data-cell-index="${p1}">${rcLabel(p1)}</span> (${sharedFromPivot}${Z}) ` +
                            `or <span class="rc-hot-spot" data-cell-index="${p2}">${rcLabel(p2)}</span> (${otherPivotDigit}${Z}) — ` +
                            `is forced to be <strong>${Z}</strong>. ` +
                            `Any cell that sees both pincers therefore cannot be ${Z}.</p>`,
                    };
                }
            }
        }
    }
    return null;
}

// G-04 — Swordfish.
//
// A 3-row (or 3-column) fish, generalising X-Wing from 2 to 3. For
// some digit D, find 3 rows whose candidate positions for D — each
// row holding 2 or 3 such positions — collectively fit within
// exactly 3 columns. Then in those 3 columns, D must occupy one
// cell per row from the chosen row-set, so D can be eliminated
// from any other cell in those 3 columns.
//
// The inverse formulation (3 columns whose candidate positions fit
// within 3 rows) is checked symmetrically. Sticks closely to the
// X-Wing implementation just above — same shape, one extra loop
// level for the 3-row / 3-column combination search.
//
// Rows holding only a single candidate are excluded from the
// detection. A length-1 row would be a hidden single — already
// covered upstream — and including it here would let trivial
// arrangements parade as "Swordfish" eliminations.
export function swordfish(state) {
    const { candidates } = state;
    for (const d of ALL_DIGITS) {
        // Row-based Swordfish.
        const rowsInfo = [];
        for (let r = 0; r < 9; r++) {
            const cells = UNITS[r].filter(c => candidates[c].includes(d));
            if (cells.length >= 2 && cells.length <= 3) {
                rowsInfo.push({ row: r, cells, cols: cells.map(colOf) });
            }
        }
        for (let i = 0; i < rowsInfo.length - 2; i++) {
            for (let j = i + 1; j < rowsInfo.length - 1; j++) {
                for (let k = j + 1; k < rowsInfo.length; k++) {
                    const a = rowsInfo[i], b = rowsInfo[j], c = rowsInfo[k];
                    const colSet = new Set([...a.cols, ...b.cols, ...c.cols]);
                    if (colSet.size !== 3) continue;
                    const cols = [...colSet].sort((x, y) => x - y);
                    const elim = [];
                    for (const col of cols) {
                        for (const cell of UNITS[9 + col]) {
                            const r = rowOf(cell);
                            if (r === a.row || r === b.row || r === c.row) continue;
                            if (candidates[cell].includes(d)) elim.push(cell);
                        }
                    }
                    if (elim.length > 0) {
                        return {
                            kind: 'eliminate',
                            removed: { [d]: elim },
                            highlight: [...a.cells, ...b.cells, ...c.cells],
                            rating: 4.6,
                            title: `Swordfish: ${d} in rows ${a.row + 1}, ${b.row + 1} & ${c.row + 1}`,
                            nudgeTitle: `Swordfish on digit ${d}`,
                            nudge: `There's a Swordfish on digit ${d}. Three rows where ${d}'s positions fit into three columns.`,
                            html:
                                `<p>The digit <strong>${d}</strong> forms a Swordfish in rows ${a.row + 1}, ${b.row + 1}, and ${c.row + 1} — every position for ${d} in those rows lies in columns ${cols.map(x => x + 1).join(', ')}. ` +
                                `One cell in each of those rows must hold ${d}, so ${d} can be eliminated from the rest of those three columns.</p>`,
                        };
                    }
                }
            }
        }
        // Column-based Swordfish.
        const colsInfo = [];
        for (let c = 0; c < 9; c++) {
            const cells = UNITS[9 + c].filter(cell => candidates[cell].includes(d));
            if (cells.length >= 2 && cells.length <= 3) {
                colsInfo.push({ col: c, cells, rows: cells.map(rowOf) });
            }
        }
        for (let i = 0; i < colsInfo.length - 2; i++) {
            for (let j = i + 1; j < colsInfo.length - 1; j++) {
                for (let k = j + 1; k < colsInfo.length; k++) {
                    const a = colsInfo[i], b = colsInfo[j], cc = colsInfo[k];
                    const rowSet = new Set([...a.rows, ...b.rows, ...cc.rows]);
                    if (rowSet.size !== 3) continue;
                    const rows = [...rowSet].sort((x, y) => x - y);
                    const elim = [];
                    for (const row of rows) {
                        for (const cell of UNITS[row]) {
                            const col = colOf(cell);
                            if (col === a.col || col === b.col || col === cc.col) continue;
                            if (candidates[cell].includes(d)) elim.push(cell);
                        }
                    }
                    if (elim.length > 0) {
                        return {
                            kind: 'eliminate',
                            removed: { [d]: elim },
                            highlight: [...a.cells, ...b.cells, ...cc.cells],
                            rating: 4.6,
                            title: `Swordfish: ${d} in columns ${a.col + 1}, ${b.col + 1} & ${cc.col + 1}`,
                            nudgeTitle: `Swordfish on digit ${d}`,
                            nudge: `There's a Swordfish on digit ${d}. Three columns where ${d}'s positions fit into three rows.`,
                            html:
                                `<p>The digit <strong>${d}</strong> forms a Swordfish in columns ${a.col + 1}, ${b.col + 1}, and ${cc.col + 1} — every position for ${d} in those columns lies in rows ${rows.map(x => x + 1).join(', ')}. ` +
                                `One cell in each of those columns must hold ${d}, so ${d} can be eliminated from the rest of those three rows.</p>`,
                        };
                    }
                }
            }
        }
    }
    return null;
}

// G-05 — Subset-3/4, single-digit chain, larger fish and W-Wing
// extensions. Each function returns the same step shape as the
// pre-existing strategies (kind, removed|cell+digit, highlight,
// rating, title, html with rc-hot-spot spans). Inserted into the
// STRATEGIES ladder in approximately ascending difficulty so the
// engine still picks the easiest applicable technique first.

// Naked Triplet — three cells in a unit whose combined candidate
// set is exactly three digits. Generalises Naked Pair to subsets of
// size 3. The three cells don't need to all carry the same three
// digits; any (2 or 3)-candidate cells whose union is size-3
// qualifies, e.g. {12}, {23}, {13}.
export function nakedTriplet(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const candCells = unit.filter(c => candidates[c].length >= 2 && candidates[c].length <= 3);
        for (const trio of combinations(candCells, 3)) {
            const union = unionCandidateString(trio.map(c => candidates[c]));
            if (union.length !== 3) continue;
            const cands = union.split('');
            const eliminations = {};
            let any = false;
            for (const d of cands) {
                const targets = unit.filter(c => !trio.includes(c) && candidates[c].includes(d));
                if (targets.length > 0) {
                    eliminations[d] = targets;
                    any = true;
                }
            }
            if (any) {
                return {
                    kind: 'eliminate',
                    removed: eliminations,
                    highlight: trio,
                    rating: 3.6,
                    title: `Naked Triplet: {${union}} in ${unitNameOf(u)}`,
                    nudgeTitle: `Naked Triplet in ${unitNameOf(u)}`,
                    nudge: `There's a Naked Triplet in this ${unitNameOf(u)}. Three cells together hold only three digits — those digits can be cleared elsewhere.`,
                    html:
                        `<p>Cells <span class="rc-hot-spot" data-cell-index="${trio[0]}">${rcLabel(trio[0])}</span>, ` +
                        `<span class="rc-hot-spot" data-cell-index="${trio[1]}">${rcLabel(trio[1])}</span> and ` +
                        `<span class="rc-hot-spot" data-cell-index="${trio[2]}">${rcLabel(trio[2])}</span> ` +
                        `together can only hold ${cands.join(', ')}, so those digits can be removed from other cells in this ${unitNameOf(u)}.</p>`,
                };
            }
        }
    }
    return null;
}

// Hidden Triplet — three digits whose only positions in a unit are
// confined to three cells. Mirrors the Hidden Pair generalisation
// to subsets of size 3. The three cells then cannot hold any other
// digit, so unrelated candidates can be cleared from them.
export function hiddenTriplet(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const where = {};
        for (const d of ALL_DIGITS) {
            where[d] = unit.filter(c => candidates[c].includes(d));
        }
        const eligible = ALL_DIGITS.split('').filter(d => where[d].length >= 2 && where[d].length <= 3);
        for (const trio of combinations(eligible, 3)) {
            const cellSet = new Set();
            trio.forEach(d => where[d].forEach(c => cellSet.add(c)));
            if (cellSet.size !== 3) continue;
            const cells = [...cellSet].sort((a, b) => a - b);
            const eliminations = {};
            let any = false;
            for (const d of ALL_DIGITS) {
                if (trio.includes(d)) continue;
                const targets = cells.filter(c => candidates[c].includes(d));
                if (targets.length > 0) {
                    eliminations[d] = targets;
                    any = true;
                }
            }
            if (any) {
                return {
                    kind: 'eliminate',
                    removed: eliminations,
                    highlight: cells,
                    rating: 4.0,
                    title: `Hidden Triplet: ${trio.join('')} in ${unitNameOf(u)}`,
                    nudgeTitle: `Hidden Triplet in ${unitNameOf(u)}`,
                    nudge: `There's a Hidden Triplet in this ${unitNameOf(u)}. Three digits can only appear in three cells — try to find them.`,
                    html:
                        `<p>In ${unitNameOf(u)}, the digits <strong>${trio.join('</strong>, <strong>')}</strong> ` +
                        `can only appear in cells <span class="rc-hot-spot" data-cell-index="${cells[0]}">${rcLabel(cells[0])}</span>, ` +
                        `<span class="rc-hot-spot" data-cell-index="${cells[1]}">${rcLabel(cells[1])}</span> and ` +
                        `<span class="rc-hot-spot" data-cell-index="${cells[2]}">${rcLabel(cells[2])}</span>, ` +
                        `so other candidates can be removed from those three cells.</p>`,
                };
            }
        }
    }
    return null;
}

// Naked Quad — four cells in a unit whose combined candidate set is
// exactly four digits. Generalises Naked Pair/Triplet to subsets of
// size 4.
export function nakedQuad(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const candCells = unit.filter(c => candidates[c].length >= 2 && candidates[c].length <= 4);
        for (const quad of combinations(candCells, 4)) {
            const union = unionCandidateString(quad.map(c => candidates[c]));
            if (union.length !== 4) continue;
            const cands = union.split('');
            const eliminations = {};
            let any = false;
            for (const d of cands) {
                const targets = unit.filter(c => !quad.includes(c) && candidates[c].includes(d));
                if (targets.length > 0) {
                    eliminations[d] = targets;
                    any = true;
                }
            }
            if (any) {
                return {
                    kind: 'eliminate',
                    removed: eliminations,
                    highlight: quad,
                    rating: 5.0,
                    title: `Naked Quad: {${union}} in ${unitNameOf(u)}`,
                    nudgeTitle: `Naked Quad in ${unitNameOf(u)}`,
                    nudge: `There's a Naked Quad in this ${unitNameOf(u)}. Four cells together hold only four digits — those digits can be cleared elsewhere.`,
                    html:
                        `<p>Cells <span class="rc-hot-spot" data-cell-index="${quad[0]}">${rcLabel(quad[0])}</span>, ` +
                        `<span class="rc-hot-spot" data-cell-index="${quad[1]}">${rcLabel(quad[1])}</span>, ` +
                        `<span class="rc-hot-spot" data-cell-index="${quad[2]}">${rcLabel(quad[2])}</span> and ` +
                        `<span class="rc-hot-spot" data-cell-index="${quad[3]}">${rcLabel(quad[3])}</span> ` +
                        `together can only hold ${cands.join(', ')}, so those digits can be removed from other cells in this ${unitNameOf(u)}.</p>`,
                };
            }
        }
    }
    return null;
}

// Hidden Quad — four digits whose only positions in a unit are
// confined to four cells. Mirrors the Hidden Triplet generalisation
// to subsets of size 4.
export function hiddenQuad(state) {
    const { candidates } = state;
    for (let u = 0; u < UNITS.length; u++) {
        const unit = UNITS[u];
        const where = {};
        for (const d of ALL_DIGITS) {
            where[d] = unit.filter(c => candidates[c].includes(d));
        }
        const eligible = ALL_DIGITS.split('').filter(d => where[d].length >= 2 && where[d].length <= 4);
        for (const quad of combinations(eligible, 4)) {
            const cellSet = new Set();
            quad.forEach(d => where[d].forEach(c => cellSet.add(c)));
            if (cellSet.size !== 4) continue;
            const cells = [...cellSet].sort((a, b) => a - b);
            const eliminations = {};
            let any = false;
            for (const d of ALL_DIGITS) {
                if (quad.includes(d)) continue;
                const targets = cells.filter(c => candidates[c].includes(d));
                if (targets.length > 0) {
                    eliminations[d] = targets;
                    any = true;
                }
            }
            if (any) {
                return {
                    kind: 'eliminate',
                    removed: eliminations,
                    highlight: cells,
                    rating: 5.4,
                    title: `Hidden Quad: ${quad.join('')} in ${unitNameOf(u)}`,
                    nudgeTitle: `Hidden Quad in ${unitNameOf(u)}`,
                    nudge: `There's a Hidden Quad in this ${unitNameOf(u)}. Four digits can only appear in four cells — try to find them.`,
                    html:
                        `<p>In ${unitNameOf(u)}, the digits <strong>${quad.join('</strong>, <strong>')}</strong> ` +
                        `can only appear in cells <span class="rc-hot-spot" data-cell-index="${cells[0]}">${rcLabel(cells[0])}</span>, ` +
                        `<span class="rc-hot-spot" data-cell-index="${cells[1]}">${rcLabel(cells[1])}</span>, ` +
                        `<span class="rc-hot-spot" data-cell-index="${cells[2]}">${rcLabel(cells[2])}</span> and ` +
                        `<span class="rc-hot-spot" data-cell-index="${cells[3]}">${rcLabel(cells[3])}</span>, ` +
                        `so other candidates can be removed from those four cells.</p>`,
                };
            }
        }
    }
    return null;
}

// Jellyfish — 4-row (or 4-column) fish, generalising Swordfish from
// 3 to 4. For some digit D, find 4 rows whose D-candidate positions
// each hold 2/3/4 cells and collectively span exactly 4 columns.
// One cell per row from those four columns must hold D, so D can
// be eliminated from any other cell in those four columns. Symmetric
// 4-column-into-4-rows formulation handled below the row case.
//
// Length-1 rows are excluded (a length-1 row is a hidden single,
// already covered upstream and would let trivial arrangements pose
// as "Jellyfish" eliminations).
export function jellyfish(state) {
    const { candidates } = state;
    for (const d of ALL_DIGITS) {
        // Row-based.
        const rowsInfo = [];
        for (let r = 0; r < 9; r++) {
            const cells = UNITS[r].filter(c => candidates[c].includes(d));
            if (cells.length >= 2 && cells.length <= 4) {
                rowsInfo.push({ row: r, cells, cols: cells.map(colOf) });
            }
        }
        for (const quad of combinations(rowsInfo, 4)) {
            const colSet = new Set();
            quad.forEach(qr => qr.cols.forEach(c => colSet.add(c)));
            if (colSet.size !== 4) continue;
            const cols = [...colSet].sort((x, y) => x - y);
            const elim = [];
            const allCells = [];
            quad.forEach(qr => qr.cells.forEach(c => allCells.push(c)));
            for (const col of cols) {
                for (const cell of UNITS[9 + col]) {
                    const r = rowOf(cell);
                    if (quad.some(qr => qr.row === r)) continue;
                    if (candidates[cell].includes(d)) elim.push(cell);
                }
            }
            if (elim.length > 0) {
                const rowList = quad.map(qr => qr.row + 1).join(', ');
                return {
                    kind: 'eliminate',
                    removed: { [d]: elim },
                    highlight: allCells,
                    rating: 5.2,
                    title: `Jellyfish: ${d} in rows ${rowList}`,
                    nudgeTitle: `Jellyfish on digit ${d}`,
                    nudge: `There's a Jellyfish on digit ${d}. Four rows where ${d}'s positions fit into four columns.`,
                    html:
                        `<p>The digit <strong>${d}</strong> forms a Jellyfish in rows ${rowList} — every position for ${d} ` +
                        `in those rows lies in columns ${cols.map(x => x + 1).join(', ')}. ` +
                        `One cell in each of those rows must hold ${d}, so ${d} can be eliminated from the rest of those four columns.</p>`,
                };
            }
        }
        // Column-based.
        const colsInfo = [];
        for (let c = 0; c < 9; c++) {
            const cells = UNITS[9 + c].filter(cell => candidates[cell].includes(d));
            if (cells.length >= 2 && cells.length <= 4) {
                colsInfo.push({ col: c, cells, rows: cells.map(rowOf) });
            }
        }
        for (const quad of combinations(colsInfo, 4)) {
            const rowSet = new Set();
            quad.forEach(qc => qc.rows.forEach(r => rowSet.add(r)));
            if (rowSet.size !== 4) continue;
            const rows = [...rowSet].sort((x, y) => x - y);
            const elim = [];
            const allCells = [];
            quad.forEach(qc => qc.cells.forEach(c => allCells.push(c)));
            for (const row of rows) {
                for (const cell of UNITS[row]) {
                    const col = colOf(cell);
                    if (quad.some(qc => qc.col === col)) continue;
                    if (candidates[cell].includes(d)) elim.push(cell);
                }
            }
            if (elim.length > 0) {
                const colList = quad.map(qc => qc.col + 1).join(', ');
                return {
                    kind: 'eliminate',
                    removed: { [d]: elim },
                    highlight: allCells,
                    rating: 5.2,
                    title: `Jellyfish: ${d} in columns ${colList}`,
                    nudgeTitle: `Jellyfish on digit ${d}`,
                    nudge: `There's a Jellyfish on digit ${d}. Four columns where ${d}'s positions fit into four rows.`,
                    html:
                        `<p>The digit <strong>${d}</strong> forms a Jellyfish in columns ${colList} — every position for ${d} ` +
                        `in those columns lies in rows ${rows.map(x => x + 1).join(', ')}. ` +
                        `One cell in each of those columns must hold ${d}, so ${d} can be eliminated from the rest of those four rows.</p>`,
                };
            }
        }
    }
    return null;
}

// Skyscraper — single-digit pattern. For some digit D: two parallel
// rows (or columns) each with exactly two D-candidates, sharing one
// of the two crossing-line positions. The two "tops" — the
// non-shared endpoints — must between them hold D, so any cell that
// sees BOTH tops can be cleared of D. Equivalent to a "row-row
// strong link pair sharing a column" (or symmetric column-column).
export function skyscraper(state) {
    const { candidates } = state;
    for (const d of ALL_DIGITS) {
        // Row-based skyscraper (shared column).
        const rowEnds = [];
        for (let r = 0; r < 9; r++) {
            const cells = UNITS[r].filter(c => candidates[c].includes(d));
            if (cells.length === 2) rowEnds.push({ row: r, cells, cols: cells.map(colOf) });
        }
        for (let i = 0; i < rowEnds.length - 1; i++) {
            for (let j = i + 1; j < rowEnds.length; j++) {
                const a = rowEnds[i], b = rowEnds[j];
                let sharedCol = -1, freeColA = -1, freeColB = -1;
                if (a.cols[0] === b.cols[0]) { sharedCol = a.cols[0]; freeColA = a.cols[1]; freeColB = b.cols[1]; }
                else if (a.cols[0] === b.cols[1]) { sharedCol = a.cols[0]; freeColA = a.cols[1]; freeColB = b.cols[0]; }
                else if (a.cols[1] === b.cols[0]) { sharedCol = a.cols[1]; freeColA = a.cols[0]; freeColB = b.cols[1]; }
                else if (a.cols[1] === b.cols[1]) { sharedCol = a.cols[1]; freeColA = a.cols[0]; freeColB = b.cols[0]; }
                else continue;
                if (freeColA === freeColB) continue; // would be a true X-Wing, handled elsewhere
                const topA = a.row * 9 + freeColA;
                const topB = b.row * 9 + freeColB;
                const targets = [];
                for (let cell = 0; cell < 81; cell++) {
                    if (cell === topA || cell === topB) continue;
                    if (!candidates[cell].includes(d)) continue;
                    if (isPeer(cell, topA) && isPeer(cell, topB)) targets.push(cell);
                }
                if (targets.length > 0) {
                    const baseA = a.row * 9 + sharedCol;
                    const baseB = b.row * 9 + sharedCol;
                    return {
                        kind: 'eliminate',
                        removed: { [d]: targets },
                        highlight: [baseA, baseB, topA, topB],
                        rating: 4.0,
                        title: `Skyscraper: ${d} in rows ${a.row + 1} & ${b.row + 1}`,
                        nudgeTitle: `Skyscraper on digit ${d}`,
                        nudge: `There's a Skyscraper on digit ${d}. Two rows each have only two candidate cells, sharing one column.`,
                        html:
                            `<p>For digit <strong>${d}</strong>, rows ${a.row + 1} and ${b.row + 1} each have only two candidate cells, ` +
                            `sharing column ${sharedCol + 1}. Either ` +
                            `<span class="rc-hot-spot" data-cell-index="${topA}">${rcLabel(topA)}</span> or ` +
                            `<span class="rc-hot-spot" data-cell-index="${topB}">${rcLabel(topB)}</span> must hold ${d}, ` +
                            `so any cell that sees both can be cleared of ${d}.</p>`,
                    };
                }
            }
        }
        // Column-based skyscraper (shared row).
        const colEnds = [];
        for (let c = 0; c < 9; c++) {
            const cells = UNITS[9 + c].filter(cell => candidates[cell].includes(d));
            if (cells.length === 2) colEnds.push({ col: c, cells, rows: cells.map(rowOf) });
        }
        for (let i = 0; i < colEnds.length - 1; i++) {
            for (let j = i + 1; j < colEnds.length; j++) {
                const a = colEnds[i], b = colEnds[j];
                let sharedRow = -1, freeRowA = -1, freeRowB = -1;
                if (a.rows[0] === b.rows[0]) { sharedRow = a.rows[0]; freeRowA = a.rows[1]; freeRowB = b.rows[1]; }
                else if (a.rows[0] === b.rows[1]) { sharedRow = a.rows[0]; freeRowA = a.rows[1]; freeRowB = b.rows[0]; }
                else if (a.rows[1] === b.rows[0]) { sharedRow = a.rows[1]; freeRowA = a.rows[0]; freeRowB = b.rows[1]; }
                else if (a.rows[1] === b.rows[1]) { sharedRow = a.rows[1]; freeRowA = a.rows[0]; freeRowB = b.rows[0]; }
                else continue;
                if (freeRowA === freeRowB) continue;
                const topA = freeRowA * 9 + a.col;
                const topB = freeRowB * 9 + b.col;
                const targets = [];
                for (let cell = 0; cell < 81; cell++) {
                    if (cell === topA || cell === topB) continue;
                    if (!candidates[cell].includes(d)) continue;
                    if (isPeer(cell, topA) && isPeer(cell, topB)) targets.push(cell);
                }
                if (targets.length > 0) {
                    const baseA = sharedRow * 9 + a.col;
                    const baseB = sharedRow * 9 + b.col;
                    return {
                        kind: 'eliminate',
                        removed: { [d]: targets },
                        highlight: [baseA, baseB, topA, topB],
                        rating: 4.0,
                        title: `Skyscraper: ${d} in columns ${a.col + 1} & ${b.col + 1}`,
                        nudgeTitle: `Skyscraper on digit ${d}`,
                        nudge: `There's a Skyscraper on digit ${d}. Two columns each have only two candidate cells, sharing one row.`,
                        html:
                            `<p>For digit <strong>${d}</strong>, columns ${a.col + 1} and ${b.col + 1} each have only two candidate cells, ` +
                            `sharing row ${sharedRow + 1}. Either ` +
                            `<span class="rc-hot-spot" data-cell-index="${topA}">${rcLabel(topA)}</span> or ` +
                            `<span class="rc-hot-spot" data-cell-index="${topB}">${rcLabel(topB)}</span> must hold ${d}, ` +
                            `so any cell that sees both can be cleared of ${d}.</p>`,
                    };
                }
            }
        }
    }
    return null;
}

// 2-String Kite — single-digit pattern. For some digit D: a row
// with exactly 2 D-candidates and a column with exactly 2
// D-candidates, where one cell of the row and one cell of the
// column live in the SAME box. The other two endpoints — the
// row-cell-not-in-box and the column-cell-not-in-box — must between
// them hold D, so any cell seeing BOTH free ends can be cleared of
// D. The shared-box cells form the "joint" of the kite.
export function twoStringKite(state) {
    const { candidates } = state;
    for (const d of ALL_DIGITS) {
        const rowsWith2 = [];
        for (let r = 0; r < 9; r++) {
            const cells = UNITS[r].filter(c => candidates[c].includes(d));
            if (cells.length === 2) rowsWith2.push({ row: r, cells });
        }
        const colsWith2 = [];
        for (let c = 0; c < 9; c++) {
            const cells = UNITS[9 + c].filter(cell => candidates[cell].includes(d));
            if (cells.length === 2) colsWith2.push({ col: c, cells });
        }
        for (const ri of rowsWith2) {
            for (const ci of colsWith2) {
                for (const rCell of ri.cells) {
                    for (const cCell of ci.cells) {
                        if (rCell === cCell) continue;
                        if (boxOf(rCell) !== boxOf(cCell)) continue;
                        const otherR = ri.cells.find(c => c !== rCell);
                        const otherC = ci.cells.find(c => c !== cCell);
                        if (otherR === otherC) continue; // degenerate
                        const targets = [];
                        for (let cell = 0; cell < 81; cell++) {
                            if (cell === otherR || cell === otherC || cell === rCell || cell === cCell) continue;
                            if (!candidates[cell].includes(d)) continue;
                            if (isPeer(cell, otherR) && isPeer(cell, otherC)) targets.push(cell);
                        }
                        if (targets.length > 0) {
                            return {
                                kind: 'eliminate',
                                removed: { [d]: targets },
                                highlight: [rCell, cCell, otherR, otherC],
                                rating: 4.1,
                                title: `2-String Kite: ${d} in row ${ri.row + 1} & column ${ci.col + 1}`,
                                nudgeTitle: `2-String Kite on digit ${d}`,
                                nudge: `There's a 2-String Kite on digit ${d}. A row and a column each have only two candidates, meeting in a shared box.`,
                                html:
                                    `<p>For digit <strong>${d}</strong>, row ${ri.row + 1} has only two candidate cells and ` +
                                    `column ${ci.col + 1} has only two candidate cells. ` +
                                    `<span class="rc-hot-spot" data-cell-index="${rCell}">${rcLabel(rCell)}</span> and ` +
                                    `<span class="rc-hot-spot" data-cell-index="${cCell}">${rcLabel(cCell)}</span> share a block, ` +
                                    `so at least one of <span class="rc-hot-spot" data-cell-index="${otherR}">${rcLabel(otherR)}</span> or ` +
                                    `<span class="rc-hot-spot" data-cell-index="${otherC}">${rcLabel(otherC)}</span> must hold ${d}. ` +
                                    `Any cell that sees both free ends can be cleared of ${d}.</p>`,
                            };
                        }
                    }
                }
            }
        }
    }
    return null;
}

// W-Wing — two bivalue cells X and Y both holding the same {A, B},
// X and Y not peers of each other. A unit somewhere has exactly two
// candidates for ONE of those digits (call it the link digit B);
// one of the strong-link cells is a peer of X, the other a peer of
// Y, and neither IS X or Y. If both X and Y were B, the strong link
// would be empty (its two candidates would both be eliminated by
// peer-conflict) — contradiction. So at least one of {X, Y} = A,
// and any cell seeing BOTH X and Y can be cleared of A.
export function wWing(state) {
    const { candidates } = state;
    const bivalues = [];
    for (let i = 0; i < 81; i++) {
        if (candidates[i].length === 2) bivalues.push(i);
    }
    for (let i = 0; i < bivalues.length - 1; i++) {
        for (let j = i + 1; j < bivalues.length; j++) {
            const X = bivalues[i], Y = bivalues[j];
            if (candidates[X] !== candidates[Y]) continue;
            if (isPeer(X, Y)) continue;
            const [d1, d2] = candidates[X].split('');
            // Try eliminating each digit in turn; the OTHER digit is the strong-link digit.
            for (const [elimD, linkD] of [[d1, d2], [d2, d1]]) {
                for (let u = 0; u < UNITS.length; u++) {
                    const cells = UNITS[u].filter(c => candidates[c].includes(linkD));
                    if (cells.length !== 2) continue;
                    const [p, q] = cells;
                    if (p === X || p === Y || q === X || q === Y) continue;
                    let endP = null, endQ = null;
                    if (isPeer(p, X) && isPeer(q, Y)) { endP = p; endQ = q; }
                    else if (isPeer(p, Y) && isPeer(q, X)) { endP = q; endQ = p; }
                    else continue;
                    const targets = [];
                    for (let cell = 0; cell < 81; cell++) {
                        if (cell === X || cell === Y || cell === endP || cell === endQ) continue;
                        if (!candidates[cell].includes(elimD)) continue;
                        if (isPeer(cell, X) && isPeer(cell, Y)) targets.push(cell);
                    }
                    if (targets.length > 0) {
                        const unitName = unitNameOf(u);
                        return {
                            kind: 'eliminate',
                            removed: { [elimD]: targets },
                            highlight: [X, Y, endP, endQ],
                            rating: 4.4,
                            title: `W-Wing: ${rcLabel(X)} & ${rcLabel(Y)} on ${elimD} (link on ${linkD} in ${unitName})`,
                            nudgeTitle: 'W-Wing',
                            nudge: "There's a W-Wing somewhere on the board. Two bivalue cells share the same two digits, connected by a strong link on one of those digits.",
                            html:
                                `<p>Cells <span class="rc-hot-spot" data-cell-index="${X}">${rcLabel(X)}</span> and ` +
                                `<span class="rc-hot-spot" data-cell-index="${Y}">${rcLabel(Y)}</span> ` +
                                `both hold only the candidates <strong>${d1}</strong> and <strong>${d2}</strong>. ` +
                                `In ${unitName}, <strong>${linkD}</strong> can only appear in ` +
                                `<span class="rc-hot-spot" data-cell-index="${endP}">${rcLabel(endP)}</span> and ` +
                                `<span class="rc-hot-spot" data-cell-index="${endQ}">${rcLabel(endQ)}</span>, ` +
                                `peers of ${rcLabel(X)} and ${rcLabel(Y)} respectively. ` +
                                `If both ${rcLabel(X)} and ${rcLabel(Y)} were ${linkD}, the strong link would be empty — ` +
                                `so at least one of them is <strong>${elimD}</strong>. ` +
                                `Any cell that sees both can be cleared of ${elimD}.</p>`,
                        };
                    }
                }
            }
        }
    }
    return null;
}

// ---------- Tier-2 strategies (Theme batch v2) ----------
//
// Four advanced techniques that fire when the simpler strategies
// above don't yield a step. Same shape as the rest of this file:
// each is a pure function of `state = {digits, candidates}` and
// returns a step object (place / eliminate) or null.

// Unique Rectangle (Type 1).
//
// A Sudoku has exactly one solution. If four cells form a rectangle
// across two rows, two columns AND two boxes, and three of the four
// share the same bivalue pair {X, Y}, then the fourth cell cannot
// reduce to {X, Y} — that would create a "deadly pattern" with two
// valid solutions (you could swap X and Y around the rectangle).
// So X and Y can both be eliminated from the fourth cell's
// candidates, leaving only its 'extra' digits.
//
// The two-boxes constraint matters: if the rectangle sat entirely
// in one box (impossible — a 2x2 rectangle spans 2 cols/rows in the
// SAME band would need to span 1 box) or 4 boxes, the deadly-
// pattern argument doesn't hold the same way. UR1 is specifically
// the 2-box variant.
export function uniqueRectangle(state) {
    const { candidates } = state;
    // Group bivalue cells by their digit pair (e.g., '13', '47').
    // Pair strings are sorted by computeCandidates so we can compare
    // directly without normalising.
    const bivaluesByPair = new Map();
    for (let i = 0; i < 81; i++) {
        if (candidates[i].length === 2) {
            const pair = candidates[i];
            if (!bivaluesByPair.has(pair)) bivaluesByPair.set(pair, []);
            bivaluesByPair.get(pair).push(i);
        }
    }
    for (const [pair, cells] of bivaluesByPair) {
        if (cells.length < 3) continue;
        const triples = combinations(cells, 3);
        for (const [a, b, c] of triples) {
            const rows = new Set([rowOf(a), rowOf(b), rowOf(c)]);
            const cols = new Set([colOf(a), colOf(b), colOf(c)]);
            if (rows.size !== 2 || cols.size !== 2) continue;
            // Reconstruct the 4th corner from the 2x2 row/col grid.
            const rArr = [...rows];
            const cArr = [...cols];
            let corner4 = -1;
            for (const r of rArr) for (const cc of cArr) {
                const idx = r * 9 + cc;
                if (idx !== a && idx !== b && idx !== c) corner4 = idx;
            }
            if (corner4 === -1) continue;
            const c4Cands = candidates[corner4];
            if (c4Cands.length <= 2) continue;          // 4th must have extras
            const [d1, d2] = pair.split('');
            if (!c4Cands.includes(d1) || !c4Cands.includes(d2)) continue;
            // The 4-corner rectangle must span exactly 2 boxes.
            const boxes = new Set([boxOf(a), boxOf(b), boxOf(c), boxOf(corner4)]);
            if (boxes.size !== 2) continue;
            return {
                kind: 'eliminate',
                removed: { [d1]: [corner4], [d2]: [corner4] },
                highlight: [a, b, c, corner4],
                rating: 4.5,
                title: `Unique Rectangle (Type 1): ${rcLabel(a)}, ${rcLabel(b)}, ${rcLabel(c)}, ${rcLabel(corner4)} — eliminate ${d1} & ${d2} from ${rcLabel(corner4)}`,
                nudgeTitle: 'Unique Rectangle (Type 1)',
                nudge: "Four cells across two rows, two columns and two boxes share the same pair of candidates. If the 'odd' cell were also reduced to that pair, the puzzle would have two solutions.",
                html:
                    `<p>Cells <span class="rc-hot-spot" data-cell-index="${a}">${rcLabel(a)}</span>, ` +
                    `<span class="rc-hot-spot" data-cell-index="${b}">${rcLabel(b)}</span>, and ` +
                    `<span class="rc-hot-spot" data-cell-index="${c}">${rcLabel(c)}</span> all hold ` +
                    `the bivalue pair {<strong>${d1}</strong>, <strong>${d2}</strong>} ` +
                    `and form three corners of a rectangle that spans two rows, two columns, and two boxes. ` +
                    `If the fourth corner <span class="rc-hot-spot" data-cell-index="${corner4}">${rcLabel(corner4)}</span> ` +
                    `were also limited to {${d1}, ${d2}}, the puzzle would have two valid solutions ` +
                    `(swap ${d1} and ${d2} around the rectangle). Since a Sudoku has exactly one solution, ` +
                    `${d1} and ${d2} can both be eliminated from ${rcLabel(corner4)}.</p>`,
            };
        }
    }
    return null;
}

// XYZ-Wing.
//
// A close cousin of XY-Wing. The pivot has THREE candidates {a, b, z}
// instead of two; two bivalue pincers see the pivot, one with {a, z}
// and one with {b, z}. Whichever digit ends up in the pivot, exactly
// one of the three cells holds z — so any cell that sees ALL THREE
// (pivot AND both pincers) cannot be z.
//
// The "see all three" requirement is the only structural difference
// from XY-Wing's "see both pincers" — the pivot itself is now in the
// peer constraint because it could also be the z-cell.
export function xyzWing(state) {
    const { candidates } = state;
    const trivalues = [];
    const bivalues = [];
    for (let i = 0; i < 81; i++) {
        const len = candidates[i].length;
        if (len === 3) trivalues.push(i);
        else if (len === 2) bivalues.push(i);
    }
    for (const pivot of trivalues) {
        const pivCands = candidates[pivot];
        const pivDigits = pivCands.split('');
        // Try each digit as the common z; the other two are 'a' and 'b'.
        for (const z of pivDigits) {
            const others = pivCands.replace(z, '');
            const a = others[0], b = others[1];
            for (const p1 of bivalues) {
                if (!isPeer(p1, pivot)) continue;
                const p1Cands = candidates[p1];
                // {a, z} pincer (string compare both orderings — pairs
                // are sorted by computeCandidates so '5z' or 'z5' lands
                // in canonical order, but be defensive).
                if (p1Cands !== a + z && p1Cands !== z + a) continue;
                for (const p2 of bivalues) {
                    if (p2 === p1) continue;
                    if (!isPeer(p2, pivot)) continue;
                    const p2Cands = candidates[p2];
                    if (p2Cands !== b + z && p2Cands !== z + b) continue;
                    // Found XYZ-Wing. Eliminate z from cells peer to all 3.
                    const targets = [];
                    for (let i = 0; i < 81; i++) {
                        if (i === pivot || i === p1 || i === p2) continue;
                        if (!candidates[i].includes(z)) continue;
                        if (isPeer(i, pivot) && isPeer(i, p1) && isPeer(i, p2)) {
                            targets.push(i);
                        }
                    }
                    if (targets.length > 0) {
                        return {
                            kind: 'eliminate',
                            removed: { [z]: targets },
                            highlight: [pivot, p1, p2],
                            rating: 4.6,
                            title: `XYZ-Wing: pivot ${rcLabel(pivot)} (${a}${b}${z}), pincers ${rcLabel(p1)} & ${rcLabel(p2)} — eliminate ${z}`,
                            nudgeTitle: 'XYZ-Wing',
                            nudge: "There's an XYZ-Wing on the board. A 3-candidate pivot and two bivalue pincers all share one common digit Z. Any cell that sees all three can't be Z.",
                            html:
                                `<p>The pivot <span class="rc-hot-spot" data-cell-index="${pivot}">${rcLabel(pivot)}</span> ` +
                                `holds three candidates {<strong>${a}</strong>, <strong>${b}</strong>, <strong>${z}</strong>}. ` +
                                `Its bivalue peers <span class="rc-hot-spot" data-cell-index="${p1}">${rcLabel(p1)}</span> (${a}${z}) ` +
                                `and <span class="rc-hot-spot" data-cell-index="${p2}">${rcLabel(p2)}</span> (${b}${z}) ` +
                                `each contain ${z}. Whichever digit the pivot ends up as — ${a}, ${b}, or ${z} — ` +
                                `exactly one of these three cells must be ${z}. ` +
                                `Any cell that sees the pivot AND both pincers therefore cannot be ${z}.</p>`,
                        };
                    }
                }
            }
        }
    }
    return null;
}

// Bivalue Universal Grave (Type 1).
//
// "BUG" patterns are deadly-pattern arguments at puzzle scale.
// Type 1 fires when every empty cell on the board has exactly 2
// candidates EXCEPT one cell that has exactly 3. In a true BUG state
// (all cells bivalue, every digit appearing exactly twice in every
// unit), the puzzle would have two valid solutions — a deadly
// pattern. Since Sudoku has exactly one solution, the 3-candidate
// cell must take its 'extra' digit (the one whose count in some unit
// containing the cell is 3 rather than 2). That digit, placed there,
// is the only escape from the deadly pattern.
export function bugType1(state) {
    const { digits, candidates } = state;
    let trivCell = -1;
    for (let i = 0; i < 81; i++) {
        if (digits[i] !== '0') continue;
        const len = candidates[i].length;
        if (len === 2) continue;
        if (len === 3) {
            if (trivCell !== -1) return null;       // more than one 3-candidate cell
            trivCell = i;
        }
        else {
            return null;                            // any other length rules BUG out
        }
    }
    if (trivCell === -1) return null;
    const trivCands = candidates[trivCell].split('');
    const trivUnits = [
        UNITS[rowOf(trivCell)],
        UNITS[9 + colOf(trivCell)],
        UNITS[18 + boxOf(trivCell)],
    ];
    // The "extra" digit appears 3 times (instead of 2) in at least
    // one of the trivCell's units. The other two digits appear 2
    // times in every unit, by the BUG precondition.
    let extraDigit = null;
    for (const d of trivCands) {
        for (const unit of trivUnits) {
            let count = 0;
            for (const i of unit) {
                if (digits[i] === '0' && candidates[i].includes(d)) count++;
            }
            if (count === 3) {
                extraDigit = d;
                break;
            }
        }
        if (extraDigit) break;
    }
    if (!extraDigit) return null;
    return {
        kind: 'place',
        cell: trivCell,
        digit: extraDigit,
        rating: 5.0,
        title: `Bivalue Universal Grave (Type 1): place ${extraDigit} at ${rcLabel(trivCell)}`,
        nudgeTitle: 'BUG (Type 1)',
        nudge: "Every empty cell on the board has exactly 2 candidates except one with 3. If that cell took one of its 'normal' digits, the remaining grid would be a deadly pattern with two solutions — so it must take its third (extra) digit.",
        html:
            `<p>Every empty cell currently has exactly 2 candidates ` +
            `except <span class="rc-hot-spot" data-cell-index="${trivCell}">${rcLabel(trivCell)}</span>, ` +
            `which has 3: {${trivCands.join(', ')}}. ` +
            `If we placed one of its two 'normal' candidates, the remaining grid would be a Bivalue Universal Grave — ` +
            `every digit appearing exactly twice in every unit, which is a deadly pattern with two valid solutions. ` +
            `Since the puzzle has a unique solution, the cell must take its 'extra' candidate ` +
            `<strong>${extraDigit}</strong>.</p>`,
    };
}

// WXYZ-Wing.
//
// Generalisation of XYZ-Wing to four cells. A pivot holds four
// candidates {w, x, y, z}; three pincers, each bivalue, each
// containing z plus exactly one of {w, x, y}. Each pincer is a
// peer of the pivot. Whichever digit the pivot takes, at least one
// of the four cells must be z — so cells that see the pivot AND all
// three pincers cannot be z.
//
// This implementation covers the canonical 4-cell variant (one
// 4-candidate pivot + three bivalue pincers); the Sudoku literature
// describes other shapes (3 quad-cells + 1 bivalue, etc.) which we
// don't enumerate here. The canonical variant catches the common
// cases without ballooning the search space.
export function wxyzWing(state) {
    const { candidates } = state;
    const quadvalues = [];
    const bivalues = [];
    for (let i = 0; i < 81; i++) {
        const len = candidates[i].length;
        if (len === 4) quadvalues.push(i);
        else if (len === 2) bivalues.push(i);
    }
    for (const pivot of quadvalues) {
        const pivCands = candidates[pivot];
        const pivDigits = pivCands.split('');
        // Try each candidate as the common z; the other three are w, x, y.
        for (const z of pivDigits) {
            const others = pivCands.replace(z, '').split('');
            const [w, x, y] = others;
            // Find pincers: one with {w,z}, one with {x,z}, one with {y,z}.
            const findPincer = (a) => bivalues.filter(b =>
                isPeer(b, pivot) &&
                (candidates[b] === a + z || candidates[b] === z + a)
            );
            const wPincers = findPincer(w);
            const xPincers = findPincer(x);
            const yPincers = findPincer(y);
            if (!wPincers.length || !xPincers.length || !yPincers.length) continue;
            for (const pw of wPincers) {
                for (const px of xPincers) {
                    if (px === pw) continue;
                    for (const py of yPincers) {
                        if (py === pw || py === px) continue;
                        const targets = [];
                        for (let i = 0; i < 81; i++) {
                            if (i === pivot || i === pw || i === px || i === py) continue;
                            if (!candidates[i].includes(z)) continue;
                            if (isPeer(i, pivot) && isPeer(i, pw) && isPeer(i, px) && isPeer(i, py)) {
                                targets.push(i);
                            }
                        }
                        if (targets.length > 0) {
                            return {
                                kind: 'eliminate',
                                removed: { [z]: targets },
                                highlight: [pivot, pw, px, py],
                                rating: 5.6,
                                title: `WXYZ-Wing: pivot ${rcLabel(pivot)} (${w}${x}${y}${z}), pincers ${rcLabel(pw)}, ${rcLabel(px)}, ${rcLabel(py)} — eliminate ${z}`,
                                nudgeTitle: 'WXYZ-Wing',
                                nudge: "There's a WXYZ-Wing on the board. A 4-candidate pivot and three bivalue pincers, all sharing one common digit Z. Any cell that sees all four can't be Z.",
                                html:
                                    `<p>The pivot <span class="rc-hot-spot" data-cell-index="${pivot}">${rcLabel(pivot)}</span> ` +
                                    `holds four candidates {<strong>${w}</strong>, <strong>${x}</strong>, <strong>${y}</strong>, <strong>${z}</strong>}. ` +
                                    `Three bivalue peers — ` +
                                    `<span class="rc-hot-spot" data-cell-index="${pw}">${rcLabel(pw)}</span> (${w}${z}), ` +
                                    `<span class="rc-hot-spot" data-cell-index="${px}">${rcLabel(px)}</span> (${x}${z}), and ` +
                                    `<span class="rc-hot-spot" data-cell-index="${py}">${rcLabel(py)}</span> (${y}${z}) — ` +
                                    `each contain ${z}. Whichever digit the pivot ends up as, exactly one of these four cells must be ${z}. ` +
                                    `Any cell that sees all four therefore cannot be ${z}.</p>`,
                            };
                        }
                    }
                }
            }
        }
    }
    return null;
}


const STRATEGIES = [
    nakedSingle,        // 1.0
    hiddenSingle,       // 1.2
    lockedCandidates,   // 2.6 / 2.8
    nakedPair,          // 3.0
    hiddenPair,         // 3.4
    nakedTriplet,       // 3.6
    hiddenTriplet,      // 4.0
    skyscraper,         // 4.0
    twoStringKite,      // 4.1
    xWing,              // 4.2
    xyWing,             // 4.4
    wWing,              // 4.4
    uniqueRectangle,    // 4.5  ← Tier-2
    swordfish,          // 4.6
    xyzWing,            // 4.6  ← Tier-2
    nakedQuad,          // 5.0
    bugType1,           // 5.0  ← Tier-2
    jellyfish,          // 5.2
    hiddenQuad,         // 5.4
    wxyzWing,           // 5.6  ← Tier-2
];

// ---------- Top-level analysis builder ----------

function stepToOutput(step) {
    const out = {
        rt: step.rating.toFixed(1),
        sd: step.title,
        ht: step.html,
    };
    if (step.kind === 'place') {
        out.di = step.cell;
    } else {
        out.ec = step.removed;
    }
    if (step.highlight && step.highlight.length > 0) {
        out.hi = step.highlight;
    }
    // Batch-5 — two-stage hint disclosure. nt = nudge title shown
    // when the player has the nudge stage enabled; nb = nudge body
    // text. Each strategy provides its own; the modal hides the
    // full hint payload until the player clicks "Show me anyway".
    if (step.nudgeTitle) out.nt = step.nudgeTitle;
    if (step.nudge) out.nb = step.nudge;
    return out;
}

// Round-12 (2026-05-01) — REC-5 helper. Singles fast-path: drain
// every Naked Single and Hidden Single available before falling back
// to the full STRATEGIES iteration. Both strategies are O(n) and fire
// frequently — Naked Single resolves any cell whose candidate set
// shrunk to one; Hidden Single resolves any unit-digit pair that's
// pinned. Cycling them in a tight loop avoids re-walking the more
// expensive 18 higher strategies between every place step.
//
// Behaviour is identical to "iterate STRATEGIES once per loop turn":
// every step still goes through applyStep, every step is still
// emitted to the consumer's accumulator (when an emit closure is
// supplied), and maxRating still tracks each step's rating. The
// only change is iteration order: while singles fire, we don't
// retry the higher strategies (they couldn't have fired at the
// previous loop turn AND the only state-change since is candidates
// dropping by one digit at one cell — applyStep's incremental update
// only removes candidates, never adds; a higher strategy that didn't
// fire on a strict superset of the candidate state cannot fire on
// the subset).
//
// Returns { steppedAny, brokeOnFinalDigit } — the caller uses
// brokeOnFinalDigit to decide whether to break the outer loop.
function drainSingles(state, onStep) {
    let steppedAny = false;
    while (true) {
        let step = nakedSingle(state);
        if (!step) step = hiddenSingle(state);
        if (!step) return { steppedAny };
        onStep(step);
        steppedAny = true;
        // applyStep returns a fresh { digits, candidates }; rebind
        // the closure-captured state so the next iteration sees the
        // post-place world.
        const next = applyStep(state, step);
        state.digits = next.digits;
        state.candidates = next.candidates;
        if (state.digits.indexOf('0') === -1) return { steppedAny, solved: true };
    }
}

export function computeAnalysis(initialDigits) {
    const fd = bruteForceSolve(initialDigits);
    if (!fd) {
        throw new Error('Puzzle has no solution');
    }
    let digits = initialDigits.split('');
    let candidates = computeCandidates(digits);
    const steps = [];
    let maxRating = 0;
    let safetyCounter = 0;
    // Round-12 — REC-5. Drain singles at the start (initial puzzle
    // state often has trivial singles right out of the gate), then
    // again after every higher-strategy step. Steps still emit in
    // strict order; the only change is fewer redundant passes through
    // the 18 higher strategies between back-to-back singles.
    {
        const state = { digits, candidates };
        const { steppedAny } = drainSingles(state, (step) => {
            steps.push(stepToOutput(step));
            if (step.rating > maxRating) maxRating = step.rating;
        });
        if (steppedAny) {
            digits = state.digits;
            candidates = state.candidates;
        }
    }
    while (digits.indexOf('0') !== -1) {
        if (++safetyCounter > 1000) break;
        let step = null;
        for (const strategy of STRATEGIES) {
            step = strategy({ digits, candidates });
            if (step) break;
        }
        if (!step) {
            // Fallback: pick the empty cell with the fewest candidates and
            // place its known-correct digit. Marked as a high-rating step so
            // the user sees we couldn't find a clean technique.
            let bestI = -1, bestCount = 10;
            for (let i = 0; i < 81; i++) {
                if (digits[i] === '0' && candidates[i].length > 0 && candidates[i].length < bestCount) {
                    bestCount = candidates[i].length;
                    bestI = i;
                }
            }
            if (bestI === -1) {
                // No empty cell with any candidate — must have stuck on a contradiction;
                // just place the next empty using fd to keep moving.
                bestI = digits.indexOf('0');
            }
            const d = fd[bestI];
            step = {
                kind: 'place',
                cell: bestI,
                digit: d,
                rating: 7.0,
                title: `Trial & Error: ${rcLabel(bestI)}: ${d}`,
                nudgeTitle: 'Trial & Error',
                nudge: 'None of the standard techniques advance the puzzle from here — the next step needs a forcing chain. Press Reveal to see the cell.',
                html: `<p>None of the implemented strategies (Naked/Hidden Singles, Locked Candidates, Naked/Hidden Pairs/Triplets/Quads, Skyscraper, 2-String Kite, X-Wing, XY-Wing, W-Wing, Swordfish, Jellyfish, Unique Rectangle Type 1, XYZ-Wing, BUG Type 1, WXYZ-Wing) advance the puzzle from this state — the next step likely needs a forcing chain. The correct digit at <span class="rc-hot-spot" data-cell-index="${bestI}">${rcLabel(bestI)}</span> is <strong>${d}</strong> (verified by brute-force solve).</p>`,
            };
        }
        steps.push(stepToOutput(step));
        if (step.rating > maxRating) maxRating = step.rating;
        ({ digits, candidates } = applyStep({ digits, candidates }, step));
        // Round-12 — REC-5. After any higher-strategy step, drain
        // every single it unlocked before looping back to the full
        // ladder. Single-firing strategies (NakedSingle / HiddenSingle)
        // typically cascade after a Locked Candidates / Pair / Wing
        // hit, so collecting them here saves N-1 walks of the 18
        // higher strategies that wouldn't have fired anyway.
        const state = { digits, candidates };
        const { steppedAny } = drainSingles(state, (s) => {
            steps.push(stepToOutput(s));
            if (s.rating > maxRating) maxRating = s.rating;
        });
        if (steppedAny) {
            digits = state.digits;
            candidates = state.candidates;
        }
    }
    return {
        id: initialDigits,
        fd: fd,
        rt: maxRating.toFixed(1),
        ss: steps,
    };
}

// Difficulty rating without producing the full step list — useful for
// the generator. Returns either:
//   - null if the puzzle is unsolvable (no fd from brute-force)
//   - a number (the max step rating) — backwards-compatible shape
//   - { rating, usedTrialAndError } when opts.detailed is true —
//     Round-11 (2026-05-01): generator uses this so it can reject
//     puzzles that needed T&E (the strategy ladder couldn't carry the
//     solve) instead of bucketing them into Evil. T&E results were
//     previously rated 7.0 and lumped in with legitimate Evil
//     puzzles requiring Hidden Quad / Jellyfish / WXYZ-Wing; the new
//     bucket separation gives Evil a more honest meaning.
//
// opts.maxRating (Round-11 H3 short-circuit) lets the caller declare
// an upper bound — once running maxRating exceeds it, the function
// returns early because the puzzle has already overshot the target
// band and the rest of the solve is wasted work.
export function rateDifficulty(initialDigits, opts) {
    opts = opts || {};
    const fd = bruteForceSolve(initialDigits);
    if (!fd) return null;
    let digits = initialDigits.split('');
    let candidates = computeCandidates(digits);
    let maxRating = 0;
    let usedTrialAndError = false;
    let safetyCounter = 0;
    // Round-12 (2026-05-01) — REC-5. Singles fast-path. drainSingles
    // pulls every available NakedSingle / HiddenSingle into maxRating
    // without re-walking the full 18-strategy ladder between each one.
    // The generator's retry loop calls this per dug-out puzzle; the
    // singles cascade typically dominates the early phase of every
    // rate, so the saving is multiplied by the retry count (up to 32
    // attempts on Hell). Same maxRating tracking + same opts.maxRating
    // short-circuit semantics — the only change is iteration order.
    {
        const state = { digits, candidates };
        const result = drainSingles(state, (step) => {
            if (step.rating > maxRating) maxRating = step.rating;
        });
        if (result.steppedAny) {
            digits = state.digits;
            candidates = state.candidates;
        }
        // Honour the maxRating short-circuit even when only singles
        // fired (defensive — singles are 1.0 / 1.2, well below any
        // cap, but the generator passes integer caps for level 1
        // where 1.4 is the cap, and a stray reading wouldn't matter).
        if (opts.maxRating !== undefined && maxRating > opts.maxRating) {
            if (opts.detailed) return { rating: maxRating, usedTrialAndError };
            return maxRating;
        }
    }
    while (digits.indexOf('0') !== -1) {
        if (++safetyCounter > 1000) {
            if (opts.detailed) return { rating: maxRating, usedTrialAndError };
            return null;
        }
        let step = null;
        for (const strategy of STRATEGIES) {
            step = strategy({ digits, candidates });
            if (step) break;
        }
        if (!step) {
            // Beyond the implemented strategy ladder — would need a
            // forcing chain / ALS / AIC. Mark as T&E and stop.
            maxRating = Math.max(maxRating, 7.0);
            usedTrialAndError = true;
            break;
        }
        if (step.rating > maxRating) maxRating = step.rating;
        // H3 short-circuit: caller declared a maxRating cap and we've
        // already overshot it. Stop solving and return the running
        // max — the caller (generator) will reject this puzzle anyway.
        if (opts.maxRating !== undefined && maxRating > opts.maxRating) {
            break;
        }
        ({ digits, candidates } = applyStep({ digits, candidates }, step));
        // Round-12 — REC-5. Drain any singles that became available
        // after this higher-strategy step before looping back to the
        // full ladder.
        const state = { digits, candidates };
        const result = drainSingles(state, (s) => {
            if (s.rating > maxRating) maxRating = s.rating;
        });
        if (result.steppedAny) {
            digits = state.digits;
            candidates = state.candidates;
        }
        if (opts.maxRating !== undefined && maxRating > opts.maxRating) {
            break;
        }
    }
    if (opts.detailed) {
        return { rating: maxRating, usedTrialAndError };
    }
    return maxRating;
}
