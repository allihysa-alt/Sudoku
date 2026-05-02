/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port of the CRA blueprint test. Vitest globals
// (describe / it / expect) are auto-imported via vitest.config.ts
// `globals: true`. Module imports rewritten to use the @/lib alias.

// G-04 — Tests for the local hint engine's chained / fish techniques.
//
// Each strategy is a pure function of `state = {candidates}` (some
// strategies also read state.digits, but the techniques covered here
// only consult candidates). Building the candidate array directly
// keeps these tests focused: we don't have to construct a fully-legal
// puzzle, just the constraint shape the strategy is meant to detect.

import {
    xyWing, swordfish,
    nakedTriplet, hiddenTriplet, nakedQuad, hiddenQuad,
    jellyfish, skyscraper, twoStringKite, wWing,
    uniqueRectangle, xyzWing, bugType1, wxyzWing,
} from '@/lib/sudoku-strategies';

function emptyCandidates() {
    // Empty string === "this cell already has a digit, no candidates".
    // Strategies skip cells whose candidate string is empty, which is
    // exactly the inert background state we want for these unit tests.
    return new Array(81).fill('');
}

function emptyDigits() {
    // BUG and other strategies that consult state.digits expect '0'
    // for empty cells. Tests exercising those need to pass digits too.
    return new Array(81).fill('0');
}

describe('xyWing', () => {

    test('fires on a textbook XY-Wing and emits the expected elimination', () => {
        // Pivot at R5C5 (index 40) with candidates {1, 2}.
        // Pincer 1 at R5C1 (index 36) — same row as pivot — with {1, 3}.
        // Pincer 2 at R1C5 (index  4) — same column as pivot — with {2, 3}.
        // Whichever digit pivot takes, exactly one pincer is forced
        // to 3, so any cell that sees both pincers cannot be 3.
        // R1C1 (index 0) is in the same column as pincer 1 and the
        // same row as pincer 2, so it sees both — and 3 must be
        // eliminated from it.
        const candidates = emptyCandidates();
        candidates[40] = '12';   // pivot
        candidates[36] = '13';   // pincer 1
        candidates[4]  = '23';   // pincer 2
        candidates[0]  = '349';  // target — must lose 3

        const step = xyWing({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '3': [0] });
        // The pivot is always emitted first; the two pincers follow
        // in index-ascending order (peers are iterated in index order
        // when walking the bivalue list). Order isn't load-bearing
        // for correctness, but pinning it down makes regressions
        // obvious if the iteration changes.
        expect(step.highlight[0]).toBe(40);
        expect(step.highlight.slice(1).sort((a, b) => a - b)).toEqual([4, 36]);
        expect(step.rating).toBe(4.4);
        expect(step.title).toContain('XY-Wing');
        expect(step.title).toContain('eliminate 3');
    });

    test('returns null when every bivalue cell shares the same two digits (no third digit Z)', () => {
        // A cluster of bivalue cells that all hold {1, 2} cannot form
        // an XY-wing — there is no third digit Z to chain through.
        // This is the canonical degenerate case the implementation
        // explicitly rules out (Z must differ from both pivot digits).
        const candidates = emptyCandidates();
        candidates[0]  = '12';
        candidates[1]  = '12';
        candidates[2]  = '12';
        candidates[10] = '12';
        candidates[19] = '12';

        expect(xyWing({ candidates })).toBeNull();
    });

    test('returns null when a valid pivot/pincer triple exists but no cell sees both pincers with Z', () => {
        // Same wing geometry as the positive test, but the only
        // candidate cell that sees both pincers (R1C1) does NOT
        // currently have 3 in its candidate set — so there is
        // nothing to eliminate. The strategy must hold off rather
        // than emit an empty step.
        const candidates = emptyCandidates();
        candidates[40] = '12';
        candidates[36] = '13';
        candidates[4]  = '23';
        candidates[0]  = '49';   // no 3 here

        expect(xyWing({ candidates })).toBeNull();
    });

});


describe('swordfish', () => {

    test('fires on a textbook row-based Swordfish and emits the expected elimination', () => {
        // Digit 1 occurs in rows 1, 5 and 9 only — and in those rows
        // only at columns 1, 5 and 9. The 3-row × 3-column lattice
        // is a Swordfish: one cell in each of those rows must hold
        // 1, so 1 can be removed from any other cell in those three
        // columns. Cell R2C1 (index 9) carries a 1 candidate that
        // sits in column 1 but in row 2 (outside the Swordfish), so
        // the strategy must flag it for elimination.
        const candidates = emptyCandidates();
        // Swordfish lattice — row, col → cell index.
        candidates[0]  = '1';   // R1C1
        candidates[4]  = '1';   // R1C5
        candidates[40] = '1';   // R5C5
        candidates[44] = '1';   // R5C9
        candidates[72] = '1';   // R9C1
        candidates[80] = '1';   // R9C9
        // Off-lattice candidate that should be eliminated.
        candidates[9]  = '1';   // R2C1

        const step = swordfish({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '1': [9] });
        // The 6 lattice cells should appear as highlight; order
        // mirrors the row-walk (row 1 cells, then row 5, then row 9).
        expect(step.highlight).toEqual([0, 4, 40, 44, 72, 80]);
        expect(step.rating).toBe(4.6);
        expect(step.title).toContain('Swordfish');
        expect(step.title).toContain('rows 1, 5 & 9');
    });

    test('fires on a column-based Swordfish when row detection cannot apply', () => {
        // Same digit, transposed lattice — three columns (1, 4, 7)
        // whose 1-positions sit in three rows (1, 5, 9). To make
        // sure the row-based check cannot fire first, R1C2 carries
        // an extra 1 candidate. Row 1 then has 1s in {col 1, col 2,
        // col 4} and the row-based union spans 4 columns instead
        // of 3 — the row-based path returns null and the
        // column-based path takes over.
        const candidates = emptyCandidates();
        candidates[0]  = '1';   // R1C1
        candidates[1]  = '1';   // R1C2 — disqualifies the row-based path
        candidates[3]  = '1';   // R1C4
        candidates[36] = '1';   // R5C1
        candidates[42] = '1';   // R5C7
        candidates[75] = '1';   // R9C4
        candidates[78] = '1';   // R9C7

        const step = swordfish({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        // Only R1C2 (index 1) sits in a Swordfish row but outside
        // the three Swordfish columns, so it is the lone target.
        expect(step.removed).toEqual({ '1': [1] });
        expect(step.rating).toBe(4.6);
        expect(step.title).toContain('Swordfish');
        expect(step.title).toContain('columns 1, 4 & 7');
        // Column-walk highlight order: col 1 cells, col 4, col 7.
        expect(step.highlight).toEqual([0, 36, 3, 75, 42, 78]);
    });

    test('returns null when three rows hold the digit but their column union exceeds three', () => {
        // Three rows each contributing a bivalue stripe of 1s, but
        // collectively they cover four columns — no Swordfish.
        // Crucially the column-based path is also stuck (only two
        // columns end up with the required ≥2 candidates), so the
        // strategy as a whole must return null.
        const candidates = emptyCandidates();
        candidates[0]  = '1';   // R1C1 — col 0
        candidates[4]  = '1';   // R1C5 — col 4
        candidates[40] = '1';   // R5C5 — col 4
        candidates[41] = '1';   // R5C6 — col 5  ← drags the union to 4 cols
        candidates[72] = '1';   // R9C1 — col 0
        candidates[80] = '1';   // R9C9 — col 8

        expect(swordfish({ candidates })).toBeNull();
    });

    test('returns null when the Swordfish geometry is valid but no candidate sits outside it', () => {
        // Same lattice as the positive row-based test, but the
        // off-lattice candidate at R2C1 has been removed. The
        // technique fits geometrically, but there is nothing to
        // eliminate — the strategy must hold off rather than emit
        // an empty step.
        const candidates = emptyCandidates();
        candidates[0]  = '1';
        candidates[4]  = '1';
        candidates[40] = '1';
        candidates[44] = '1';
        candidates[72] = '1';
        candidates[80] = '1';

        expect(swordfish({ candidates })).toBeNull();
    });

});


// G-05 — Tests for the post-G-04 strategies (subset-3/4, larger
// fish, single-digit chains, W-Wing). Each follows the same shape
// as the xyWing/swordfish tests above: build a minimal candidate
// array that isolates the technique's geometric trigger, call the
// strategy directly, assert the emitted step.

describe('nakedTriplet', () => {

    test('fires on a textbook column triple and emits the expected eliminations', () => {
        // Cells R1C1, R2C1, R3C1 in column 1 carry candidates
        // {1,2}, {2,3}, {1,3} — combined union {1,2,3}, exactly the
        // size-3 trigger. R4C1 (index 27) carries '149' and so must
        // lose 1 once the triple's three digits are clamped to the
        // first three cells.
        const candidates = emptyCandidates();
        candidates[0]  = '12';
        candidates[9]  = '23';
        candidates[18] = '13';
        candidates[27] = '149';

        const step = nakedTriplet({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '1': [27] });
        expect(step.highlight).toEqual([0, 9, 18]);
        expect(step.rating).toBe(3.6);
        expect(step.title).toContain('Naked Triplet');
    });

    test('returns null when three cells share two digits but a fourth disrupts the union size', () => {
        // {1,2}, {1,2}, {2,3} → union size 3 *would* qualify, but
        // one of the cells holds an extra digit so the union jumps
        // to size 4. The check `union.length !== 3` keeps the strategy
        // from misfiring.
        const candidates = emptyCandidates();
        candidates[0]  = '124';   // extra '4' breaks the union
        candidates[9]  = '12';
        candidates[18] = '23';

        expect(nakedTriplet({ candidates })).toBeNull();
    });

});


describe('hiddenTriplet', () => {

    test('fires on a textbook column hidden triple and emits expected eliminations', () => {
        // In column 1, digits 1, 2 and 3 each appear in exactly
        // two cells, all of which sit inside {R1C1, R2C1, R3C1}.
        // Each of those cells carries one extra digit (4, 5, 6
        // respectively); those extras must be eliminated since
        // 1/2/3 already need all three slots.
        const candidates = emptyCandidates();
        candidates[0]  = '1234';
        candidates[9]  = '1235';
        candidates[18] = '1236';

        const step = hiddenTriplet({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '4': [0], '5': [9], '6': [18] });
        expect(step.highlight).toEqual([0, 9, 18]);
        expect(step.rating).toBe(4.0);
        expect(step.title).toContain('Hidden Triplet');
    });

});


describe('nakedQuad', () => {

    test('fires on a textbook column quad and emits expected eliminations', () => {
        // Four cells in column 1 carry {1,2}, {2,3}, {3,4}, {1,4}
        // — combined union {1,2,3,4}. R5C1 carries an extra 1 that
        // must be cleared.
        const candidates = emptyCandidates();
        candidates[0]  = '12';
        candidates[9]  = '23';
        candidates[18] = '34';
        candidates[27] = '14';
        candidates[36] = '15';

        const step = nakedQuad({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '1': [36] });
        expect(step.highlight).toEqual([0, 9, 18, 27]);
        expect(step.rating).toBe(5.0);
        expect(step.title).toContain('Naked Quad');
    });

});


describe('hiddenQuad', () => {

    test('fires on a textbook column hidden quad and emits expected eliminations', () => {
        // Digits 1, 2, 3, 4 each appear only in the first four cells
        // of column 1; each of those cells carries one extra
        // candidate (5, 6, 7, 8). The hidden quad clamps {1,2,3,4}
        // to those four cells, evicting the extras.
        const candidates = emptyCandidates();
        candidates[0]  = '12345';
        candidates[9]  = '12346';
        candidates[18] = '12347';
        candidates[27] = '12348';

        const step = hiddenQuad({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '5': [0], '6': [9], '7': [18], '8': [27] });
        expect(step.highlight).toEqual([0, 9, 18, 27]);
        expect(step.rating).toBe(5.4);
        expect(step.title).toContain('Hidden Quad');
    });

});


describe('jellyfish', () => {

    test('fires on a textbook row Jellyfish and emits expected eliminations', () => {
        // Digit 1 only appears in rows 1, 3, 5, 7 — and in those
        // rows only in columns 1, 3, 5, 7. The 4-row × 4-col lattice
        // is a Jellyfish: one cell in each row must hold 1, so 1
        // can be removed from any other cell in those four columns.
        // R2C1 (index 9) has an off-lattice 1 that must be cleared.
        const candidates = emptyCandidates();
        // Row 1 (cells 0-8): 1 at cols 0, 2, 4, 6
        candidates[0]  = '1';
        candidates[2]  = '1';
        candidates[4]  = '1';
        candidates[6]  = '1';
        // Row 3: 1 at cols 0, 2
        candidates[18] = '1';
        candidates[20] = '1';
        // Row 5: 1 at cols 4, 6
        candidates[40] = '1';
        candidates[42] = '1';
        // Row 7: 1 at cols 0, 6
        candidates[54] = '1';
        candidates[60] = '1';
        // Off-lattice target in column 0, row 2 (outside Jellyfish rows)
        candidates[9]  = '1';

        const step = jellyfish({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '1': [9] });
        expect(step.rating).toBe(5.2);
        expect(step.title).toContain('Jellyfish');
        expect(step.title).toContain('rows 1, 3, 5, 7');
    });

});


describe('skyscraper', () => {

    test('fires on a textbook two-row skyscraper sharing a column and emits expected eliminations', () => {
        // For digit 1: row 1 has only cells (R1C1, R1C5); row 3 has
        // only cells (R3C1, R3C6). They share column 1; the tops are
        // R1C5 (cell 4, box 1) and R3C6 (cell 23, box 1) — both in
        // box 1, so any other cell in box 1 with a 1 candidate sees
        // both. R2C5 (cell 13) is the lone target.
        const candidates = emptyCandidates();
        candidates[0]  = '1';   // base — R1C1
        candidates[4]  = '1';   // top1 — R1C5
        candidates[18] = '1';   // base — R3C1
        candidates[23] = '1';   // top2 — R3C6
        candidates[13] = '1';   // target — R2C5 (box 1)

        const step = skyscraper({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '1': [13] });
        expect(step.rating).toBe(4.0);
        expect(step.title).toContain('Skyscraper');
    });

    test('does not misfire as Skyscraper on an X-Wing geometry', () => {
        // Two parallel rows where the digit's two candidates land in
        // the SAME pair of columns is an X-Wing, not a Skyscraper.
        // The strategy must skip that case (the explicit
        // `if (freeColA === freeColB) continue` guard) — X-Wing is
        // a separate strategy upstream.
        const candidates = emptyCandidates();
        candidates[0]  = '1';   // R1C1
        candidates[4]  = '1';   // R1C5
        candidates[36] = '1';   // R5C1
        candidates[40] = '1';   // R5C5

        expect(skyscraper({ candidates })).toBeNull();
    });

});


describe('twoStringKite', () => {

    test('fires on a textbook 2-string kite and emits expected eliminations', () => {
        // Digit 1: row 1 has 1 only at cells R1C1 and R1C6.
        // Column 5 has 1 only at cells R2C5 and R8C5.
        // R1C6 (cell 5, box 1) and R2C5 (cell 13, box 1) share box 1.
        // Free ends: R1C1 (cell 0) and R8C5 (cell 67).
        // R8C1 (cell 63) sees the row-1 free end via column 1 and the
        // col-5 free end via row 8 — must lose 1.
        const candidates = emptyCandidates();
        candidates[0]  = '1';   // row 1 free end
        candidates[5]  = '1';   // row 1 box-anchor
        candidates[13] = '1';   // col 5 box-anchor
        candidates[67] = '1';   // col 5 free end
        candidates[63] = '1';   // target — R8C1

        const step = twoStringKite({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed['1']).toContain(63);
        expect(step.rating).toBe(4.1);
        expect(step.title).toContain('2-String Kite');
    });

});


describe('wWing', () => {

    test('fires on a textbook W-Wing and emits expected eliminations', () => {
        // X = R1C1 (cell 0), Y = R9C9 (cell 80) — both bivalue {1,2},
        // not peers. Strong link on 2 in row 5: cells R5C1 (36) and
        // R5C9 (44). 36 is a peer of X via column 1; 44 is a peer of
        // Y via column 9. If both X and Y were 2, the row-5 strong
        // link would have no candidates left — contradiction. So at
        // least one of X, Y is 1, and any cell seeing both can be
        // cleared of 1. R1C9 (cell 8) is a target.
        const candidates = emptyCandidates();
        candidates[0]  = '12';   // X
        candidates[80] = '12';   // Y
        candidates[36] = '2';    // strong link end — peer of X
        candidates[44] = '2';    // strong link end — peer of Y
        candidates[8]  = '13';   // target — must lose 1

        const step = wWing({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed['1']).toContain(8);
        expect(step.rating).toBe(4.4);
        expect(step.title).toContain('W-Wing');
    });

    test('returns null when the two bivalue cells are peers of each other', () => {
        // The two bivalue cells X and Y must NOT be peers — if they
        // are, the puzzle's normal peer constraint already does the
        // work and the W-Wing argument is vacuous. The strategy's
        // `isPeer(X, Y)` guard skips that case.
        const candidates = emptyCandidates();
        candidates[0]  = '12';   // X — R1C1
        candidates[1]  = '12';   // Y — R1C2 (peer of X via row 1)
        candidates[36] = '2';
        candidates[37] = '2';
        candidates[8]  = '13';

        expect(wWing({ candidates })).toBeNull();
    });

});


// ---------- Tier-2 strategy tests (Theme batch v2) ----------

describe('uniqueRectangle (Type 1)', () => {

    test('fires when 3 cells share a bivalue pair across a 2-box rectangle and the 4th has extras', () => {
        // Rectangle corners at R1C1 (idx 0), R1C2 (idx 1), R2C1 (idx 9), R2C2 (idx 10).
        // R1C1 / R1C2 are in box 0; R2C1 / R2C2 are also in box 0 — wait, that's a
        // single-box rectangle. We need 2 boxes. Pick R1C1 (box 0) / R1C4 (idx 3, box 1) /
        // R2C1 (idx 9, box 0) / R2C4 (idx 12, box 1) — 2 rows × 2 cols × 2 boxes.
        const candidates = emptyCandidates();
        candidates[0]  = '13';   // R1C1, box 0
        candidates[3]  = '13';   // R1C4, box 1
        candidates[9]  = '13';   // R2C1, box 0
        candidates[12] = '139';  // R2C4, box 1 — has extras: '9'

        const step = uniqueRectangle({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        // Both digits eliminated from corner4 (index 12).
        expect(step.removed).toEqual({ '1': [12], '3': [12] });
        expect(step.highlight).toContain(12);
        expect(step.rating).toBe(4.5);
        expect(step.title).toContain('Unique Rectangle (Type 1)');
    });

    test('returns null when the rectangle spans 4 boxes (not 2)', () => {
        // A 3-row x 3-col-spaced rectangle (rows 0,5; cols 0,5) lands in 4 different
        // boxes — the deadly-pattern argument doesn't hold the same way for
        // UR Type 1. The strategy must hold off.
        const candidates = emptyCandidates();
        candidates[0]   = '13';   // R1C1 — box 0
        candidates[5]   = '13';   // R1C6 — box 1
        candidates[45]  = '13';   // R6C1 — box 6
        candidates[50]  = '139';  // R6C6 — box 7
        // 4 different boxes (0, 1, 6, 7) — UR1 declines.

        expect(uniqueRectangle({ candidates })).toBeNull();
    });

    test('returns null when the 4th cell has only the bivalue pair (no extras)', () => {
        // Without extras on the fourth cell, eliminating both pair digits
        // would leave the cell empty — that's not a UR1 elimination, that
        // would be a contradiction.
        const candidates = emptyCandidates();
        candidates[0]  = '13';
        candidates[3]  = '13';
        candidates[9]  = '13';
        candidates[12] = '13';   // 4th corner has same pair, no extras

        expect(uniqueRectangle({ candidates })).toBeNull();
    });

});


describe('xyzWing', () => {

    test('fires on a textbook XYZ-Wing and emits the expected elimination', () => {
        // Pivot at R1C1 (idx 0) with {1,2,3}. Pincer 1 at R1C2 (idx 1, same row) with {1,3}.
        // Pincer 2 at R2C1 (idx 9, same column) with {2,3}. Z = 3.
        // Cells that see all three are in box 0 (which contains all three).
        // R3C2 (idx 19) sees pivot via box, pincer1 via box, pincer2 via box — all three.
        const candidates = emptyCandidates();
        candidates[0]  = '123';  // pivot
        candidates[1]  = '13';   // pincer 1 (same row as pivot)
        candidates[9]  = '23';   // pincer 2 (same column as pivot)
        candidates[19] = '349';  // target — sees all three via box 0; loses 3

        const step = xyzWing({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '3': [19] });
        expect(step.highlight).toContain(0);
        expect(step.rating).toBe(4.6);
        expect(step.title).toContain('XYZ-Wing');
    });

    test('returns null when no cell sees all three wing cells', () => {
        // Same wing geometry, but no candidate cell sees pivot AND
        // both pincers. R5C5 (idx 40) is not a peer of R1C1 / R1C2 /
        // R2C1 — different row, column, and box.
        const candidates = emptyCandidates();
        candidates[0]  = '123';
        candidates[1]  = '13';
        candidates[9]  = '23';
        candidates[40] = '349';   // far away, not a peer of all three

        expect(xyzWing({ candidates })).toBeNull();
    });

});


describe('bugType1', () => {

    test('fires when every empty cell is bivalue except one with three candidates', () => {
        // Build a synthetic state: most cells filled, a small handful
        // empty. The trivalent cell at idx 4 (R1C5) has candidates {1,2,3};
        // its row (row 0) contains:
        //   idx 0 with {1,3}   — '1' and '3'
        //   idx 4 with {1,2,3} — trivalue
        //   idx 8 with {2,3}   — '2' and '3'
        // Counts in row 0:
        //   '1' → 2 (idx 0, 4)
        //   '2' → 2 (idx 4, 8)
        //   '3' → 3 (idx 0, 4, 8)  ← the EXTRA digit
        // The strategy should place '3' at idx 4.
        const digits = new Array(81).fill('5');         // pretend everything else is filled
        const candidates = new Array(81).fill('');
        digits[0] = '0'; candidates[0] = '13';
        digits[4] = '0'; candidates[4] = '123';         // trivalue
        digits[8] = '0'; candidates[8] = '23';

        const step = bugType1({ digits, candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('place');
        expect(step.cell).toBe(4);
        expect(step.digit).toBe('3');
        expect(step.rating).toBe(5.0);
        expect(step.title).toContain('Bivalue Universal Grave');
    });

    test('returns null when more than one cell has 3 candidates', () => {
        const digits = new Array(81).fill('5');
        const candidates = new Array(81).fill('');
        digits[0] = '0'; candidates[0] = '123';
        digits[1] = '0'; candidates[1] = '123';
        digits[2] = '0'; candidates[2] = '12';

        expect(bugType1({ digits, candidates })).toBeNull();
    });

    test('returns null when an empty cell has 4+ candidates', () => {
        const digits = new Array(81).fill('5');
        const candidates = new Array(81).fill('');
        digits[0] = '0'; candidates[0] = '1234';   // 4-cand kills BUG
        digits[1] = '0'; candidates[1] = '12';

        expect(bugType1({ digits, candidates })).toBeNull();
    });

});


describe('wxyzWing', () => {

    test('fires on a 4-cell WXYZ-Wing and emits the expected elimination', () => {
        // Pivot at R1C1 (idx 0) with {1,2,3,4}. Three bivalue pincers
        // sharing Z=4 with the pivot, each in a unit with the pivot:
        //   R1C2 (idx 1, same row) with {1,4}
        //   R2C1 (idx 9, same col) with {2,4}
        //   R2C2 (idx 10, same box 0) with {3,4}
        // Target: a cell peer to all four. R3C3 (idx 20) is in box 0,
        // peer of all four via box-membership.
        const candidates = emptyCandidates();
        candidates[0]  = '1234';  // pivot
        candidates[1]  = '14';    // pincer w
        candidates[9]  = '24';    // pincer x
        candidates[10] = '34';    // pincer y
        candidates[20] = '459';   // target — loses 4

        const step = wxyzWing({ candidates });

        expect(step).not.toBeNull();
        expect(step.kind).toBe('eliminate');
        expect(step.removed).toEqual({ '4': [20] });
        expect(step.highlight).toContain(0);
        expect(step.highlight.length).toBe(4);
        expect(step.rating).toBe(5.6);
        expect(step.title).toContain('WXYZ-Wing');
    });

    test('returns null when no target cell sees all four wing cells', () => {
        // Same wing geometry, but the candidate cell isn't a peer of
        // all four — R9C9 is not in row 1, column 1, or box 0.
        const candidates = emptyCandidates();
        candidates[0]  = '1234';
        candidates[1]  = '14';
        candidates[9]  = '24';
        candidates[10] = '34';
        candidates[80] = '459';   // R9C9 — peer of nothing in box 0

        expect(wxyzWing({ candidates })).toBeNull();
    });

});
