/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port of the CRA blueprint test. Vitest globals
// (describe / it / expect) are auto-imported via vitest.config.ts
// `globals: true`. Module imports rewritten to use the @/lib alias.

import { newSudokuModel, modelHelpers, SETTINGS } from '@/lib/sudoku-model';
// import { List } from 'immutable';
import { List } from '@/lib/not-mutable';

const initialDigitsPartial =
    '000008000' +
    '000007000' +
    '123456789' +
    '000005000' +
    '000004000' +
    '000003000' +
    '000002000' +
    '000001000' +
    '000009000';

const initialDigitsComplete =
    '000001230' +
    '123008040' +
    '804007650' +
    '765000000' +
    '000000000' +
    '000000123' +
    '012300804' +
    '080400765' +
    '076500000';

const finalDigitsComplete =
    '657941238' +
    '123658947' +
    '894237651' +
    '765123489' +
    '231894576' +
    '948765123' +
    '512376894' +
    '389412765' +
    '476589312';

function mapPropNames (map) {
    // Not sure why map.keys() doesn't work
    return Object.keys( map.toObject() ).sort();
}

function digitsFromGrid(grid) {
    return grid.get('cells').map(c => c.get('digit')).join('');
}

function selectedCells(grid) {
    return grid.get('cells').filter(c => c.get('isSelected')).map(c => c.get('index')).join(',');
}

function pencilDigits (set) {
    return set.toArray().join('');
}

test('initialise grid (partial)', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    const propNames = mapPropNames(grid);
    expect(propNames).toStrictEqual([
        "cells",
        "completedDigits",
        "currentSnapshot",
        "difficultyLevel",
        "endTime",
        "featureFlags",
        "focusIndex",
        "hasErrors",
        "hintsUsed",
        "initialDigits",
        "inputMode",
        "intervalStartTime",
        "lockedHardcore",
        "matchDigit",
        "modalState",
        "mode",
        "onPuzzleStateChange",
        "pausedAt",
        "puzzleStateKey",
        "redoList",
        "selectionMode",
        "settings",
        "showCandidates",
        "showPencilmarks",
        "showSnyderMarks",
        "solved",
        "startTime",
        "tempInputMode",
        "undoList",
    ]);

    expect(digitsFromGrid(grid)).toBe(initialDigitsPartial);
    expect(grid.get('completedDigits')).toStrictEqual({
        "1": false,
        "2": false,
        "3": false,
        "4": false,
        "5": false,
        "6": false,
        "7": false,
        "8": false,
        "9": false,
    });
    expect(grid.get('currentSnapshot')).toBe('');
    expect(grid.get('endTime')).toBe(undefined);
    expect(grid.get('focusIndex')).toBe(null);
    expect(grid.get('initialDigits')).toBe(initialDigitsPartial);
    expect(grid.get('inputMode')).toBe('digit');
    expect(grid.get('matchDigit')).toBe('0');
    expect(grid.get('modalState')).toBe(undefined);
    expect(grid.get('finalDigits')).toBe(undefined);    // Not set due to skipCheck
    expect(grid.get('mode')).toBe('solve');
    expect(grid.get('pausedAt')).toBe(undefined);
    expect(grid.get('redoList').size).toBe(0);
    expect(grid.get('solved')).toBe(false);
    expect(grid.get('startTime')/1000).toBeCloseTo(Date.now()/1000, 0);
    expect(grid.get('onPuzzleStateChange')).toBe(undefined);
    expect(grid.get('tempInputMode')).toBe(undefined);
    expect(grid.get('undoList').size).toBe(0);

    const settings = grid.get('settings')
    expect(typeof settings).toBe('object');
    const settingsKeys = Object.keys(settings).sort().join(',');
    const expectedKeys = Object.values(SETTINGS).sort().join(',');
    expect(settingsKeys).toBe(expectedKeys);
});

test('initialise grid (complete)', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsComplete});   // no skipCheck
    expect(grid.get('modalState')).toBe(undefined);
    expect(grid.get('finalDigits')).toBe(finalDigitsComplete);
});

test('initialise grid cells', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    // Expected pattern of given digits have been set up
    const cells = grid.get('cells');
    expect(List.isList(cells)).toBe(true);
    expect(cells.size).toBe(81);
    const givenDigits = cells.filter(c => c.get('isGiven'))
        .map(c => c.get('index') + ':' + c.get('digit'))
        .join(',');
    expect(givenDigits).toBe(
        '5:8,14:7,18:1,19:2,20:3,21:4,22:5,23:6,24:7,25:8,26:9,' +
        '32:5,41:4,50:3,59:2,68:1,77:9'
    );

    // No given digits are '0', all non-givens are '0'
    let cellsOK = true;
    cells.forEach(c => {
        if (c.get('isGiven')) {
            if (c.get('digit') === '0') {
                cellsOK = false;
            }
        }
        else {
            if (c.get('digit') !== '0') {
                cellsOK = false;
            }
        }
    });
    expect(cellsOK).toBe(true);

    // Examine first cell - a non-given
    const c0 = cells.get(0);
    const propNames = mapPropNames(c0);
    expect(propNames).toStrictEqual([
        "autoInner",
        "autoOuter",
        "box",
        "col",
        "colorCode",
        "digit",
        // Round-10: engineInner — engine-supplied inner pencil layer
        // (applyCalculateCandidates writes here) painted in auto colour.
        "engineInner",
        "errorMessage",
        "index",
        "innerPencils",
        "isGiven",
        "isSelected",
        "outerPencils",
        "row",
        "snapshot",
        "userHiddenInner",
        "userHiddenOuter",
    ]);
    expect(c0.get('box')).toBe(1);
    expect(c0.get('colorCode')).toBe('1');
    expect(c0.get('col')).toBe(1);
    expect(c0.get('digit')).toBe('0');
    expect(c0.get('index')).toBe(0);
    expect(c0.get('innerPencils').toArray()).toStrictEqual([]);
    expect(c0.get('errorMessage')).toBe(undefined);
    expect(c0.get('isGiven')).toBe(false);
    expect(c0.get('isSelected')).toBe(false);
    expect(c0.get('outerPencils').toArray()).toStrictEqual([]);
    expect(c0.get('row')).toBe(1);
    expect(c0.get('snapshot')).toBe('');

    expect(cells.get(3).get('box')).toBe(2);
    expect(cells.get(6).get('box')).toBe(3);
    expect(cells.get(9).get('box')).toBe(1);
    expect(cells.get(12).get('box')).toBe(2);
    expect(cells.get(15).get('box')).toBe(3);
    expect(cells.get(20).get('box')).toBe(1);
    expect(cells.get(23).get('box')).toBe(2);
    expect(cells.get(26).get('box')).toBe(3);
    expect(cells.get(37).get('box')).toBe(4);
    expect(cells.get(40).get('box')).toBe(5);
    expect(cells.get(43).get('box')).toBe(6);
    expect(cells.get(64).get('box')).toBe(7);
    expect(cells.get(67).get('box')).toBe(8);
    expect(cells.get(70).get('box')).toBe(9);

    expect(cells.get(4).get('row')).toBe(1);
    expect(cells.get(13).get('row')).toBe(2);
    expect(cells.get(22).get('row')).toBe(3);
    expect(cells.get(31).get('row')).toBe(4);
    expect(cells.get(40).get('row')).toBe(5);
    expect(cells.get(49).get('row')).toBe(6);
    expect(cells.get(58).get('row')).toBe(7);
    expect(cells.get(67).get('row')).toBe(8);
    expect(cells.get(76).get('row')).toBe(9);

    expect(cells.get(36).get('col')).toBe(1);
    expect(cells.get(37).get('col')).toBe(2);
    expect(cells.get(38).get('col')).toBe(3);
    expect(cells.get(39).get('col')).toBe(4);
    expect(cells.get(40).get('col')).toBe(5);
    expect(cells.get(41).get('col')).toBe(6);
    expect(cells.get(42).get('col')).toBe(7);
    expect(cells.get(43).get('col')).toBe(8);
    expect(cells.get(44).get('col')).toBe(9);
});

test('move input focus', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    const move = false;     // No ctrl or shift
    const extend = true;    // Ctrl/shift + move

    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.moveFocus(grid, -1, 0, move);
    expect(grid.get('focusIndex')).toBe(40);
    expect(grid.get('focusIndex')).toBe(modelHelpers.CENTER_CELL);

    grid = modelHelpers.moveFocus(grid, -1, 0, move);
    expect(grid.get('focusIndex')).toBe(39);

    grid = modelHelpers.moveFocus(grid, -1, 0, move);
    expect(grid.get('focusIndex')).toBe(38);

    grid = modelHelpers.moveFocus(grid, -1, 0, move);
    expect(grid.get('focusIndex')).toBe(37);

    grid = modelHelpers.moveFocus(grid, -1, 0, move);
    expect(grid.get('focusIndex')).toBe(36);

    grid = modelHelpers.moveFocus(grid, -1, 0, move);
    expect(grid.get('focusIndex')).toBe(44);

    grid = modelHelpers.moveFocus(grid, 1, 0, move);
    expect(grid.get('focusIndex')).toBe(36);

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    expect(grid.get('focusIndex')).toBe(0);
    grid = modelHelpers.moveFocus(grid, 0, -1, move);
    expect(grid.get('focusIndex')).toBe(72);

    grid = modelHelpers.moveFocus(grid, 0, 1, move);
    expect(grid.get('focusIndex')).toBe(0);

    // 'Home'
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', modelHelpers.CENTER_CELL);
    expect(grid.get('focusIndex')).toBe(40)

    // Extend the selection while moving focus
    expect(selectedCells(grid)).toBe('40');
    grid = modelHelpers.moveFocus(grid, 1, 0, extend);
    expect(selectedCells(grid)).toBe('40,41');
    grid = modelHelpers.moveFocus(grid, 1, 0, extend);
    expect(selectedCells(grid)).toBe('40,41,42');
    grid = modelHelpers.moveFocus(grid, -1, 0, extend);
    expect(selectedCells(grid)).toBe('40,41,42');
    grid = modelHelpers.moveFocus(grid, -1, 0, extend);
    expect(selectedCells(grid)).toBe('40,41,42');
    grid = modelHelpers.moveFocus(grid, -1, 0, extend);
    expect(selectedCells(grid)).toBe('39,40,41,42');
    grid = modelHelpers.moveFocus(grid, 0, 1, extend);
    expect(selectedCells(grid)).toBe('39,40,41,42,48');
    grid = modelHelpers.moveFocus(grid, 0, -1, extend);
    expect(selectedCells(grid)).toBe('39,40,41,42,48');
    grid = modelHelpers.moveFocus(grid, 0, -1, extend);
    expect(selectedCells(grid)).toBe('30,39,40,41,42,48');

    expect(grid.get('currentSnapshot')).toBe('');
});

test('extend selection', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(selectedCells(grid)).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 40);
    expect(selectedCells(grid)).toBe('40');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 31);
    expect(selectedCells(grid)).toBe('31');
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 40);
    expect(selectedCells(grid)).toBe('31,40');
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 39);
    expect(selectedCells(grid)).toBe('31,39,40');
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 41);
    expect(selectedCells(grid)).toBe('31,39,40,41');
    grid = modelHelpers.applySelectionOp(grid, 'toggleExtendSelection', 40);
    expect(selectedCells(grid)).toBe('31,39,41');
    grid = modelHelpers.applySelectionOp(grid, 'toggleExtendSelection', 49);
    expect(selectedCells(grid)).toBe('31,39,41,49');
});

test('input mode', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    const inputMode = (grid) => {
        return grid.get('tempInputMode') || grid.get('inputMode');
    }

    expect(grid.get('currentSnapshot')).toBe('');
    expect(inputMode(grid)).toBe('digit');

    grid = modelHelpers.setInputMode(grid, 'inner');
    expect(inputMode(grid)).toBe('inner');

    grid = modelHelpers.setTempInputMode(grid, 'outer');
    expect(inputMode(grid)).toBe('outer');

    grid = modelHelpers.setInputMode(grid, 'color');
    expect(inputMode(grid)).toBe('outer');

    grid = modelHelpers.clearTempInputMode(grid);
    expect(inputMode(grid)).toBe('color');

    grid = modelHelpers.setInputMode(grid, 'digit');
    expect(inputMode(grid)).toBe('digit');
});

test('set one digit', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 2);
    expect(grid.get('focusIndex')).toBe(2);

    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '9');

    expect(grid.get('focusIndex')).toBe(2);
    expect(grid.get('currentSnapshot')).toBe('13D9');
    expect(grid.get('matchDigit')).toBe('9');

    let c2 = grid.get('cells').get(2);
    expect(c2.get('digit')).toBe('9');
    expect(c2.get('snapshot')).toBe('D9');
    expect(c2.get('errorMessage')).toBe(undefined);
    expect(c2.get('isGiven')).toBe(false);
    expect(c2.get('isSelected')).toBe(true);

    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    expect(grid.get('focusIndex')).toBe(2);
    c2 = grid.get('cells').get(2);
    expect(c2.get('isSelected')).toBe(false);

    expect(grid.get('currentSnapshot')).toBe('13D9');
    expect(grid.get('matchDigit')).toBe('0');
    expect(digitsFromGrid(grid)).toBe(
        '009008000' +
        '000007000' +
        '123456789' +
        '000005000' +
        '000004000' +
        '000003000' +
        '000002000' +
        '000001000' +
        '000009000'
    );
});

test('attempt overwrite of given digit', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    expect(grid.get('currentSnapshot')).toBe('');

    let c41 = grid.get('cells').get(41);
    expect(c41.get('digit')).toBe('4');
    expect(c41.get('isGiven')).toBe(true);

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 41);
    expect(grid.get('focusIndex')).toBe(41);
    expect(grid.get('matchDigit')).toBe('4');

    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '2');

    // matchDigit-on-no-change behaviour (audit phase 11): pressing a
    // digit on a cell that can't accept it (given, no-op) still updates
    // matchDigit so the press lights up matching digits in the grid.
    expect(grid.get('matchDigit')).toBe('2');
    c41 = grid.get('cells').get(41);
    expect(c41.get('digit')).toBe('4');
    expect(c41.get('isGiven')).toBe(true);

    expect(grid.get('currentSnapshot')).toBe('');
    expect(digitsFromGrid(grid)).toBe(initialDigitsPartial);
});

// Round-6 (2026-04-30) — completed-digit input guard + hardcore mode.
// setDigit blocks when the requested digit is already 9-times-placed;
// toggle-off (pressing the digit on a cell that already holds it) is
// still allowed because it removes one of the 9 instances.
// Hardcore mode (lockedHardcore=true on the grid) bypasses the guard.
const completedDigit5MissingOne =
    '500000000' +
    '000500000' +
    '000000500' +
    '050000000' +
    '000050000' +
    '000000050' +
    '005000000' +
    '000005000' +
    '000000000';

test('completed-digit guard — setDigit blocked on empty cell when digit is at 9', () => {
    let grid = newSudokuModel({initialDigits: completedDigit5MissingOne, skipCheck: true});
    expect(grid.get('completedDigits')['5']).toBe(false);
    // Type '5' into cell 80 to push '5' to completed.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 80);
    grid = modelHelpers.setInputMode(grid, 'digit');
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(grid.get('cells').get(80).get('digit')).toBe('5');
    expect(grid.get('completedDigits')['5']).toBe(true);
    // Now press '5' on a different empty cell — should be blocked.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    const before = digitsFromGrid(grid);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(digitsFromGrid(grid)).toBe(before);
    // Non-completed digit ('7') still works on the same cell.
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '7');
    expect(grid.get('cells').get(1).get('digit')).toBe('7');
});

test('completed-digit guard — toggle-off allowed on cell that already holds the completed digit', () => {
    let grid = newSudokuModel({initialDigits: completedDigit5MissingOne, skipCheck: true});
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 80);
    grid = modelHelpers.setInputMode(grid, 'digit');
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(grid.get('completedDigits')['5']).toBe(true);
    // Press '5' again on cell 80 — toggle-off path. Should clear cell.
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(grid.get('cells').get(80).get('digit')).toBe('0');
    expect(grid.get('completedDigits')['5']).toBe(false);
});

test('completed-digit guard — multi-cell batch with mixed states is blocked', () => {
    let grid = newSudokuModel({initialDigits: completedDigit5MissingOne, skipCheck: true});
    // Place '5' on cell 80 to complete the digit, then place '5' on
    // cell 1 (the toggle-off cell candidate) — wait, '5' is now
    // completed so we can't add it. Instead place '7' on cell 1, and
    // then select [80, 1] and press '5'. Cell 80 has '5' (toggle-off),
    // cell 1 has '7' (toggle-on with completed '5' → must block batch).
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 80);
    grid = modelHelpers.setInputMode(grid, 'digit');
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '7');
    expect(grid.get('completedDigits')['5']).toBe(true);
    // Multi-select [80 (has '5'), 1 (has '7')] and press '5'.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 80);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 1);
    const before = digitsFromGrid(grid);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(digitsFromGrid(grid)).toBe(before);
});

test('hardcore mode — bypasses completed-digit guard for digit + pencil ops', () => {
    let grid = newSudokuModel({initialDigits: completedDigit5MissingOne, skipCheck: true});
    grid = grid.set('lockedHardcore', true);
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 80);
    grid = modelHelpers.setInputMode(grid, 'digit');
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(grid.get('completedDigits')['5']).toBe(true);
    // Empty cell — setDigit('5') normally blocked, but hardcore bypasses.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(grid.get('cells').get(1).get('digit')).toBe('5');
    // Pencil op for a completed digit — also bypassed in hardcore.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 2);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '5');
    expect(pencilDigits(grid.get('cells').get(2).get('outerPencils'))).toBe('5');
});

test('hardcore mode — getSetting forces highlightConflicts / showRestriction / showConflictCount to false', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    // Force the underlying settings ON so we can verify hardcore overrides them.
    const settings = grid.get('settings');
    grid = grid.set('settings', {
        ...settings,
        [SETTINGS.highlightConflicts]: true,
        [SETTINGS.showRestrictionHighlight]: true,
        [SETTINGS.showConflictCount]: true,
    });
    // Off-hardcore — settings read through normally.
    expect(modelHelpers.getSetting(grid, SETTINGS.highlightConflicts)).toBe(true);
    expect(modelHelpers.getSetting(grid, SETTINGS.showRestrictionHighlight)).toBe(true);
    expect(modelHelpers.getSetting(grid, SETTINGS.showConflictCount)).toBe(true);
    // On-hardcore — overrides force false.
    grid = grid.set('lockedHardcore', true);
    expect(modelHelpers.getSetting(grid, SETTINGS.highlightConflicts)).toBe(false);
    expect(modelHelpers.getSetting(grid, SETTINGS.showRestrictionHighlight)).toBe(false);
    expect(modelHelpers.getSetting(grid, SETTINGS.showConflictCount)).toBe(false);
    // Non-hardcore-suppressed settings still pass through.
    expect(modelHelpers.getSetting(grid, SETTINGS.highlightMatches)).toBe(true);
});

test('hardcore mode — applyRestart re-captures the lock from current settings', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(grid.get('lockedHardcore')).toBe(false);
    // Flip the setting mid-puzzle. Current grid's lockedHardcore stays false.
    const settings = grid.get('settings');
    grid = grid.set('settings', {...settings, [SETTINGS.hardcoreMode]: true});
    expect(grid.get('lockedHardcore')).toBe(false);
    // Restart the puzzle — re-captures from settings.
    grid = modelHelpers.applyRestart(grid);
    expect(grid.get('lockedHardcore')).toBe(true);
});

test('completed-digit guard — pencil ops blocked on completed digits, colour ops allowed', () => {
    let grid = newSudokuModel({initialDigits: completedDigit5MissingOne, skipCheck: true});
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 80);
    grid = modelHelpers.setInputMode(grid, 'digit');
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
    expect(grid.get('completedDigits')['5']).toBe(true);
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);

    // Corner mode: outer pencil for '5' should be BLOCKED.
    grid = modelHelpers.setInputMode(grid, 'outer');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '5');
    expect(pencilDigits(grid.get('cells').get(1).get('outerPencils'))).toBe('');

    // Centre mode: inner pencil for '5' should be BLOCKED.
    grid = modelHelpers.setInputMode(grid, 'inner');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '5');
    expect(pencilDigits(grid.get('cells').get(1).get('innerPencils'))).toBe('');

    // Colour mode: setCellColor with '5' should still work — the
    // 1-9 keys represent colour codes, not digit values.
    grid = modelHelpers.setInputMode(grid, 'color');
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '5');
    expect(grid.get('cells').get(1).get('colorCode')).toBe('5');

    // Non-completed pencil digit ('7') still works in corner mode.
    grid = modelHelpers.setInputMode(grid, 'outer');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '7');
    expect(pencilDigits(grid.get('cells').get(1).get('outerPencils'))).toBe('7');

    // Long-press path (removePencilMarkFromSelection) is independent
    // of updateSelectedCells, so completed-digit removal still works:
    // first add a manual '5' pencil with autoclean off semantics by
    // bypassing the guard — actually unreachable here since the guard
    // sits in the only entry. The guard is test-asserted at the
    // updateSelectedCells boundary; removePencilMarkFromSelection's
    // own path is exercised in the existing pencil-mark tests.
});

test('set multiple digits', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 47);
    expect(grid.get('focusIndex')).toBe(47);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 57);
    expect(grid.get('focusIndex')).toBe(57);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '2');

    expect(grid.get('currentSnapshot')).toBe('63D2,74D2');
    expect(grid.get('matchDigit')).toBe('2');

    expect(digitsFromGrid(grid)).toBe(
        '000008000' +
        '000007000' +
        '123456789' +
        '000005000' +
        '000004000' +
        '002003000' +
        '000202000' +
        '000001000' +
        '000009000'
    );

    let c47 = grid.get('cells').get(47);
    expect(c47.get('digit')).toBe('2');
    expect(c47.get('snapshot')).toBe('D2');
    expect(c47.get('errorMessage')).toBe(undefined);
    expect(c47.get('isGiven')).toBe(false);
    expect(c47.get('isSelected')).toBe(true);

    let c57 = grid.get('cells').get(57);
    expect(c57.get('digit')).toBe('2');
    expect(c57.get('snapshot')).toBe('D2');
    expect(c57.get('errorMessage')).toBe('Digit 2 in row 7');
    expect(c57.get('isGiven')).toBe(false);
    expect(c57.get('isSelected')).toBe(true);

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 13);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 28);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 39);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 52);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 56);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 69);
    expect(grid.get('focusIndex')).toBe(69);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '9');

    expect(digitsFromGrid(grid)).toBe(
        '900008000' +
        '000097000' +
        '123456789' +
        '090005000' +
        '000904000' +
        '002003090' +
        '009202000' +
        '000001900' +
        '000009000'
    );
    expect(grid.get('currentSnapshot')).toBe('11D9,25D9,42D9,54D9,63D2,68D9,73D9,74D2,87D9');
    expect(grid.get('matchDigit')).toBe('9');
    expect(grid.get('completedDigits')).toStrictEqual({
        "1": false,
        "2": false,
        "3": false,
        "4": false,
        "5": false,
        "6": false,
        "7": false,
        "8": false,
        "9": true,
    });

    grid = modelHelpers.clearPencilmarks(grid);     // should have no effect
    expect(digitsFromGrid(grid)).toBe(
        '900008000' +
        '000097000' +
        '123456789' +
        '090005000' +
        '000904000' +
        '002003090' +
        '009202000' +
        '000001900' +
        '000009000'
    );
});

test('no highlight conflicts', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    const settings = grid.get('settings');
    grid = grid.set('settings', { ...settings, [SETTINGS.highlightConflicts]: false });

    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 47);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 57);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '2');

    expect(grid.get('currentSnapshot')).toBe('63D2,74D2');
    expect(grid.get('matchDigit')).toBe('2');

    expect(digitsFromGrid(grid)).toBe(
        '000008000' +
        '000007000' +
        '123456789' +
        '000005000' +
        '000004000' +
        '002003000' +
        '000202000' +
        '000001000' +
        '000009000'
    );

    let c47 = grid.get('cells').get(47);
    expect(c47.get('digit')).toBe('2');
    expect(c47.get('snapshot')).toBe('D2');
    expect(c47.get('errorMessage')).toBe(undefined);
    expect(c47.get('isGiven')).toBe(false);
    expect(c47.get('isSelected')).toBe(true);

    let c57 = grid.get('cells').get(57);
    expect(c57.get('digit')).toBe('2');
    expect(c57.get('snapshot')).toBe('D2');
    expect(c57.get('errorMessage')).toBe(undefined);   // error message suppressed
    expect(c57.get('isGiven')).toBe(false);
    expect(c57.get('isSelected')).toBe(true);

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 13);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 28);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 39);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 52);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 56);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 69);
    expect(grid.get('focusIndex')).toBe(69);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '9');

    expect(digitsFromGrid(grid)).toBe(
        '900008000' +
        '000097000' +
        '123456789' +
        '090005000' +
        '000904000' +
        '002003090' +
        '009202000' +
        '000001900' +
        '000009000'
    );
    expect(grid.get('currentSnapshot')).toBe('11D9,25D9,42D9,54D9,63D2,68D9,73D9,74D2,87D9');
    expect(grid.get('matchDigit')).toBe('9');
    expect(grid.get('completedDigits')).toStrictEqual({
        "1": false,
        "2": false,
        "3": false,
        "4": false,
        "5": false,
        "6": false,
        "7": false,
        "8": false,
        "9": true,
    });
});

// Conflict-detection rework — these three tests share the same setup:
// initialDigitsPartial pins a given '2' at R7C6 (index 59). Placing a
// '2' at index 57 (R7C4) creates a row-7 duplicate that lights up
// errorMessage on c57 (the placed cell). c59 is given and per
// applyErrorHighlights' isGiven guard never gets errorMessage even
// when it's part of the conflict — given cells aren't tint-eligible.
// c47 is placed alongside as a control: it's in no conflict, so its
// errorMessage stays undefined regardless of the setting.

test('toggling highlightConflicts OFF clears existing red tints', () => {
    // Bug A — previously, the existing errorMessage on a tinted cell
    // persisted forever after the player turned the setting off; the
    // applyErrorHighlights early-return skipped the clearing pass.
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    // Setting starts ON (the default). Place '2' at 47 (no conflict)
    // and 57 (conflicts with the given '2' at index 59 in row 7).
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 47);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 57);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '2');
    expect(grid.get('cells').get(57).get('errorMessage')).not.toBe(undefined);
    expect(grid.get('cells').get(47).get('errorMessage')).toBe(undefined);

    // Player turns the setting OFF via the standard model entry point.
    const settings = grid.get('settings');
    grid = modelHelpers.applyNewSettings(grid, {
        ...settings,
        [SETTINGS.highlightConflicts]: false,
    });

    // The stuck red tint at c57 clears immediately — no further digit
    // op required. (c47 was never tinted, stays undefined.)
    expect(grid.get('cells').get(57).get('errorMessage')).toBe(undefined);
    expect(grid.get('cells').get(47).get('errorMessage')).toBe(undefined);
});

test('toggling highlightConflicts ON tints existing duplicates immediately', () => {
    // Bug C — previously, existing duplicates on the grid stayed
    // un-tinted until the player placed another digit. The setting
    // flip should run a live pass so the user sees the impact at once.
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    // Start with the setting OFF, then place the duplicate. c57 is the
    // one that conflicts (with the given '2' at index 59 in row 7);
    // its tint should be suppressed under the OFF setting.
    let settings = grid.get('settings');
    grid = modelHelpers.applyNewSettings(grid, {
        ...settings,
        [SETTINGS.highlightConflicts]: false,
    });
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 57);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '2');
    expect(grid.get('cells').get(57).get('errorMessage')).toBe(undefined);

    // Toggle the setting ON. The pre-existing duplicate should tint
    // without requiring any further digit op.
    settings = grid.get('settings');
    grid = modelHelpers.applyNewSettings(grid, {
        ...settings,
        [SETTINGS.highlightConflicts]: true,
    });
    expect(grid.get('cells').get(57).get('errorMessage')).not.toBe(undefined);
});

test('Check (gameOverCheck) force-highlights duplicates even when the setting is OFF', () => {
    // Bug B — Check is the player's explicit "find my errors"
    // gesture; it should always paint duplicates so the modal copy
    // ("Errors found in highlighted cells") doesn't lie.
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    // Setting OFF.
    const settings = grid.get('settings');
    grid = modelHelpers.applyNewSettings(grid, {
        ...settings,
        [SETTINGS.highlightConflicts]: false,
    });

    // Place the duplicate — no live tint expected.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 57);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '2');
    expect(grid.get('cells').get(57).get('errorMessage')).toBe(undefined);

    // Press Check. The check-result modal opens AND the duplicate
    // cell gets highlighted regardless of the live setting.
    grid = modelHelpers.gameOverCheck(grid);
    expect(grid.get('cells').get(57).get('errorMessage')).not.toBe(undefined);
    const modalState = grid.get('modalState');
    expect(modalState && modalState.icon).toBe('error');
});

test('set cell color', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    expect(grid.get('inputMode')).toBe('digit');

    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 11);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 20);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '4');

    expect(grid.get('currentSnapshot')).toBe('23C4,33C4');

    grid = modelHelpers.setInputMode(grid, 'color');
    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 11);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 20);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '1');

    expect(grid.get('currentSnapshot')).toBe('');   // 1 is transparent bkgd

    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '9');

    expect(grid.get('currentSnapshot')).toBe('23C9,33C9');
    expect(grid.get('inputMode')).toBe('color');

    grid = modelHelpers.updateSelectedCells(grid, 'clearCell', '1');

    expect(grid.get('currentSnapshot')).toBe('');

    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '9');

    expect(grid.get('currentSnapshot')).toBe('23C9,33C9');

    grid = modelHelpers.applyModalAction(grid, 'clear-color-highlights-confirmed');

    expect(grid.get('currentSnapshot')).toBe('');
    expect(grid.get('inputMode')).toBe('digit');
});

test('set pencilmarks', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 74);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '7');

    expect(grid.get('currentSnapshot')).toBe('11D7,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 4);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '1');
    // Round-5: pencil-mark ops never set matchDigit, regardless of
    // selection size. Adding a candidate is a "what could go here"
    // notation gesture, not a "focus this digit across the grid"
    // gesture — so the cross-grid restriction wash should not light
    // up just because a single candidate was pencilled. matchDigit
    // here reflects the setSelection-on-empty-cell-4 zeroing two
    // lines above, untouched by the pencil op.
    expect(grid.get('matchDigit')).toBe('0');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '3');
    expect(grid.get('matchDigit')).toBe('0');

    expect(grid.get('currentSnapshot')).toBe('11D7,15T123,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 5); // a given digit
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 6);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 7);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '0');
    // Round-5: same rule as above. Pencil ops don't touch matchDigit
    // at any selection size — multi-cell bookkeeping certainly
    // shouldn't light up the grid, and single-cell pencilling no
    // longer does either. matchDigit is still '0' from the
    // setSelection-on-empty-cell-4 zeroing further up.
    expect(grid.get('matchDigit')).toBe('0');

    expect(grid.get('currentSnapshot')).toBe('11D7,15T123,17T2,18T2,93D7');

    // G-01 — toggling a pencil mark off no longer mutates the manual
    // outerPencils set; instead it adds the digit to userHiddenOuter
    // (which filters the displayed view but isn't part of the snapshot
    // string). So toggle-off followed by toggle-on leaves the snapshot
    // unchanged across both calls — only the visibility flips.
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');

    expect(grid.get('currentSnapshot')).toBe('11D7,15T123,17T2,18T2,93D7');

    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');

    expect(grid.get('currentSnapshot')).toBe('11D7,15T123,17T2,18T2,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 4);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');

    expect(grid.get('currentSnapshot')).toBe('11D7,15T123,17T2,18T2,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 3);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 4);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '1');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '0');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '3');
    // Batch-6: same rule as the outer-pencil block above. setSelection
    // on cell 3 (empty in initialDigitsPartial) zeroed matchDigit; the
    // subsequent multi-cell pencil ops on the {3, 4} extended
    // selection no longer override it. Pre-Batch-6 the last
    // toggleInnerPencilMark call would have set matchDigit to '3'.
    expect(grid.get('matchDigit')).toBe('0');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,93D7');

    let c4 = grid.get('cells').get(4);
    expect(pencilDigits(c4.get('innerPencils'))).toBe('13');
    let c6 = grid.get('cells').get(6);
    expect(pencilDigits(c6.get('outerPencils'))).toBe('2');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 3);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 12);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '3');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');

    // Inner toggle-off / toggle-on cycle: same userHidden routing as
    // outer (G-01) — manual innerPencils stays put, userHiddenInner
    // gates the display. So both this and the next assertion observe
    // the snapshot from after the previous toggle.
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '3');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');

    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '3');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 12);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '3');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 13);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 14);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '4');
    expect(grid.get('matchDigit')).toBe('0');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,25C4,26C4,93D7');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 4);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 13);
    grid = modelHelpers.updateSelectedCells(grid, 'clearCell');
    expect(grid.get('matchDigit')).toBe('0');

    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,17T2,18T2,24N3,26C4,93D7');

    grid = modelHelpers.clearPencilmarks(grid);
    expect(grid.get('focusIndex')).toBe(13);
    expect(grid.get('matchDigit')).toBe('0');

    expect(grid.get('currentSnapshot')).toBe('11D7,93D7');

    // Undo trace — Phase-16 brought userHidden mutations into the
    // undo trail, so toggles that only flipped userHidden{Inner,Outer}
    // (and not the snapshot string) are now separate undo steps. The
    // first three undos walk back snapshot-changing ops; the next two
    // walk back userHidden-only toggles on cell 12 (lines 669 and
    // 664). Snapshot stays put across those last two, so we also
    // assert cell 12's userHiddenInner flip-flop directly.
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,17T2,18T2,24N3,26C4,93D7');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,25C4,26C4,93D7');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');
    expect(pencilDigits(grid.get('cells').get(12).get('userHiddenInner'))).toBe('3');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');
    expect(pencilDigits(grid.get('cells').get(12).get('userHiddenInner'))).toBe('');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('11D7,14N13,15T123N13,17T2,18T2,24N3,93D7');
    expect(pencilDigits(grid.get('cells').get(12).get('userHiddenInner'))).toBe('3');
});

test('defaultDigitOpForSelection', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(modelHelpers.defaultDigitOpForSelection(grid)).toBe('setDigit');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    expect(modelHelpers.defaultDigitOpForSelection(grid)).toBe('setDigit');

    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 1);
    expect(modelHelpers.defaultDigitOpForSelection(grid)).toBe('toggleOuterPencilMark');

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 12);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 42);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 73);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 47);
    const operation = modelHelpers.defaultDigitOpForSelection(grid);
    expect(operation).toBe('setDigit');

    grid = modelHelpers.updateSelectedCells(grid, operation, '5');
    expect(digitsFromGrid(grid)).toBe(
        '500008000' +
        '000507000' +
        '123456789' +
        '000005000' +
        '000004500' +
        '005003000' +
        '000002000' +
        '000001000' +
        '050009000'
    );

    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 3);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');
    expect(grid.get('currentSnapshot')).toBe('11D5,14T2,24D5,57D5,63D5,92D5');

    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 4);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 5);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 12);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 13);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');
    expect(grid.get('currentSnapshot')).toBe('11D5,14T2,15T2,24D5,25T2,57D5,63D5,92D5');

    // G-01 — toggle-off on every selected cell flips userHiddenOuter
    // rather than mutating manual outerPencils, so currentSnapshot
    // stays the same (the visible state flips off, but the encoded
    // marks are unchanged).
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '2');
    expect(grid.get('currentSnapshot')).toBe('11D5,14T2,15T2,24D5,25T2,57D5,63D5,92D5');
});

test('pencilMarksToInner', () => {
    const extend = true;
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(grid.get('showPencilmarks')).toBe(true);
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 63);
    grid = modelHelpers.moveFocus(grid, 0, 1, extend);
    expect(selectedCells(grid)).toBe('63,72');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '4');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '5');
    expect(grid.get('currentSnapshot')).toBe('81T45,91T45');
    grid = modelHelpers.updateSelectedCells(grid, 'pencilMarksToInner', '5');
    expect(grid.get('currentSnapshot')).toBe('81N45,91N45');
});

test('show/hide pencilmarks', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(grid.get('showPencilmarks')).toBe(true);
    grid = modelHelpers.toggleShowPencilmarks(grid)
    expect(grid.get('showPencilmarks')).toBe(false);
    grid = modelHelpers.toggleShowPencilmarks(grid)
    expect(grid.get('showPencilmarks')).toBe(true);
});

test('autoclean pencilmarks', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(digitsFromGrid(grid)).toBe(initialDigitsPartial);
    let startingSnapshot = '14N39,15N39,45N17,65N17,71T3,74N35,89T3,91T34,93T4,99T3';
    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.restoreSnapshot(grid, startingSnapshot)
    expect(grid.get('currentSnapshot')).toBe(startingSnapshot);
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 76);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '3');
    expect(digitsFromGrid(grid)).toBe(
        '000008000' +
        '000007000' +
        '123456789' +
        '000005000' +
        '000004000' +
        '000003000' +
        '000002000' +
        '000001000' +
        '000039000'
    );
    expect(grid.get('currentSnapshot')).toBe('14N39,15N9,45N17,65N17,71T3,74N5,89T3,91T4,93T4,95D3');
});

test('clear all colours', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(digitsFromGrid(grid)).toBe(initialDigitsPartial);
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 3);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 4);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 5);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '2');
    expect(grid.get('currentSnapshot')).toBe('14C2,15C2,16C2');
    expect(grid.get('undoList').size).toBe(1);
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 12);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 13);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 14);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '4');
    expect(grid.get('undoList').size).toBe(2);
    expect(grid.get('currentSnapshot')).toBe('14C2,15C2,16C2,24C4,25C4,26C4');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 21);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 22);
    grid = modelHelpers.applySelectionOp(grid, 'extendSelection', 23);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '5');
    expect(grid.get('undoList').size).toBe(3);
    expect(grid.get('currentSnapshot')).toBe('14C2,15C2,16C2,24C4,25C4,26C4,34C5,35C5,36C5');
    grid = modelHelpers.applyModalAction(grid, 'clear-color-highlights-confirmed');
    expect(grid.get('undoList').size).toBe(4);
    expect(grid.get('cells').get(4).get('colorCode')).toBe('1');
    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 6);
    grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '7');
    expect(grid.get('undoList').size).toBe(5);
    expect(grid.get('currentSnapshot')).toBe('17D7');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('14C2,15C2,16C2,24C4,25C4,26C4,34C5,35C5,36C5');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('14C2,15C2,16C2,24C4,25C4,26C4');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('14C2,15C2,16C2');
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('currentSnapshot')).toBe('');
});

test('check digits', () => {
    let result = modelHelpers.checkDigits(
        '000000000' +
        '000000000' +
        '000000000' +
        '000000000' +
        '000000000' +
        '000000000' +
        '000000000' +
        '000000000' +
        '000000000'
    );
    expect(result).toStrictEqual({
        isSolved: false,
        incompleteCount: 81,
        completedDigits: {
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": false,
            "7": false,
            "8": false,
            "9": false,
        },
    });

    result = modelHelpers.checkDigits(
        '000000000' +
        '000000000' +
        '000000000' +
        '000500000' +
        '000000000' +
        '000005000' +
        '000000000' +
        '000000000' +
        '000000000'
    );
    expect(result).toStrictEqual({
        isSolved: false,
        hasErrors: true,
        errorAtIndex: {
            30: "Digit 5 in box 5",
            50: "Digit 5 in box 5",
        },
        completedDigits: {
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": false,
            "7": false,
            "8": false,
            "9": false,
        },
    });

    result = modelHelpers.checkDigits(
        '506500200' +
        '000006005' +
        '000000006' +
        '760005200' +
        '005060007' +
        '007000650' +
        '600000500' +
        '000650000' +
        '050000060'
    );
    expect(result).toStrictEqual({
        isSolved: false,
        hasErrors: true,
        errorAtIndex: {
            0: "Digit 5 in row 1",
            3: "Digit 5 in row 1",
            6: "Digit 2 in col 7",
            33: "Digit 2 in col 7",
            27: "Digit 7 in box 4",
            47: "Digit 7 in box 4",
        },
        completedDigits: {
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": true,
            "7": false,
            "8": false,
            "9": false,
        },
    });

    result = modelHelpers.checkDigits(
        '000901230' +
        '123008940' +
        '894007650' +
        '765000009' +
        '000090000' +
        '900000123' +
        '012300894' +
        '089400765' +
        '076509000',
        finalDigitsComplete
    );
    expect(result).toStrictEqual({
        isSolved: false,
        incompleteCount: 40,
        completedDigits: {
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": false,
            "7": false,
            "8": false,
            "9": true,
        },
    });

    result = modelHelpers.checkDigits(
        '500901230' +
        '123008940' +
        '894007650' +
        '765000009' +
        '000090000' +
        '900000123' +
        '012300894' +
        '089400765' +
        '076509001',
        finalDigitsComplete
    );
    expect(result).toStrictEqual({
        isSolved: false,
        hasErrors: true,
        errorAtIndex: {
            "0": "Incorrect digit",
            "80": "Incorrect digit",
        },
        completedDigits: {
            "1": false,
            "2": false,
            "3": false,
            "4": false,
            "5": false,
            "6": false,
            "7": false,
            "8": false,
            "9": true,
        },
    });

    result = modelHelpers.checkDigits(
        '123456789' +
        '456789123' +
        '789123456' +
        '234567891' +
        '567891234' +
        '891234567' +
        '345678912' +
        '678912345' +
        '912345678'
    );
    expect(result).toStrictEqual({
        isSolved: true,
        completedDigits: {
            "1": true,
            "2": true,
            "3": true,
            "4": true,
            "5": true,
            "6": true,
            "7": true,
            "8": true,
            "9": true,
        },
    });
});

// Round-5 — clearSelectionByMode is the unified CLR / Erase /
// Backspace / physical-Delete handler. Implements the per-cell-state
// matrix on a selection and grid-wide ops without one. (The phase-3
// heavyweight DEL semantic via deleteSelection was retired in
// round-5 along with the keypad DEL button.)

test('clearSelectionByMode rule 1 — digit-bearing cell wipes entirely (any mode)', () => {
    // Place a digit + colour on cell 0; CLR in any of the 4 modes
    // should wipe digit + colour. (Pencils on a digit-bearing cell
    // can't co-exist due to autocleanPencilmarks, so this case
    // tests the digit + colour pair.)
    function seed() {
        let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
        grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
        grid = modelHelpers.updateSelectedCells(grid, 'setDigit', '5');
        grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '6');
        return grid;
    }
    ['digit', 'outer', 'inner', 'color'].forEach(mode => {
        let grid = seed();
        grid = modelHelpers.setInputMode(grid, mode);
        grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
        grid = modelHelpers.clearSelectionByMode(grid);
        const c0 = grid.get('cells').get(0);
        expect(c0.get('digit')).toBe('0');
        expect(c0.get('colorCode')).toBe('1');
    });
});

test('clearSelectionByMode rule 2 — empty cell, mode-aware matrix', () => {
    function seedCell(cellIdx, {corner, centre, colour}) {
        // Helper: place pencil marks + colour on a given cell index.
        let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
        grid = modelHelpers.applySelectionOp(grid, 'setSelection', cellIdx);
        if (corner) {
            corner.split('').forEach(d => {
                grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', d);
            });
        }
        if (centre) {
            centre.split('').forEach(d => {
                grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', d);
            });
        }
        if (colour) {
            grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', colour);
        }
        return grid;
    }
    function pressClr(grid, mode, cellIdx) {
        grid = modelHelpers.setInputMode(grid, mode);
        grid = modelHelpers.applySelectionOp(grid, 'setSelection', cellIdx);
        return modelHelpers.clearSelectionByMode(grid);
    }

    // -- Cn + Ct + Co -------------------------------------------------
    // Digit mode → clear all three layers.
    let grid = seedCell(1, {corner: '7', centre: '4', colour: '6'});
    grid = pressClr(grid, 'digit', 1);
    let c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('outerPencils'))).toBe('');
    expect(pencilDigits(c.get('innerPencils'))).toBe('');
    expect(c.get('colorCode')).toBe('1');

    // Corner mode → clear corner + colour; centre stays.
    grid = seedCell(1, {corner: '7', centre: '4', colour: '6'});
    grid = pressClr(grid, 'outer', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('outerPencils'))).toBe('');
    expect(pencilDigits(c.get('innerPencils'))).toBe('4');
    expect(c.get('colorCode')).toBe('1');

    // Centre mode → clear centre + colour; corner stays.
    grid = seedCell(1, {corner: '7', centre: '4', colour: '6'});
    grid = pressClr(grid, 'inner', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('outerPencils'))).toBe('7');
    expect(pencilDigits(c.get('innerPencils'))).toBe('');
    expect(c.get('colorCode')).toBe('1');

    // Colour mode → clear colour; pencils stay.
    grid = seedCell(1, {corner: '7', centre: '4', colour: '6'});
    grid = pressClr(grid, 'color', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('outerPencils'))).toBe('7');
    expect(pencilDigits(c.get('innerPencils'))).toBe('4');
    expect(c.get('colorCode')).toBe('1');

    // -- Cn + Co (no centre) — corner mode clears Cn + Co --------------
    grid = seedCell(1, {corner: '7', colour: '6'});
    grid = pressClr(grid, 'outer', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('outerPencils'))).toBe('');
    expect(c.get('colorCode')).toBe('1');

    // -- Cn + Co — centre mode is no-op (no centre to clear,
    //              corner present so don't fall through to colour) -----
    grid = seedCell(1, {corner: '7', colour: '6'});
    grid = pressClr(grid, 'inner', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('outerPencils'))).toBe('7');
    expect(c.get('colorCode')).toBe('6');

    // -- Ct + Co — corner mode no-op; centre mode clears Ct + Co -------
    grid = seedCell(1, {centre: '4', colour: '6'});
    grid = pressClr(grid, 'outer', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('innerPencils'))).toBe('4');
    expect(c.get('colorCode')).toBe('6');

    grid = seedCell(1, {centre: '4', colour: '6'});
    grid = pressClr(grid, 'inner', 1);
    c = grid.get('cells').get(1);
    expect(pencilDigits(c.get('innerPencils'))).toBe('');
    expect(c.get('colorCode')).toBe('1');

    // -- Co only — every mode falls through to clear colour ------------
    ['digit', 'outer', 'inner', 'color'].forEach(mode => {
        let g = seedCell(1, {colour: '6'});
        g = pressClr(g, mode, 1);
        const cell = g.get('cells').get(1);
        expect(cell.get('colorCode')).toBe('1');
    });

    // -- Truly empty cell — every mode is a no-op ----------------------
    ['digit', 'outer', 'inner', 'color'].forEach(mode => {
        let g = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
        const before = modelHelpers.captureUndoState(g);
        g = pressClr(g, mode, 1);
        expect(modelHelpers.captureUndoState(g)).toBe(before);
    });
});

test('clearSelectionByMode no-selection — digit mode wipes both pencil layers + flips both overlay flags; colours stay', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    // Seed: cell 1 has corner '7' + centre '4' + colour '6'; cell 2
    // has corner '3'; cell 3 has colour '4'.
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '7');
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '4');
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '6');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 2);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '3');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 3);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '4');
    grid = modelHelpers.toggleShowCandidates(grid);
    grid = modelHelpers.toggleShowSnyderMarks(grid);
    expect(grid.get('showCandidates')).toBe(true);
    expect(grid.get('showSnyderMarks')).toBe(true);

    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    grid = modelHelpers.setInputMode(grid, 'digit');
    grid = modelHelpers.clearSelectionByMode(grid);

    // Both pencil layers wiped on cells 1 and 2.
    expect(pencilDigits(grid.get('cells').get(1).get('outerPencils'))).toBe('');
    expect(pencilDigits(grid.get('cells').get(1).get('innerPencils'))).toBe('');
    expect(pencilDigits(grid.get('cells').get(2).get('outerPencils'))).toBe('');
    // Both overlay flags flipped off.
    expect(grid.get('showCandidates')).toBe(false);
    expect(grid.get('showSnyderMarks')).toBe(false);
    // Colours STAY on cells 1 and 3 — digit mode does not wipe colours.
    expect(grid.get('cells').get(1).get('colorCode')).toBe('6');
    expect(grid.get('cells').get(3).get('colorCode')).toBe('4');
    // matchDigit zeroed by the clear op.
    expect(grid.get('matchDigit')).toBe('0');

    // Single undo entry — restores cells AND both flags.
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('showCandidates')).toBe(true);
    expect(grid.get('showSnyderMarks')).toBe(true);
    expect(pencilDigits(grid.get('cells').get(1).get('outerPencils'))).toBe('7');
    expect(pencilDigits(grid.get('cells').get(1).get('innerPencils'))).toBe('4');
    expect(pencilDigits(grid.get('cells').get(2).get('outerPencils'))).toBe('3');
});

test('clearSelectionByMode no-selection — digit mode no-op when nothing to wipe and both flags already off', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    // Both flags already off (factory default). No user pencils anywhere.
    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    grid = modelHelpers.setInputMode(grid, 'digit');

    const before = modelHelpers.captureUndoState(grid);
    grid = modelHelpers.clearSelectionByMode(grid);
    expect(modelHelpers.captureUndoState(grid)).toBe(before);
});

test('clearSelectionByMode no-selection — corner mode wipes pencils + flips showCandidates + clears all colours', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    // Seed: cell 1 with corner '7' + colour '6'; cell 2 with colour '4' (given may have colour too in principle, we leave that).
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '7');
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '6');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 2);
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '4');
    grid = modelHelpers.toggleShowCandidates(grid);
    grid = modelHelpers.toggleShowSnyderMarks(grid);
    expect(grid.get('showCandidates')).toBe(true);
    expect(grid.get('showSnyderMarks')).toBe(true);

    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    grid = modelHelpers.setInputMode(grid, 'outer');
    grid = modelHelpers.clearSelectionByMode(grid);

    // Corner pencils gone on cell 1.
    expect(pencilDigits(grid.get('cells').get(1).get('outerPencils'))).toBe('');
    // Colours wiped on cell 1 AND cell 2.
    expect(grid.get('cells').get(1).get('colorCode')).toBe('1');
    expect(grid.get('cells').get(2).get('colorCode')).toBe('1');
    // showCandidates flipped off; showSnyderMarks survives.
    expect(grid.get('showCandidates')).toBe(false);
    expect(grid.get('showSnyderMarks')).toBe(true);

    // Single undo entry — restores cells AND showCandidates.
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('showCandidates')).toBe(true);
    expect(grid.get('cells').get(1).get('colorCode')).toBe('6');
});

test('clearSelectionByMode no-selection — centre mode wipes pencils + clears all colours; both overlay flags survive', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleInnerPencilMark', '4');
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '6');
    grid = modelHelpers.toggleShowCandidates(grid);
    grid = modelHelpers.toggleShowSnyderMarks(grid);

    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    grid = modelHelpers.setInputMode(grid, 'inner');
    grid = modelHelpers.clearSelectionByMode(grid);

    expect(pencilDigits(grid.get('cells').get(1).get('innerPencils'))).toBe('');
    expect(grid.get('cells').get(1).get('colorCode')).toBe('1');
    // Round-10: centre mode no longer flips showSnyderMarks. Snyder
    // hidden-singles are a curated signal (not a bulk fill), so a
    // centre-mode CLR shouldn't silence them. Both overlay flags
    // survive the clear; showCandidates was always meant to.
    expect(grid.get('showCandidates')).toBe(true);
    expect(grid.get('showSnyderMarks')).toBe(true);
});

test('clearSelectionByMode no-selection — colour mode wipes all colours; pencils + digits + flags stay', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 1);
    grid = modelHelpers.updateSelectedCells(grid, 'toggleOuterPencilMark', '7');
    grid = modelHelpers.updateSelectedCells(grid, 'setCellColor', '6');
    grid = modelHelpers.toggleShowCandidates(grid);

    grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
    grid = modelHelpers.setInputMode(grid, 'color');
    grid = modelHelpers.clearSelectionByMode(grid);

    // Colour gone, pencils stay, settings stay.
    expect(grid.get('cells').get(1).get('colorCode')).toBe('1');
    expect(pencilDigits(grid.get('cells').get(1).get('outerPencils'))).toBe('7');
    expect(grid.get('showCandidates')).toBe(true);
});

test('toggleShowCandidates ON resets userHiddenOuter so cleared candidates surface', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});

    // Turn Show-candidates on. autoOuter should populate for every
    // empty non-given cell.
    grid = modelHelpers.toggleShowCandidates(grid);
    expect(grid.get('showCandidates')).toBe(true);
    let c0 = grid.get('cells').get(0);
    expect(c0.get('autoOuter').size).toBeGreaterThan(0);

    // CLR in corner mode on cell 0 hides those auto candidates.
    grid = modelHelpers.setInputMode(grid, 'outer');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    grid = modelHelpers.clearSelectionByMode(grid);
    c0 = grid.get('cells').get(0);
    expect(c0.get('userHiddenOuter').size).toBeGreaterThan(0);

    // Toggle Show-candidates OFF then ON. The ON pass resets
    // userHiddenOuter so cell 0's candidates reappear in autoOuter
    // and the userHidden filter no longer blocks them.
    grid = modelHelpers.toggleShowCandidates(grid);   // OFF
    expect(grid.get('showCandidates')).toBe(false);
    grid = modelHelpers.toggleShowCandidates(grid);   // ON
    expect(grid.get('showCandidates')).toBe(true);
    c0 = grid.get('cells').get(0);
    expect(c0.get('userHiddenOuter').size).toBe(0);
    expect(c0.get('autoOuter').size).toBeGreaterThan(0);
});

test('undo rolls back view-flag toggles', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    expect(grid.get('showCandidates')).toBe(false);
    expect(grid.get('showPencilmarks')).toBe(true);

    // Toggle Show-candidates ON then Hide-pencilmarks OFF; both
    // flips should be undoable.
    grid = modelHelpers.toggleShowCandidates(grid);
    expect(grid.get('showCandidates')).toBe(true);
    grid = modelHelpers.toggleShowPencilmarks(grid);
    expect(grid.get('showPencilmarks')).toBe(false);

    // Undo restores Hide-pencilmarks; second undo restores Show-
    // candidates.
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('showPencilmarks')).toBe(true);
    expect(grid.get('showCandidates')).toBe(true);
    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('showCandidates')).toBe(false);
    expect(grid.get('showPencilmarks')).toBe(true);
});

test('undo rolls back userHidden mutations from CLR', () => {
    let grid = newSudokuModel({initialDigits: initialDigitsPartial, skipCheck: true});
    grid = modelHelpers.toggleShowCandidates(grid);   // populates autoOuter
    grid = modelHelpers.setInputMode(grid, 'outer');
    grid = modelHelpers.applySelectionOp(grid, 'setSelection', 0);
    const beforeClear = grid.get('cells').get(0).get('userHiddenOuter').size;
    expect(beforeClear).toBe(0);

    grid = modelHelpers.clearSelectionByMode(grid);
    expect(grid.get('cells').get(0).get('userHiddenOuter').size).toBeGreaterThan(0);

    grid = modelHelpers.undoOneAction(grid);
    expect(grid.get('cells').get(0).get('userHiddenOuter').size).toBe(0);
});
