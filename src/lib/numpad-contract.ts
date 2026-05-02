/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port from the CRA blueprint at
// C:\Users\ismoo\Desktop\sudoku-web-app-master\src\lib\numpad-contract.js.

// Phase 2 — Numpad contract: single source of truth for every button
// the player can press on the virtual numpad. Both renderers
// (`virtual-keyboard.js` SVG and `virtual-keyboard-editorial.js` HTML)
// derive their `data-vkbd-id` attributes from this manifest. The
// Jest contract test (numpad-contract.test.js) renders every theme ×
// layout combination and asserts each renderer exposes every contract
// id the player should be able to reach.
//
// Theme-agnostic. Themes change visuals (CSS tokens), layouts change
// structure (compact SVG vs editorial HTML). Behaviour lives here.
//
// Phase 2 status: warn-level. The contract test logs missing ids but
// does not fail. Phase 3 closes GAP/BROKEN rows (delete + new-puzzle
// in editorial, erase semantic reconciliation, count badge port,
// Standard ARIA lift). Phase 5 promotes the test to fail-on-skip.
//
// Adding a new button:
//   1. Add an entry to the appropriate group below.
//   2. Wire it in BOTH renderers using `contractIdFor(dispatchKey)`
//      to derive the `data-vkbd-id` attribute.
//   3. The contract test will pass automatically once both renderers
//      expose the id under all 3 themes.

// ---------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------

// Round-6 (2026-04-30): longPressKeyValue retired alongside the digit
// long-press → remove-candidate-N feature.
const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => ({
    id: `digit-${d}`,
    value: d,
    dispatchKeyValue: d,
    ariaLabel: `Digit ${d}`,
    completedDimmable: true,
    conflictMarkable: true, // phase 3 — both renderers gain strike-through
}));

const modes = [
    {
        id: 'mode-digit',
        dispatchKeyValue: 'input-mode-digit',
        ariaLabel: 'Digit mode',
        shortcut: 'z',
        // Round-12 (2026-05-01) — calc-v2 keypad has implicit Digit
        // (no explicit mode-digit button — Color/Center/Corner toggle
        // off back to Digit). Stacked keypad keeps the explicit tab.
        _missingIn: ['calculator'],
    },
    { id: 'mode-outer', dispatchKeyValue: 'input-mode-outer', ariaLabel: 'Corner pencil mode',  shortcut: 'x' },
    { id: 'mode-inner', dispatchKeyValue: 'input-mode-inner', ariaLabel: 'Centre pencil mode',  shortcut: 'c' },
    { id: 'mode-color', dispatchKeyValue: 'input-mode-color', ariaLabel: 'Colour mode',         shortcut: 'v', wantDoubleClick: true },
];

const multiSelect = {
    id: 'sam-toggle',
    dispatchKeyValue: 'sam',
    ariaLabel: 'Multi-cell selection mode',
};

const toggles = [
    {
        id: 'show-candidates',
        dispatchKeyValue: 'show-candidates',
        ariaLabel: 'Show all candidates',
        dimmedWhen: 'pencilmarksHidden',
    },
    {
        // Round-6 (2026-04-30): Snyder is now ALWAYS rendered. When
        // SETTINGS.snyderModeAdvanced is OFF the button shows in
        // dimmed state and dispatch is a no-op. The requiresSetting
        // flag was removed; renderers honour the new always-visible
        // semantic.
        id: 'show-snyder-candidates',
        dispatchKeyValue: 'show-snyder-candidates',
        ariaLabel: 'Show Snyder cascade',
        dimmedWhen: 'pencilmarksHidden',
    },
    {
        id: 'toggle-show-pencilmarks',
        dispatchKeyValue: 'toggle-show-pencilmarks',
        ariaLabel: 'Hide pencil marks',
        invertedActiveState: true,
    },
];

const actions = [
    { id: 'undo',  dispatchKeyValue: 'undo',  ariaLabel: 'Undo last change' },
    { id: 'redo',  dispatchKeyValue: 'redo',  ariaLabel: 'Redo last change' },
    {
        id: 'erase',
        dispatchKeyValue: 'clear-everything',
        ariaLabel: 'Erase',
        modeSensitive: true,
    },
    // Round-5: 'delete' and 'new-puzzle' contract entries retired.
    // DEL surface removed from both keypads; physical Delete now
    // mirrors Backspace (mode-aware Erase). New-puzzle is reachable
    // only via the Restart confirm modal's "New puzzle" link.
    { id: 'check', dispatchKeyValue: 'check', ariaLabel: 'Check progress' },
    {
        id: 'hint',
        dispatchKeyValue: 'hint',
        ariaLabel: 'Hint',
        disabledWhen: 'hintBudgetExhausted',
        // Round-12 (2026-05-01): Hint moved to the status bar's
        // 5-icon right cluster. Stacked layout keeps it on the
        // keypad action toolbar (duplicated with status bar per
        // owner directive, for muscle memory). Calc-v2 keypad
        // drops the keypad button — the status bar is the single
        // entry point in calculator layout.
        _missingIn: ['calculator'],
    },
    {
        id: 'restart',
        dispatchKeyValue: 'restart',
        ariaLabel: 'Restart puzzle',
        // Round-12: same as hint — Restart promoted to the status
        // bar; calc-v2 keypad drops it.
        _missingIn: ['calculator'],
    },
];

export const NUMPAD_CONTRACT = {
    digits,
    modes,
    multiSelect,
    toggles,
    actions,
};

// ---------------------------------------------------------------------
// Axis enumerations
// ---------------------------------------------------------------------

export const THEMES = ['classic', 'modern', 'editorial'];
// Round-9: SVG keypad ('standard') retired. The Editorial keypad is
// the single renderer with two dies-grid variants — 'stacked' (1×9
// row) and 'calculator' (3×3 grid). Both go through the same
// VirtualKeyboardEditorial component; the contract is identical
// across them since only the dies-grid CSS layout differs.
export const NUMPAD_LAYOUTS = ['stacked', 'calculator'];

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/**
 * Flatten the grouped contract into a single array of entries. Used by
 * the test and any consumer that just wants "every button there is".
 */
export function flattenContract(contract = NUMPAD_CONTRACT) {
    return [
        ...contract.digits,
        ...contract.modes,
        contract.multiSelect,
        ...contract.toggles,
        ...contract.actions,
    ];
}

/**
 * Map a runtime dispatch key (the value passed to inputHandler's
 * vkbdKeyPress events) to its contract id. Renderers use this to derive
 * the `data-vkbd-id` attribute they hang on each interactive element,
 * so adding a new button to the contract doesn't require updating the
 * renderers' button definitions — just their dispatch wiring.
 */
export function contractIdFor(dispatchKey) {
    if (dispatchKey == null) return null;
    if (/^[1-9]$/.test(dispatchKey)) {
        return `digit-${dispatchKey}`;
    }
    if (dispatchKey.startsWith('input-mode-')) {
        return `mode-${dispatchKey.slice('input-mode-'.length)}`;
    }
    if (dispatchKey === 'sam') {
        return 'sam-toggle';
    }
    // Erase aliases — Standard dispatches clear-all-notation, Editorial
    // dispatches clear-everything. Phase 3 picks one canonical; until
    // then both map to the same contract id.
    if (dispatchKey === 'clear-all-notation' || dispatchKey === 'clear-everything') {
        return 'erase';
    }
    // Direct passthrough for the rest:
    //   show-candidates, show-snyder-candidates, toggle-show-pencilmarks,
    //   undo, redo, check, hint, restart, delete, new-puzzle.
    return dispatchKey;
}

/**
 * Return the set of contract ids a given layout is expected to expose.
 * Honours the `_missingIn` flag — layouts that haven't yet implemented
 * a contract entry are excluded from the expected set, so the contract
 * test warns rather than fails on the known gap.
 */
export function expectedIdsForLayout(layout, contract = NUMPAD_CONTRACT) {
    return flattenContract(contract)
        .filter(entry => !(entry._missingIn && entry._missingIn.includes(layout)))
        .map(entry => entry.id);
}

/**
 * Return the canonical ARIA label for a given runtime dispatch key.
 */
export function ariaLabelFor(dispatchKey) {
    const id = contractIdFor(dispatchKey);
    if (!id) return undefined;
    const entry = flattenContract().find(e => e.id === id);
    return entry ? entry.ariaLabel : undefined;
}
