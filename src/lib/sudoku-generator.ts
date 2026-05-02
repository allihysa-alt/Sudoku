/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port from the CRA blueprint at
// C:\Users\ismoo\Desktop\sudoku-web-app-master\src\lib\sudoku-generator.js.

// Built-in puzzle generator.
//
// Strategy:
//   1. Generate a complete random solved grid via shuffled backtracking.
//   2. Dig holes pair-wise with rotational 180° symmetry — for each
//      pair (i, 80-i) try removing both cells; only keep the pair
//      removal if the puzzle remains uniquely solvable. Fall back to
//      unilateral removal (one cell of the pair) when symmetric
//      removal would break uniqueness, so target-clue counts still
//      land in band on symmetry-resistant solutions. Centre cell
//      (i=40) is its own "pair" — handled as a singleton.
//   3. Stop when the puzzle has at most `targetClues` filled cells, or
//      when no further removal preserves uniqueness.
//   4. Rate the result with rateDifficulty(); if it doesn't fit the
//      target band, retry up to a few times before accepting whatever
//      we got.
//
// The output {digits, rating, level} is suitable for handing directly
// to `?s=<digits>&d=<level>`, which is how the existing app loads
// puzzles. Round-11 (2026-05-01) introduced the symmetric digger;
// pre-Round-11 the digger picked single cells in random order with
// no symmetry constraint, so generated puzzles had a "scattershot"
// givens layout. Symmetric digging matches the visual style of
// published newspaper puzzles (NYT, NIKOLI, Times) where rotational
// symmetry is near-universal.

import { countSolutions, rateDifficulty } from './sudoku-strategies';

const ALL_DIGITS = '123456789';

// Rough calibration. Lower clue-count = harder. Rating ceiling enforces
// "this puzzle uses at-most this strategy level." See sudoku-strategies.js
// for the full rating scale. After the G-05 hint-engine expansion the
// implemented ladder is:
//   Singles                  1.0 / 1.2
//   Locked Candidates        2.6 / 2.8
//   Naked / Hidden Pair      3.0 / 3.4
//   Naked / Hidden Triplet   3.6 / 4.0
//   Skyscraper, 2-String Kite 4.0 / 4.1
//   X-Wing, XY-Wing, W-Wing  4.2 / 4.4 / 4.4
//   Swordfish                4.6
//   Naked Quad, Jellyfish    5.0 / 5.2
//   Hidden Quad              5.4
//   Trial & Error fallback   7.0  (forcing-chain territory)
//
// minRating + maxRating define the *target band* per level. If the dug
// puzzle's actual rating falls outside the band, the generator retries
// up to `retries` times before falling back to the closest attempt.
// Bands overlap intentionally so a puzzle near a tier boundary can serve
// either level depending on what was asked for.
//
// Round-11 (2026-05-01) recalibration:
//   Evil floor moved to 5.4 (Hidden Quad) so the band no longer
//     overlaps with Master, and so any puzzle the strategy ladder
//     couldn't carry (T&E fallback at 7.0) gets rejected at the
//     generator level instead of polluting the Evil bucket. The
//     PROFILES.allowTrialAndError flag (default false) is the gate;
//     setting it true would re-admit T&E puzzles for a future
//     "Diabolical" / forcing-chain bucket.
//
// Batch-1 recalibration (was tuned for the pre-G-05 ladder where anything
// above Swordfish dropped to T&E):
//   Hard now caps at 4.1 — it stops just below the wing tier.
//   Master (renamed from Diabolical) targets the wing/Swordfish/Naked-Quad
//     window 4.0–5.1. Demands genuine wing-class technique recognition.
const PROFILES = {
    1: { name: 'Easy',   targetClues: 40, minRating: 0.0, maxRating: 1.4, retries: 4,  allowTrialAndError: false },
    2: { name: 'Medium', targetClues: 32, minRating: 1.3, maxRating: 2.9, retries: 12, allowTrialAndError: false },
    3: { name: 'Hard',   targetClues: 26, minRating: 2.6, maxRating: 4.1, retries: 16, allowTrialAndError: false },
    4: { name: 'Master', targetClues: 23, minRating: 4.0, maxRating: 5.1, retries: 20, allowTrialAndError: false },
    5: { name: 'Evil',   targetClues: 20, minRating: 5.4, maxRating: 6.9, retries: 24, allowTrialAndError: false },
    // Round-11 (2026-05-01): Hell — the bucket Evil shed in the
    // T&E split. minRating 7.0 with allowTrialAndError true means
    // we *require* the strategy ladder to give up; only puzzles
    // that exhausted the implemented strategies (Naked Single …
    // WXYZ-Wing) and would need a forcing chain / ALS / AIC are
    // accepted. retries bumped to 32 because finding such a puzzle
    // statistically takes more attempts.
    6: { name: 'Hell',   targetClues: 18, minRating: 7.0, maxRating: 99,  retries: 32, allowTrialAndError: true  },
};

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Fast peer check used by both solved-grid generation and hole-digging.
function isLegal(digits, pos, d) {
    const r = Math.floor(pos / 9), c = pos % 9;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let j = 0; j < 9; j++) {
        if (digits[r * 9 + j] === d) return false;
        if (digits[j * 9 + c] === d) return false;
    }
    for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
            if (digits[(br + dr) * 9 + (bc + dc)] === d) return false;
        }
    }
    return true;
}

function generateSolvedGrid() {
    const digits = new Array(81).fill('0');
    if (fill(digits, 0)) return digits.join('');
    return null;
}

function fill(digits, pos) {
    if (pos === 81) return true;
    if (digits[pos] !== '0') return fill(digits, pos + 1);
    const choices = shuffle(ALL_DIGITS.split(''));
    for (const d of choices) {
        if (isLegal(digits, pos, d)) {
            digits[pos] = d;
            if (fill(digits, pos + 1)) return true;
        }
    }
    digits[pos] = '0';
    return false;
}

// Round-11: symmetric digger.
// Build the work list as 40 rotational-180° pairs + the centre singleton.
// For each pair we first try removing both ends; if that breaks uniqueness
// we fall back to unilateral removal of one end (deterministic order:
// lower-index cell first, then higher-index). Each tryRemove() does at
// most one countSolutions() call. Worst case three calls per pair (both,
// then a, then b); typical case one (the symmetric removal succeeds).
function digHoles(solved, targetClues) {
    const digits = solved.split('');
    const pairs = [];
    for (let i = 0; i < 40; i++) {
        pairs.push([i, 80 - i]);
    }
    pairs.push([40]); // centre cell — its own rotational pair
    const order = shuffle(pairs);
    let clues = 81;

    // Pair removal can overshoot targetClues by 1 (e.g. clues=27 → 25
    // when target is 26). The generatePuzzle retry loop already filters
    // by rating, so a slightly-deeper-than-target dig either lands in
    // band (acceptable) or triggers a retry (also acceptable). No
    // explicit floor here — letting the pair sit gives cleaner symmetry.
    const tryRemove = (positions) => {
        const saved = positions.map(p => digits[p]);
        positions.forEach(p => { digits[p] = '0'; });
        if (countSolutions(digits.join(''), 2) === 1) {
            clues -= positions.length;
            return true;
        }
        positions.forEach((p, idx) => { digits[p] = saved[idx]; });
        return false;
    };

    for (const pair of order) {
        if (clues <= targetClues) break;
        if (pair.length === 2) {
            // Symmetric removal first.
            if (tryRemove([pair[0], pair[1]])) continue;
            // Fall back to unilateral on the lower-index cell, then the higher.
            if (tryRemove([pair[0]])) continue;
            tryRemove([pair[1]]);
        } else {
            tryRemove([pair[0]]);
        }
    }
    return digits.join('');
}

// Generate a puzzle for the given level (1..5). Returns
// { digits, rating, level }. Tries to land within the level's
// [minRating, maxRating] band; if no attempt fits, returns the
// closest one.
//
// Round-11 (2026-05-01):
//   - rateDifficulty is called with { detailed: true, maxRating } so
//     we can (a) reject T&E fallback puzzles when the profile says so
//     and (b) short-circuit solves that overshoot the band ceiling
//     (saves the rest of the ladder walk on rejected attempts).
//   - The "closest fallback" path also respects allowTrialAndError —
//     a T&E result is only acceptable as a fallback when the profile
//     explicitly opts in.
export function generatePuzzle(level) {
    const profile = PROFILES[level] || PROFILES[1];
    let best = null;
    let bestDistance = Infinity;
    for (let attempt = 0; attempt < profile.retries; attempt++) {
        const solved = generateSolvedGrid();
        if (!solved) continue;
        const puzzle = digHoles(solved, profile.targetClues);
        const detail = rateDifficulty(puzzle, {
            detailed: true,
            maxRating: profile.maxRating,
        });
        if (detail === null) continue;
        const { rating, usedTrialAndError } = detail;
        if (usedTrialAndError && !profile.allowTrialAndError) {
            // Strategy ladder couldn't carry the solve — skip this
            // puzzle entirely. Don't even consider it as a fallback.
            continue;
        }
        if (rating >= profile.minRating && rating <= profile.maxRating) {
            return { digits: puzzle, rating, level };
        }
        // Out of band — keep the closest attempt as a fallback.
        const distance = Math.min(
            Math.abs(rating - profile.minRating),
            Math.abs(rating - profile.maxRating)
        );
        if (distance < bestDistance) {
            bestDistance = distance;
            best = { digits: puzzle, rating, level };
        }
    }
    if (best) return best;
    // Absolute last-resort fallback (shouldn't happen on the standard
    // levels — only kicks in if every attempt was rejected). Drops the
    // T&E filter so we still return *something* rather than infinite-
    // looping; rating may be 7.0 here. In practice the retry budgets
    // are generous enough that this branch never fires.
    const solved = generateSolvedGrid();
    const puzzle = digHoles(solved, profile.targetClues);
    const fallbackDetail = rateDifficulty(puzzle, { detailed: true });
    return {
        digits: puzzle,
        rating: fallbackDetail ? fallbackDetail.rating : null,
        level,
    };
}
