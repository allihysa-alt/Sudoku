/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port from the CRA blueprint at
// C:\\Users\\ismoo\\Desktop\\sudoku-web-app-master\\src\\lib\\sudoku-model.js.

// import { List, Map, Range, Set } from 'immutable';
import { List, Map, Range, Set } from './not-mutable';
import { SudokuHinter } from './sudoku-hinter';
import { cellSet, cellProp } from './sudoku-cell-sets';
import SudokuExplainer from './sudoku-explainer';
import { expandPuzzleDigits, compressPuzzleDigits } from './string-utils';
import { computeAnalysis } from './sudoku-strategies';

import {
    MODAL_TYPE_WELCOME,
    MODAL_TYPE_SAVED_PUZZLES,
    MODAL_TYPE_RESUME_OR_RESTART,
    MODAL_TYPE_INVALID_INITIAL_DIGITS,
    MODAL_TYPE_PASTE,
    MODAL_TYPE_SHARE,
    MODAL_TYPE_SETTINGS,
    MODAL_TYPE_CHECK_RESULT,
    MODAL_TYPE_PAUSED,
    MODAL_TYPE_CONFIRM_RESTART,
    MODAL_TYPE_CONFIRM_CLEAR_COLOR_HIGHLIGHTS,
    MODAL_TYPE_SOLVER,
    MODAL_TYPE_HINT,
    MODAL_TYPE_HELP,
    MODAL_TYPE_ABOUT,
    MODAL_TYPE_QR_CODE,
    MODAL_TYPE_FEATURES,
    MODAL_TYPE_STATS,
    MODAL_TYPE_CONFIRM_RESET_STATS,
} from './modal-types';

export const SETTINGS = {
    // Look-and-feel consolidation: the app now ships a single unified
    // theme. The legacy darkMode/theme keys (and the high-contrast and
    // sepia values) are no longer surfaced in the UI; loadSettings()
    // strips them silently from any older localStorage entries.
    showTimer: "show-timer",
    outlineSelection: "outline-selection",
    highlightMatches: "highlight-matches",
    highlightConflicts: "highlight-conflicts",
    autocleanPencilmarks: "autoclean-pencilmarks",
    flipNumericKeys: "flip-numeric-keys",
    playVictoryAnimation: "play-victory-animation",
    // B11 — when on, peers of cells holding/marking the focusDigit
    // get a hatched yellow overlay so it's obvious which cells are
    // forbidden for the digit. Defaults off to match audit guidance.
    showRestrictionHighlight: "show-restriction-highlight",
    // Round-6 (2026-04-30) — Hardcore mode: a puzzle-scoped lock
    // captured at game start. When the puzzle's lockedHardcore is
    // true, getSetting forces showRestrictionHighlight, highlight-
    // Conflicts, and showConflictCount to false; updateSelectedCells
    // bypasses the completed-digit input guard; the keypad's hint /
    // show-candidates / show-snyder / check buttons are disabled or
    // dispatch no-ops. The setting flip is global, but takes effect
    // only on the NEXT puzzle (newSudokuModel + applyRestart re-
    // capture; mid-puzzle toggling is inert). See applyRestart and
    // restoreFromPuzzleState for lifecycle integration.
    hardcoreMode: "hardcore-mode",
    // B1 — conflict-counter chip in the status bar. Off by default.
    showConflictCount: "show-conflict-count",
    showRatings: "show-ratings",
    autoSave: "auto-save",
    shortenLinks: "shorten-links",
    passProgressToSolver: "pass-progress-to-solver",
    // G-03 — opt-in toggle that gates whether the Snyder Marks
    // keypad button is enabled at all. When on, the Snyder feature
    // fills pair-locked corner marks per box (Round-10: hidden-single
    // centre marks no longer surface — the player scans for them by
    // absence). Default off; the casual player never sees it.
    snyderModeAdvanced: "snyder-mode-advanced",
    // B7 — hint budget. Values: 'unlimited' | '5' | '3' | '0' (off).
    // Read sites: app.js, virtual-keyboard.js (HintBudgetBadge),
    // modal-hint.js (budget chip), modal-settings.js (HintBudgetPicker),
    // sudoku-model.js (showHintModal). This key was previously
    // referenced via SETTINGS.hintBudget but never declared, so reads
    // and writes coerced the missing key to the literal string
    // "undefined". loadSettings() carries a one-time migration that
    // renames any legacy "undefined" key to "hint-budget".
    hintBudget: "hint-budget",
    // Batch-5 — two-stage hint disclosure. Values: 'reveal' (default,
    // matches the original behaviour: one click reveals the full
    // hint) | 'nudge' (one click shows a short nudge naming the
    // technique and unit; second click reveals everything). Nudges
    // do not burn a hint from the budget; only Reveal does.
    hintStyle: "hint-style",
    // Theme batch — values: 'classic' (iOS-inspired light) | 'modern'
    // (warm-paper, slate accent — the default) | 'editorial' (warm
    // vellum, printer's-red accent, sharp corners, drawer-mode
    // popups). Round-10 (2026-05-01): Manrope is the universal type
    // face; themes are differentiated by colour and structure tokens
    // only — no per-theme font-voice. Hint modal is now a universal
    // right-edge marginalia panel under all themes (was Editorial-
    // only). IBM Plex Mono survives on the outer pencil-mark
    // mini-grid for tabular column alignment. Read at boot via
    // loadSettings + syncSettingsToDom; written via saveSettings
    // (same syncSettingsToDom path). Persists inside the existing
    // 'settings' localStorage key — no schema migration.
    theme: "theme",
    // Universal feature (works across all themes): double-click a
    // cell that has exactly one centre pencil mark to commit that
    // digit. Default on; toggle in Settings → Pencil & advanced.
    // Read by app.js's doubleClick handler.
    doubleClickToCommit: "double-click-to-commit",
    // Numpad layout — values: 'standard' (the existing SVG keypad,
    // shared by Classic and Modern) | 'editorial' (the new HTML/CSS
    // keypad: mode tabs above the digit row, sharp-cornered dies,
    // tools-row checkboxes, separate action toolbar). The default
    // tracks the active theme (editorial → 'editorial', else
    // 'standard'); changing theme auto-flips the layout *only* when
    // the user hasn't explicitly picked a layout yet (the touched
    // flag below). The auto-flip rule lives in saveSettings and runs
    // before the persist + DOM sync.
    numpadLayout: "numpad-layout",
    // Round-12 (2026-05-01) — REC-4 turned into an opt-in setting.
    // When on, the keypad paints a strike-through across digits that
    // would create a duplicate in the (single) selected empty cell.
    // Default OFF — the assist is information-dense and not every
    // player wants it on. Read by app.js → modelHelpers.
    // conflictDigitsForKeypad; the helper returns null when this
    // setting is off, so the strike never paints.
    numpadConflictIndicator: "numpad-conflict-indicator",
    // Companion flag: false until the user explicitly picks a layout
    // (via the Settings picker). Set true on any saveSettings call
    // where numpadLayout differs from the previous value. Once true,
    // theme changes never auto-flip layout again — the user's choice
    // sticks across themes.
    numpadLayoutTouched: "numpad-layout-touched",

    // Phase 4 — compact settings layout. When on: the settings modal
    // hides the per-toggle description paragraphs (the muted-text
    // explainers under each switch). Editorial theme defaults this on
    // (auto-track pattern, mirrors numpadLayout); other themes default
    // off; user override sticks via the touched flag below. Read at
    // boot and written via syncSettingsToDom → data-compact-settings
    // on documentElement; modal.css consumes the attribute to drive
    // the density change without a per-component prop.
    compactSettingsLayout: "compact-settings-layout",
    // Companion flag: false until the user explicitly toggles compact-
    // settings-layout. Set true on any saveSettings call where the new
    // value differs from the old; once set, future theme changes never
    // auto-flip — the user's choice sticks across themes.
    compactSettingsLayoutTouched: "compact-settings-layout-touched",
};

export const AVAILABLE_FEATURE_FLAGS = [
    // {
    //     name: "hints",
    //     description: "Add a hint button. Note: the hint 'server' is still being debugged.",
    //     issueNumber: 34,
    // }
];

const difficultyLevels = [
    { value: "1", name: "Easy" },
    { value: "2", name: "Medium" },
    { value: "3", name: "Hard" },
    { value: "4", name: "Master" },
    { value: "5", name: "Evil" },
    // Round-11 (2026-05-01): Hell — puzzles where the strategy ladder
    // gives up and a forcing chain / ALS / AIC is required.
    { value: "6", name: "Hell" },
];

const MAX_SAVED_PUZZLES = 5;

const emptySet = Set();
const charCodeOne = '1'.charCodeAt(0);

function indexFromRC (rc) {
    return (rc.charCodeAt(0) - charCodeOne) * 9 + (rc.charCodeAt(1) - charCodeOne);
}

function newCell(index, digit) {
    digit = digit || '0';
    if (!digit.match(/^[0-9]$/)) {
        throw new RangeError(
            `Invalid Cell() value '${digit}', expected '0'..'9'`
        );
    }
    const row = Math.floor(index / 9) + 1;
    const col = (index % 9) + 1;
    const box = Math.floor((row - 1) / 3) * 3 + Math.floor((col - 1) / 3) + 1;
    return Map({
        // Properties set at creation and then never changed
        index,
        row,
        col,
        box,
        isGiven: digit !== '0',
        // Properties that might change and get serialised for undo/redo
        digit,
        outerPencils: emptySet,
        innerPencils: emptySet,
        // Round-10 (2026-05-01): engine-supplied inner pencils — written
        // by applyCalculateCandidates (the Enter key on a hint that
        // surfaces all legal candidates for the highlighted cell). Lives
        // beside innerPencils as a separate-source layer so the renderer
        // can paint engine-derived candidates in the auto colour
        // (--pencil-mark-auto-color) while the player's numpad-typed
        // marks stay in printer's red. Persistent in the snapshot string
        // (encoded as 'A' + digits) so undo/redo round-trips correctly.
        engineInner: emptySet,
        colorCode: '1',
        // Cache for serialised version of above properties
        snapshot: '',
        // Transient properties that might change but are not preserved by undo
        isSelected: false,
        errorMessage: undefined,
        // G-03 — single auto-mark layer (transient — re-derived from
        // showCandidates / showSnyderMarks via refreshAutoMarkLayers,
        // never serialised in the snapshot string). The cell renderer
        // unions these with the user's manual innerPencils/outerPencils
        // at display time. Round-10 (2026-05-01): autoInner is no
        // longer populated by any engine path — the inner pencil layer
        // is the player's annotation surface only. autoOuter carries
        // either the full legal-candidate set (showCandidates) or the
        // pure Snyder pair corners (showSnyderMarks, when
        // SETTINGS.snyderModeAdvanced is on). When showCandidates is
        // also on, full candidates win the corner layer (they're a
        // superset of Snyder pairs).
        autoInner: emptySet,
        autoOuter: emptySet,
        // User-hidden digits (transient — not in snapshot for v1).
        // Subtracted from the displayed inner/outer pencil sets so
        // the user can hide a specific candidate that's coming from
        // any layer (manual or auto). Reset when the cell's digit
        // changes or the cell is cleared.
        userHiddenInner: emptySet,
        userHiddenOuter: emptySet,
    });
}

export function newSudokuModel({initialDigits, difficultyLevel, onPuzzleStateChange, entryPoint, skipCheck}) {
    initialDigits = (initialDigits || '').replace(/[_.-]/g, '0');
    if (initialDigits.length < 81) {
        initialDigits = expandPuzzleDigits(initialDigits);
    }
    initialDigits = initialDigits.replace(/\D/g, '')
    const initialError = skipCheck ? undefined : modelHelpers.initialErrorCheck(initialDigits);
    const mode = initialError ? 'enter' : 'solve';
    const settings = modelHelpers.loadSettings();
    const featureFlags = modelHelpers.loadFeatureFlags();
    const startTime = mode === 'solve' ? Date.now() : undefined;
    // Round-6: capture the hardcore setting at puzzle creation time
    // and lock it into the grid. Mid-puzzle toggles of the global
    // setting do not affect this value; only newSudokuModel and
    // applyRestart re-capture it. restoreFromPuzzleState pulls the
    // saved value off persisted state.
    const lockedHardcore = !!settings[SETTINGS.hardcoreMode];
    const grid = Map({
        solved: false,
        mode,
        settings,
        featureFlags,
        lockedHardcore,
        difficultyLevel: (difficultyLevel || '').replace(/[^1-6]/g, ''),
        inputMode: 'digit',
        tempInputMode: undefined,
        startTime: startTime,           // should never change
        intervalStartTime: startTime,   // gets adjusted if game paused
        endTime: undefined,
        pausedAt: undefined,
        undoList: List(),
        redoList: List(),
        currentSnapshot: '',
        onPuzzleStateChange: onPuzzleStateChange,
        cells: List(),
        showPencilmarks: true,
        hasErrors: false,
        focusIndex: null,
        completedDigits: {},
        matchDigit: '0',
        modalState: undefined,
        hintsUsed: emptySet,
        // G-03 / QA-4 — auto-mark mode flags. Two independent toggles
        // wired to two independent keypad buttons:
        //   showCandidates  → fills autoOuter with the full legal
        //                     candidate set (corner marks).
        //   showSnyderMarks → fills autoOuter with Snyder pair corners
        //                     (Round-10: hidden-single centre marks
        //                     and naked-pair elevation removed; the
        //                     engine no longer writes to autoInner).
        // When SETTINGS.snyderModeAdvanced is off, the Snyder button
        // is hidden from the keypad and showSnyderMarks stays false.
        // When both flags are on, full corner candidates dominate
        // autoOuter (Snyder pairs are a subset, so the corners stay
        // information-complete).
        showCandidates: false,
        showSnyderMarks: false,
        // B12 — Sam Layout: 'single' click sets selection (existing
        // behaviour); 'multi' click toggles cells in the current
        // selection. Default 'single' so the SAM toggle has to be
        // explicitly turned on by the user.
        selectionMode: 'single',
    });
    return initialError
        ? modelHelpers.setInitialDigits(grid, initialDigits, initialError, entryPoint)
        : modelHelpers.setGivenDigits(grid, initialDigits, {skipCheck});
};

function actionsBlocked(grid) {
    return grid.get('solved') || (grid.get('modalState') !== undefined);
}

export const modelHelpers = {
    CENTER_CELL: 40,
    DEFAULT_SETTINGS: {
        [SETTINGS.showTimer]: true,
        [SETTINGS.outlineSelection]: false,
        [SETTINGS.highlightMatches]: true,
        [SETTINGS.highlightConflicts]: true,
        [SETTINGS.autocleanPencilmarks]: true,
        // Round-12 (2026-05-01): default flipped to true — calculator
        // layout now lays out dies in true calculator order (7-8-9 /
        // 4-5-6 / 1-2-3) by default. Returning users keep their
        // persisted value via loadSettings's spread.
        [SETTINGS.flipNumericKeys]: true,
        [SETTINGS.playVictoryAnimation]: true,
        [SETTINGS.showRestrictionHighlight]: false,
        // Round-12 (2026-05-01): conflict-count chip default flipped
        // to ON — the chip is a low-noise status signal that's helpful
        // for most players. Returning users keep their persisted
        // value via the spread in loadSettings.
        [SETTINGS.showConflictCount]: true,
        [SETTINGS.hardcoreMode]: false,
        // Round-12 (2026-05-01) — REC-4 setting. Default OFF; opt-in
        // for players who want the keypad to flag would-create-a-
        // duplicate dies as they select a cell.
        [SETTINGS.numpadConflictIndicator]: false,
        [SETTINGS.showRatings]: false,
        [SETTINGS.autoSave]: true,
        [SETTINGS.shortenLinks]: true,
        [SETTINGS.passProgressToSolver]: false,
        // Round-12 (2026-05-01): Snyder default flipped to ON. The
        // tool ships dimmed when this flag is off; defaulting it on
        // makes the Snyder Marks button live for new installs.
        // Returning users keep their persisted value.
        [SETTINGS.snyderModeAdvanced]: true,
        [SETTINGS.hintBudget]: 'unlimited',
        // Round-12 (2026-05-01): default for new installs flipped to
        // 'nudge'. Returning users keep their persisted hintStyle (the
        // spread `{...defaults, ...savedSettings}` in loadSettings layers
        // their saved value over this default), so anyone who already
        // chose 'reveal' is not migrated. New installs land on the
        // pedagogical first-stage disclosure; veterans flip to 'reveal'
        // in two taps.
        [SETTINGS.hintStyle]: 'nudge',
        // Theme batch v2 — Modern is now the default for new users.
        // Returning users keep their persisted choice (the spread in
        // loadSettings layers savedSettings over defaults), so no
        // existing user is involuntarily migrated.
        [SETTINGS.theme]: 'modern',
        // Universal feature default-on. Power users can disable from
        // Settings → Pencil & advanced if double-click commits feel
        // like a footgun (e.g., when colour-coding cells with V mode
        // and accidentally double-tapping).
        [SETTINGS.doubleClickToCommit]: true,
        // Round-9: numpadLayout values changed from 'standard' /
        // 'editorial' to 'auto' / 'stacked' / 'calculator'. SVG keypad
        // retired; Editorial keypad is the only renderer, with two
        // dies-grid variants (stacked = 1×9 row, calculator = 3×3 grid).
        // 'auto' resolves at runtime: portrait → stacked, landscape →
        // calculator. Existing 'standard' / 'editorial' values migrate
        // to 'auto' silently in loadSettings.
        [SETTINGS.numpadLayout]: 'auto',
        [SETTINGS.numpadLayoutTouched]: false,
        // Phase 4 — compactSettingsLayout default for new users is off;
        // boot rule in loadSettings auto-flips to true if the active
        // theme is Editorial AND the user hasn't touched the flag.
        [SETTINGS.compactSettingsLayout]: false,
        [SETTINGS.compactSettingsLayoutTouched]: false,
    },

    loadSettings: () => {
        const defaults = modelHelpers.DEFAULT_SETTINGS;
        let savedSettings = {};
        try {
            const savedSettingsJSON = window.localStorage.getItem('settings') || '{}';
            savedSettings = JSON.parse(savedSettingsJSON);
        }
        catch {
            // ignore errors
        };
        // Theme batch — the legacy `theme` strip is gone. SETTINGS.theme
        // now persists ('classic' | 'modern'). The legacy `dark-mode`
        // key is still stripped — it was a separate boolean from the
        // dropped dark theme; not part of the current two-theme model.
        let migrated = false;
        if (savedSettings) {
            delete savedSettings['dark-mode'];
            // B7 migration — earlier builds wrote the hint-budget value
            // under the literal key "undefined" because SETTINGS.hintBudget
            // was missing from the SETTINGS export. Rename it on first
            // load so the player keeps their chosen budget on the new
            // canonical key.
            if (Object.prototype.hasOwnProperty.call(savedSettings, 'undefined')) {
                if (!Object.prototype.hasOwnProperty.call(savedSettings, SETTINGS.hintBudget)) {
                    savedSettings[SETTINGS.hintBudget] = savedSettings['undefined'];
                }
                delete savedSettings['undefined'];
                migrated = true;
            }
        }
        const settings = {...defaults, ...savedSettings};
        // Round-9 migration: the old layout values 'standard' (SVG
        // keypad) and 'editorial' (stacked HTML keypad) both fold to
        // 'auto'. The SVG keypad has been retired; the Editorial
        // keypad now handles both stacked and calculator variants
        // and 'auto' picks based on viewport orientation. The
        // touched flag is preserved — if the user explicitly picked
        // a layout before, treat that as them having opted into the
        // responsive default. If they want to lock back to stacked
        // they can do so from settings.
        const persistedLayout = settings[SETTINGS.numpadLayout];
        if (persistedLayout === 'standard' || persistedLayout === 'editorial') {
            settings[SETTINGS.numpadLayout] = 'auto';
            migrated = true;
        }
        // Phase 4 — compact-settings-layout boot rule. Same auto-track
        // pattern as numpadLayout: Editorial → true, other themes →
        // false, unless the user has explicitly picked (touched flag).
        const compactMissing = !Object.prototype.hasOwnProperty.call(savedSettings, SETTINGS.compactSettingsLayout);
        const compactTouched = !!settings[SETTINGS.compactSettingsLayoutTouched];
        if (compactMissing && !compactTouched) {
            settings[SETTINGS.compactSettingsLayout] = (settings[SETTINGS.theme] === 'editorial');
        }
        modelHelpers.syncSettingsToDom(settings);
        if (migrated) {
            try {
                window.localStorage.setItem('settings', JSON.stringify(savedSettings));
            } catch { /* quota exceeded; tolerated */ }
        }
        return settings;
    },

    saveSettings: (grid, newSettings) => {
        const oldSettings = grid.get('settings');
        if (oldSettings[SETTINGS.autoSave] && !newSettings[SETTINGS.autoSave]) {
            modelHelpers.deleteSavedPuzzles();
        }
        // Numpad-layout option (c): theme change auto-flips the layout
        // when the user has never explicitly picked one; an explicit
        // pick sets the touched flag so future theme switches keep the
        // user's choice. Both the touched-write and the auto-flip
        // mutate `newSettings` in-place before the persist below.
        const themeBefore = oldSettings[SETTINGS.theme];
        const themeAfter = newSettings[SETTINGS.theme];
        const layoutBefore = oldSettings[SETTINGS.numpadLayout];
        const layoutAfter = newSettings[SETTINGS.numpadLayout];
        const layoutChanged = layoutBefore !== layoutAfter;
        const themeChanged = themeBefore !== themeAfter;
        if (layoutChanged) {
            newSettings = {
                ...newSettings,
                [SETTINGS.numpadLayoutTouched]: true,
            };
        }
        // Round-9: theme-driven layout auto-flip dropped. With the
        // Editorial keypad as the only renderer and 'auto' as the
        // responsive default, theme changes no longer need to switch
        // the layout — the keypad is the same component across all
        // themes; only token values differ.
        // Phase 4 — compact-settings-layout auto-track. Same pattern
        // as numpadLayout: explicit pick sets the touched flag; theme
        // changes auto-flip until the user has touched.
        const compactBefore = !!oldSettings[SETTINGS.compactSettingsLayout];
        const compactAfter = !!newSettings[SETTINGS.compactSettingsLayout];
        const compactChanged = compactBefore !== compactAfter;
        const compactWasTouched = !!oldSettings[SETTINGS.compactSettingsLayoutTouched];
        if (compactChanged) {
            newSettings = {
                ...newSettings,
                [SETTINGS.compactSettingsLayoutTouched]: true,
            };
        }
        else if (themeChanged && !compactWasTouched) {
            newSettings = {
                ...newSettings,
                [SETTINGS.compactSettingsLayout]: (themeAfter === 'editorial'),
            };
        }
        const newSettingsJSON = JSON.stringify(newSettings);
        window.localStorage.setItem('settings', newSettingsJSON);
        modelHelpers.syncSettingsToDom(newSettings);
        return grid.set('settings', newSettings);
    },

    loadFeatureFlags: () => {
        let savedFeatureFlags = {};
        try {
            const savedFeatureFlagsJSON = window.localStorage.getItem('featureFlags') || '{}';
            savedFeatureFlags = JSON.parse(savedFeatureFlagsJSON);
        }
        catch {
            // ignore errors
        };
        const flags = {};
        AVAILABLE_FEATURE_FLAGS.forEach((f) => {
            if (savedFeatureFlags[f.name]) {
                flags[f.name] = true;
            }
        });
        return flags;
    },

    saveFeatureFlags: (grid, newFeatureFlags) => {
        const newFeatureFlagsJSON = JSON.stringify(newFeatureFlags);
        window.localStorage.setItem("featureFlags", newFeatureFlagsJSON);
        return grid.set("featureFlags", newFeatureFlags);
    },

    featureIsEnabled: (grid, featureName) => {
        return (grid.get("featureFlags") || {})[featureName] === true;
    },

    hinter: (grid) => {
        const cells = grid.get('cells').toArray();
        return new SudokuHinter(cells);
    },

    // B4 — Persistent stats history. Each entry:
    //   { date: ISO, level: '1'..'5', elapsed: seconds, hintsUsed: N }
    // We keep the last 200 solves to bound localStorage growth.
    STATS_HISTORY_KEY: 'sudoku-stats-history',
    STATS_HISTORY_MAX: 200,

    loadStatsHistory: () => {
        try {
            const json = window.localStorage.getItem(modelHelpers.STATS_HISTORY_KEY);
            const arr = JSON.parse(json) || [];
            return Array.isArray(arr) ? arr : [];
        }
        catch { return []; }
    },

    // B5 — current daily-solve streak. Days are computed in the user's
    // local timezone. One miss per calendar month is forgiven (the
    // streak does not break) so an off-day doesn't punish casual
    // players. Returns the number of consecutive days ending on
    // today (or yesterday, if today has no solves yet).
    computeStreak: (history) => {
        const days = new Set();
        history = history || modelHelpers.loadStatsHistory();
        history.forEach(e => {
            try {
                const d = new Date(e.date);
                const key = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
                days.add(key);
            } catch { /* skip malformed entries */ }
        });
        if (days.size === 0) return 0;
        const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        const today = new Date();
        let cursor = new Date(today);
        // Allow today to be unsolved without breaking the streak.
        if (!days.has(dayKey(cursor))) {
            cursor.setDate(cursor.getDate() - 1);
            if (!days.has(dayKey(cursor))) return 0;
        }
        let streak = 0;
        const forgivenByMonth = {};
        while (true) {
            if (days.has(dayKey(cursor))) {
                streak += 1;
                cursor.setDate(cursor.getDate() - 1);
                continue;
            }
            const monthKey = cursor.getFullYear() + '-' + (cursor.getMonth()+1);
            if (!forgivenByMonth[monthKey]) {
                forgivenByMonth[monthKey] = true;
                cursor.setDate(cursor.getDate() - 1);
                continue;
            }
            return streak;
        }
    },

    appendStatsHistory: (entry) => {
        const all = modelHelpers.loadStatsHistory();
        all.push(entry);
        const trimmed = all.slice(-modelHelpers.STATS_HISTORY_MAX);
        try {
            window.localStorage.setItem(modelHelpers.STATS_HISTORY_KEY, JSON.stringify(trimmed));
        }
        catch { /* quota exceeded; oh well */ }
        return trimmed;
    },

    // Reset-stats batch — wipe just the stats history. Paired with
    // deleteSavedPuzzles() in the reset-stats-confirmed action handler
    // (the two together = "Reset stats" on the stats modal). Safe to
    // call when the key isn't present; localStorage.removeItem is a
    // no-op on missing keys.
    clearStatsHistory: () => {
        try {
            window.localStorage.removeItem(modelHelpers.STATS_HISTORY_KEY);
        }
        catch { /* localStorage blocked or not available — skip */ }
    },

    syncSettingsToDom: (settings) => {
        // Theme batch — write the active theme name to the document
        // root so :root[data-theme="modern"] in src/index.css overrides
        // the Classic baseline tokens. Setting the attribute on
        // document.documentElement (not body) keeps the cascade clean:
        // every CSS variable is declared on :root, and a single
        // attribute change instantly re-cascades the entire app
        // without a reload or any per-component churn. The fall-back
        // to 'classic' covers the cold-load path for first-time users
        // (no setting persisted yet) and any hand-edited localStorage
        // that has dropped the key.
        // Theme batch v3 — three known themes (classic / modern /
        // editorial); Modern remains the default. Stale legacy values
        // ('dark', 'sepia', etc. from old builds) fold to Modern.
        const t = settings[SETTINGS.theme];
        const theme = (t === 'classic' || t === 'editorial') ? t : 'modern';
        window.document.documentElement.setAttribute('data-theme', theme);
        // Round-9: numpadLayout setting written verbatim to the root.
        // Values: 'auto' / 'stacked' / 'calculator'. The orientation-
        // resolved EFFECTIVE layout is written separately as
        // data-numpad-layout-effective by app.js (since orientation
        // changes don't go through this sync path). CSS branches on
        // data-numpad-layout-effective for structural rules; the raw
        // setting attribute is mostly informational / for tests.
        const lr = settings[SETTINGS.numpadLayout];
        const layout = (lr === 'stacked' || lr === 'calculator') ? lr : 'auto';
        window.document.documentElement.setAttribute('data-numpad-layout', layout);
        // Phase 4 — compact-settings-layout flag drives modal density
        // (settings descriptions hidden + post-save toast suppressed).
        // Written as a boolean string so CSS can match
        // [data-compact-settings="true"]; default 'false' covers
        // first-load before settings hydrate.
        const compact = !!settings[SETTINGS.compactSettingsLayout];
        window.document.documentElement.setAttribute('data-compact-settings', compact ? 'true' : 'false');
        // Strip any leftover legacy theme classes that earlier builds
        // may have set on <body> so the page can never be forced into
        // a deprecated palette via stale DOM state.
        const themeClasses = ['dark', 'high-contrast', 'sepia'];
        themeClasses.forEach(c => window.document.body.classList.remove(c));
        if (settings[SETTINGS.playVictoryAnimation]) {
            window.document.body.classList.add('animate');
        }
        else {
            window.document.body.classList.remove('animate');
        }
    },

    getSetting: (grid, settingName) => {
        const allSettings = grid.get('settings');
        // Round-6 — Hardcore overrides. When this puzzle was started
        // with hardcore mode locked on, the three "derived guidance"
        // settings are forced false at every read site (CSS, model,
        // render). This is the single chokepoint — adding a new
        // suppressed setting needs only a one-line addition here.
        if (grid.get('lockedHardcore')) {
            if (
                settingName === SETTINGS.showRestrictionHighlight
                || settingName === SETTINGS.highlightConflicts
                || settingName === SETTINGS.showConflictCount
            ) {
                return false;
            }
        }
        return allSettings[settingName];
    },

    allDifficultyLevels: () => {
        return difficultyLevels;
    },

    difficultyLevelName: (value) => {
        const level = difficultyLevels.find(lvl => lvl.value === value) || {};
        return level.name;
    },

    initialErrorCheck: (initialDigits) => {
        if (initialDigits === undefined || initialDigits === null || initialDigits === '') {
            return { noStartingDigits: true };
        }
        if (!initialDigits.match(/^[0-9]{81}$/)) {
            return { insufficientDigits: true };
        }
        const result = modelHelpers.checkDigits(initialDigits);
        if (result.hasErrors) {
            return { hasErrors: true };
        }
        return;
    },

    setGivenDigits: (grid, initialDigits, options) => {
        const cells = Range(0, 81).toList().map(i => newCell(i, initialDigits[i]));
        const puzzleStateKey = 'save-' + initialDigits;
        grid = modelHelpers.checkCompletedDigits(grid.merge({
            initialDigits,
            puzzleStateKey,
            cells,
        }));
        // Theme batch v2 — orphan cleanup: the difficultyRating lookup
        // depended on the recently-shared.json cache (now retired with
        // the rest of the Batch-1 dropped surfaces). The numeric rating
        // (e.g., 1.5, 2.7) used to enrich saved-puzzle thumbnails; the
        // categorical difficulty level from the URL still flows through
        // grid.difficultyLevel, which is what every UI surface actually
        // reads. Old saves with persisted difficultyRating round-trip
        // unchanged via persistPuzzleState — we just don't compute new
        // values any more.
        if (options.skipCheck) {
            return grid;
        }
        const digits = initialDigits.split('');
        const result = modelHelpers.findSolutions(digits);
        if (result.uniqueSolution) {
            grid = grid.set('finalDigits', result.finalDigits);
        }
        else if (!options.fromPuzzleState) {
            // Round-5 fix #1 — only surface the "no unique solution"
            // warning when validating fresh input (paste, manual
            // entry). Restoring from a saved puzzle should NEVER
            // pop a warning modal — the puzzle was already validated
            // when it was first started; re-warning here re-opens
            // a modal that the resume action just dismissed, leaving
            // the user staring at a modal while the timer ticks
            // behind it.
            grid = grid.set('modalState', {
                modalType: MODAL_TYPE_CHECK_RESULT,
                icon: 'warning',
                errorMessage: result.error,
                escapeAction: 'close',
            });
        }
        const autoSaveEnabled = modelHelpers.getSetting(grid, SETTINGS.autoSave);
        if (!options.fromPuzzleState && autoSaveEnabled) {
            const puzzleState = modelHelpers.parsePuzzleState(puzzleStateKey);
            if (puzzleState) {
                grid = grid.set('modalState', {
                    modalType: MODAL_TYPE_RESUME_OR_RESTART,
                    puzzleState,
                    showRatings: modelHelpers.getSetting(grid, SETTINGS.showRatings),
                });
            }
        }
        return grid;
    },

    setInitialDigits: (grid, initialDigits, initialError, entryPoint) => {
        const cells = initialError.noStartingDigits
            ? Range(0, 81).toList().map(i => newCell(i, '0'))
            : Range(0, 81).toList().map(i => newCell(i, '0').set('digit', initialDigits[i] || '0'));
        let modalState = undefined;
        if (initialError.noStartingDigits) {
            modelHelpers.pruneSavedState(grid);
            // Welcome merge — on a bare URL the welcome content used
            // to auto-open as a modal (and app.js then rendered the
            // small "+ New puzzle / Resume" pill bar AS WELL as the
            // modal underneath, depending on whether a saved puzzle
            // existed). With the merge, the welcome picker renders
            // INLINE as a page region instead — see app.js's
            // <WelcomePicker> branch under showInlinePicker. The
            // model just leaves modalState undefined; app.js detects
            // the bare-URL state on its own. Other callsites of
            // showWelcomeModal (menu "New game" mid-puzzle,
            // cancel-paste, etc.) continue to open the modal as
            // today — those are user-initiated mid-flow, where a
            // modal is the right pattern.
        }
        else if (initialError.insufficientDigits) {
            modalState = {
                modalType: MODAL_TYPE_INVALID_INITIAL_DIGITS,
                insufficientDigits: true,
                initialDigits: initialDigits,
            };
        }
        else if (initialError.hasErrors) {
            modalState = {
                modalType: MODAL_TYPE_INVALID_INITIAL_DIGITS,
                hasErrors: true,
                initialDigits: initialDigits,
            };
        }
        return modelHelpers.checkCompletedDigits(grid.merge({
            initialDigits,
            modalState,
            cells,
        }));
    },

    fetchExplainPlan: (grid, setGrid, retryInterval, maxRetries) => {
        // Local hint engine (src/lib/sudoku-strategies.js) — no network call.
        // The signature/args are kept for compatibility with the caller in
        // app.js (which still passes retry interval and max retries from the
        // pre-local backend era; both are unused now).
        const modalState = grid.get('modalState');
        delete modalState.fetchRequired;    // Naughty, but we don't want a re-render
        const initialDigits = grid.get('initialDigits');
        // Defer one tick so the spinner can render before computeAnalysis runs.
        setTimeout(() => {
            setGrid(currentGrid => {
                const ms = currentGrid.get('modalState') || {};
                if (ms.modalType !== MODAL_TYPE_HINT) {
                    return currentGrid;  // user moved on
                }
                // Round-12 (2026-05-01) — preserve the budgetInfo the
                // sync showHintModal branch attached to the loading
                // payload, AND apply the same nudge-stage decision the
                // sync branch makes. Earlier code dropped both — the
                // budget chip vanished on first hint and the nudge
                // setting was effectively ignored on cold load (the
                // "I had to open Settings, close it, then press Hint"
                // workaround Sam observed). Reusing ms.budgetInfo
                // and re-deriving revealStage / markHintUsed below
                // brings the cold path into parity with the warm path.
                const newModalState = {
                    modalType: MODAL_TYPE_HINT,
                    escapeAction: 'close',
                    budgetInfo: ms.budgetInfo,
                };
                try {
                    const analysis = computeAnalysis(initialDigits);
                    const explainer = new SudokuExplainer(analysis);
                    let updatedGrid = currentGrid.set('explainer', explainer);
                    const hint = modelHelpers.findNextHint(updatedGrid);
                    newModalState.hint = hint;
                    if (hint) {
                        const hintStyle = modelHelpers.getSetting(updatedGrid, SETTINGS.hintStyle) || 'nudge';
                        const isNudgeStage = hintStyle === 'nudge' && !!hint.nudge;
                        newModalState.revealStage = isNudgeStage ? 'nudge' : 'reveal';
                        // Don't burn a hint for a nudge — only when
                        // the player actually applies (or reveals).
                        if (!isNudgeStage) {
                            updatedGrid = modelHelpers.markHintUsed(updatedGrid, hint);
                        }
                    }
                    return updatedGrid.set('modalState', newModalState);
                }
                catch (error) {
                    newModalState.loadingFailed = true;
                    newModalState.errorMessage = error.toString();
                    return currentGrid.set('modalState', newModalState);
                }
            });
        }, 0);
    },

    findNextHint: (grid) => {
        const explainer = grid.get("explainer");
        const currDigits = grid.get('cells').map(c => c.get('digit')).toArray();
        // G-03 — Per-cell candidate set sent to the explainer is
        //   ((manualInner ∪ autoInner) − userHiddenInner)
        //     ∪ ((manualOuter ∪ autoOuter) − userHiddenOuter)
        // so the hint engine reasons over what the user actually sees
        // (including past elimination hints recorded in userHidden).
        // P12a-fix: prior versions skipped the userHidden subtraction,
        // which meant applied elimination hints stayed visible to the
        // explainer — the same hint kept re-emitting forever. We do
        // NOT mutate the cell; the union is built at payload-assembly
        // time only.
        const subtractHidden = (set, hidden) => {
            if (hidden.size === 0) return set;
            let result = set;
            hidden.toArray().forEach(d => { result = result.delete(d); });
            return result;
        };
        const currCandidates = grid.get("cells").map(c => {
            const innerVisible = subtractHidden(
                c.get("innerPencils").union(c.get("autoInner")).union(c.get("engineInner")),
                c.get("userHiddenInner")
            );
            const outerVisible = subtractHidden(
                c.get("outerPencils").union(c.get("autoOuter")),
                c.get("userHiddenOuter")
            );
            return innerVisible.union(outerVisible).toArray().join('');
        }).toArray();
        return explainer.findNextStep(currDigits, currCandidates);
    },

    markHintUsed: (grid, hint) => {
        const hintsUsed = grid.get("hintsUsed");
        if (hint.hintIndex !== undefined && !hintsUsed.includes(hint.hintIndex)) {
            grid = grid.set("hintsUsed", hintsUsed.add(hint.hintIndex));
        }
        return grid;
    },

    getSavedPuzzles: (grid) => {
        if (!modelHelpers.getSetting(grid, SETTINGS.autoSave)) {
            return;
        }
        return Object.keys(localStorage)
            .map((k) => {
                if (k.match(/^save-/)) {
                    return modelHelpers.parsePuzzleState(k);
                }
                return null;
            })
            .filter(ps => !!ps)  //filter out the nulls
            .sort((a, b) => b.lastUpdatedTime - a.lastUpdatedTime);  // sort most recent activity first
    },

    deleteSavedPuzzles: () => {
        Object.keys(localStorage)
            .filter(k => k.match(/^save-/))
            .forEach(k => {
                localStorage.removeItem(k);
            });
    },

    parsePuzzleState: (puzzleStateKey) => {
        try {
            const puzzleStateJSON = localStorage.getItem(puzzleStateKey);
            const ps = JSON.parse(puzzleStateJSON);
            ps.puzzleStateKey = puzzleStateKey;
            const {initialDigits, currentSnapshot} = ps;
            const completedDigits = initialDigits.split('');
            ((currentSnapshot || '').match(/(\d\dD\d)/g) || []).forEach(sn => {
                const [rc, digit] = sn.split(/D/);
                completedDigits[ indexFromRC(rc) ] = digit;
            });
            ps.completedDigits = completedDigits.join('');
            return ps;
        } catch (e) {
            return null
        }
    },

    checkDigits: (digits, finalDigits) => {
        const result = {
            isSolved: false,
        };
        let incompleteCount = 0;
        const seen = { row: {}, col: {}, box: {} };
        const digitTally = {};
        const errorAtIndex = {};
        for (let i = 0; i < 81; i++) {
            const d = digits[i] || '0';
            if (d === '0') {
                incompleteCount++;
            }
            else {
                const c = cellProp[i];
                for (const setType of ['row', 'col', 'box']) {
                    const j = c[setType];
                    seen[setType][j] = seen[setType][j] || {};
                    const k = seen[setType][j][d];
                    if (k === undefined) {
                        seen[setType][j][d] = i;
                    }
                    else {
                        const error = `Digit ${d} in ${setType} ${j}`;
                        errorAtIndex[i] = errorAtIndex[i] || error;
                        errorAtIndex[k] = errorAtIndex[k] || error;
                    }
                }
                digitTally[d] = (digitTally[d] || 0) + (errorAtIndex[i] ? 0 : 1);
            }
        }
        result.completedDigits = "123456789".split('').reduce((c, d) => {
            c[d] = (digitTally[d] === 9);
            return c;
        }, {});
        let errorCount = Object.keys(errorAtIndex).length;
        if (finalDigits && errorCount === 0) {
            for (let i = 0; i < 81; i++) {
                if(digits[i] !== '0' && digits[i] !== finalDigits[i]) {
                    errorAtIndex[i] = 'Incorrect digit';
                    errorCount++;
                }
            }
        }
        if (errorCount > 0) {
            result.hasErrors = true;
            result.errorAtIndex = errorAtIndex;
        }
        else if (incompleteCount === 0) {
            result.isSolved = true;
        }
        else {
            result.incompleteCount = incompleteCount;
        }
        return result;
    },

    findCandidatesForCell: (digits, i) => {
        const candidates = '0123456789'.split('');
        const digitBase = '0'.charCodeAt(0);
        const r = Math.floor(i / 9) + 1;
        const c = (i % 9) + 1;
        const b = Math.floor((r - 1) / 3) * 3 + Math.floor((c - 1) / 3) + 1;
        [ cellSet.row[r], cellSet.col[c], cellSet.box[b] ].flat().forEach(j => {
            const d = digits[j] || '0';
            if (d !== '0') {
                const index = d.charCodeAt(0) - digitBase;
                candidates[index] = '0';
            }
        });
        return candidates.filter(d => d !== '0');
    },

    findSolutions: (digits, userOpt) => {
        const opt = {findAll: false, ...userOpt};
        const state = {
            findAll: opt.findAll,
            solutions: [],
            iterations: 0,
            maxTime: Date.now() + (opt.timeout || 3000),
        };
        const givensCount = digits.filter(d => d !== '0').length;
        if (givensCount < 17) {
            return {
                solutions: [],
                uniqueSolution: false,
                error: 'This arrangement may not have a unique solution',
            };
        }
        modelHelpers.tryCandidates(digits, state, 0);
        const solutions = state.solutions;
        const result = {
            solutions: solutions,
            uniqueSolution: false,
        };
        if (solutions.length === 1  && !state.timedOut) {
            result.uniqueSolution = true;
            result.finalDigits = solutions[0];
        }
        else if (solutions.length > 1 ) {
            result.error = 'This arrangement does not have a unique solution';
        }
        else if (state.timedOut) {
            result.error = 'The solver timed out while checking for a unique solution';
        }
        else {
            result.error = 'This arrangement does not have a solution';
        }
        return result;
    },

    tryCandidates: (digits, state, cellIndex) => {
        state.iterations++;
        if (cellIndex === 81) {
            state.solutions.push(digits.join(''));
            return;
        }
        if (state.timedOut) {
            return;
        }
        if ((state.iterations % 10000) === 0) {
            if (Date.now() > state.maxTime) {
                state.timedOut = true;
                return;
            }
        }
        if (digits[cellIndex] !== '0') {
            modelHelpers.tryCandidates(digits, state, cellIndex + 1);
            return;
        }
        modelHelpers.findCandidatesForCell(digits, cellIndex).forEach(d => {
            if (!state.findAll && state.solutions.length > 1) {
                return;
            }
            digits[cellIndex] = d;
            modelHelpers.tryCandidates(digits, state, cellIndex + 1);
        });
        digits[cellIndex] = '0';
        return;
    },

    // Phase-16 — undo entries grew from "snapshot string" to "rich
    // undo state" so view toggles (Show-candidates, Snyder, Hide
    // pencil marks) and userHidden{Inner,Outer} mutations participate
    // in undo/redo. Encoding shape:
    //
    //     <snapshot>|<flagBits>|<userHiddenInner>|<userHiddenOuter>
    //
    //   - <snapshot>          existing comma-separated cell snapshot
    //                          string (digits, manual pencils, colour)
    //   - <flagBits>          three chars '0'/'1' for showCandidates,
    //                          showSnyderMarks, showPencilmarks
    //   - <userHiddenInner>   comma-separated 'cellIdx:digits' pairs
    //                          (only cells with non-empty userHiddenInner)
    //   - <userHiddenOuter>   same shape for the outer layer
    //
    // pushNewSnapshot now compares the encoded *state* before/after a
    // mutation rather than just the snapshot string, so any change to
    // the flags or the userHidden sets pushes an undo entry. Existing
    // callers were updated to capture the encoded state before
    // mutating the grid.
    captureUndoState: (grid) => {
        // Derive the snapshot portion fresh from the cells rather
        // than reading grid.currentSnapshot — currentSnapshot is only
        // updated by setCurrentSnapshot (called from pushNewSnapshot),
        // so between a cell mutation and the next push it lags
        // behind. Using toSnapshotString ensures the captured state
        // reflects the actual cell state at the moment of capture.
        const flags =
            (grid.get('showCandidates')  ? '1' : '0') +
            (grid.get('showSnyderMarks') ? '1' : '0') +
            (grid.get('showPencilmarks') ? '1' : '0');
        const innerParts = [];
        const outerParts = [];
        grid.get('cells').forEach((c, i) => {
            const uhi = c.get('userHiddenInner').toArray().sort().join('');
            const uho = c.get('userHiddenOuter').toArray().sort().join('');
            if (uhi) innerParts.push(`${i}:${uhi}`);
            if (uho) outerParts.push(`${i}:${uho}`);
        });
        return [
            modelHelpers.toSnapshotString(grid),
            flags,
            innerParts.join(','),
            outerParts.join(','),
        ].join('|');
    },

    // Inverse of captureUndoState. Takes the encoded string and
    // mutates the grid in place. restoreSnapshot is reused for the
    // snapshot-string portion; the view flags and userHidden state
    // are applied on top.
    applyUndoState: (grid, encoded) => {
        const parts = encoded.split('|');
        const snapshot = parts[0] || '';
        const flags = parts[1] || '000';
        const uhiSerial = parts[2] || '';
        const uhoSerial = parts[3] || '';
        // restoreSnapshot rebuilds digit / manual pencils / colour
        // and runs refreshAutoMarkLayers + applyLiveErrorHighlights.
        // We then layer view flags + userHidden on top and re-refresh.
        grid = modelHelpers.restoreSnapshot(grid, snapshot);
        grid = grid.merge({
            showCandidates: flags.charAt(0) === '1',
            showSnyderMarks: flags.charAt(1) === '1',
            showPencilmarks: flags.charAt(2) === '1',
        });
        const innerByIdx = {};
        const outerByIdx = {};
        if (uhiSerial) {
            uhiSerial.split(',').forEach(part => {
                const colon = part.indexOf(':');
                if (colon > 0) {
                    innerByIdx[parseInt(part.slice(0, colon), 10)] = part.slice(colon + 1);
                }
            });
        }
        if (uhoSerial) {
            uhoSerial.split(',').forEach(part => {
                const colon = part.indexOf(':');
                if (colon > 0) {
                    outerByIdx[parseInt(part.slice(0, colon), 10)] = part.slice(colon + 1);
                }
            });
        }
        const newCells = grid.get('cells').map((c, i) => {
            const uhi = innerByIdx[i] ? Set(innerByIdx[i].split('')) : emptySet;
            const uho = outerByIdx[i] ? Set(outerByIdx[i].split('')) : emptySet;
            return c.merge({
                userHiddenInner: uhi,
                userHiddenOuter: uho,
            });
        });
        grid = grid.set('cells', newCells);
        // Auto-mark layers depend on showCandidates / showSnyderMarks
        // and on userHidden, so re-derive after both have been
        // restored.
        return modelHelpers.refreshAutoMarkLayers(grid);
    },

    pushNewSnapshot: (grid, undoStateBefore) => {
        const undoStateAfter = modelHelpers.captureUndoState(grid);
        if (undoStateBefore !== undoStateAfter) {
            // Refresh auto-mark layers so they reflect the new state
            // before we notify subscribers / cache the snapshot.
            grid = modelHelpers.refreshAutoMarkLayers(grid);
            grid = grid
                .update('undoList', list => list.push(undoStateBefore))
                .set('redoList', List());
            // currentSnapshot mirrors the snapshot portion of the
            // encoded state — keep it as the manual-content view
            // because that's what URL / save / share consume.
            const snap = undoStateAfter.split('|')[0];
            grid = modelHelpers.setCurrentSnapshot(grid, snap);
        }
        return grid;
    },

    setCurrentSnapshot: (grid, newSnapshot) => {
        grid = grid.set('currentSnapshot', newSnapshot);
        modelHelpers.notifyPuzzleStateChange(grid);
        return grid;
    },

    notifyPuzzleStateChange: (grid) => {
        const watcher = grid.get('onPuzzleStateChange');
        if (watcher) {
            watcher(grid);
        }
    },

    undoOneAction: (grid) => {
        return modelHelpers.retainSelection(grid, (grid) => {
            const undoList = grid.get('undoList');
            if (actionsBlocked(grid) || undoList.size < 1) {
                return grid;
            }
            const beforeUndo = modelHelpers.captureUndoState(grid);
            const target = undoList.last();
            grid = modelHelpers.applyUndoState(grid, target)
                .set('undoList', undoList.pop())
                .update('redoList', list => list.push(beforeUndo));
            grid = modelHelpers.checkCompletedDigits(grid);
            modelHelpers.notifyPuzzleStateChange(grid);
            return grid;
        });
    },

    redoOneAction: (grid) => {
        return modelHelpers.retainSelection(grid, (grid) => {
            const redoList = grid.get('redoList');
            if (actionsBlocked(grid) || redoList.size < 1) {
                return grid;
            }
            const beforeRedo = modelHelpers.captureUndoState(grid);
            const target = redoList.last();
            grid = modelHelpers.applyUndoState(grid, target)
                .set('redoList', redoList.pop())
                .update('undoList', list => list.push(beforeRedo));
            grid = modelHelpers.checkCompletedDigits(grid);
            modelHelpers.notifyPuzzleStateChange(grid);
            return grid;
        });
    },

    updateCellSnapshotCache: (c) => {
        const digit = c.get('digit');
        const colorCode = c.get('colorCode');
        let cs = '';
        if (digit !== '0' && !c.get('isGiven')) {
            cs = cs + 'D' + digit;
        }
        else {
            const inner = c.get('innerPencils').toArray().sort().join('');
            const outer = c.get('outerPencils').toArray().sort().join('');
            // Round-10: engineInner ('A' marker) — engine-supplied
            // candidates from applyCalculateCandidates. Empty for cells
            // the player hasn't run Calculate Candidates on. URLs from
            // before Round-10 parse cleanly because the parser falls
            // through to its default empty array when no 'A' marker
            // appears.
            const engineInner = c.get('engineInner').toArray().sort().join('');
            cs = cs +
                (outer === '' ? '' : ('T' + outer)) +
                (inner === '' ? '' : ('N' + inner)) +
                (engineInner === '' ? '' : ('A' + engineInner));
        }
        if (colorCode !== '1') {
            cs = cs + 'C' + colorCode;
        }
        return c.set('snapshot', cs);
    },

    toSnapshotString: (grid) => {
        const cells = grid.get('cells');
        const snapshot = cells.filter(c => {
            return c.get('snapshot') !== '';
        }).map(c => {
            return [c.get('row'), c.get('col'), c.get('snapshot')].join('');
        }).toArray().join(',');
        return snapshot;
    },

    parseSnapshotString: (snapshot) => {
        const parsed = {};
        snapshot.split(',').forEach(csn => {
            const props = {
                digit: '0',
                innerPencils: [],
                outerPencils: [],
                // Round-10: engineInner round-trips via the 'A' marker.
                // Snapshots from before Round-10 don't contain 'A' so
                // engineInner stays empty for those — backwards-compat.
                engineInner: [],
                colorCode: '1',
                snapshot: '',
            };
            const index = indexFromRC(csn);
            props.snapshot = csn.substr(2);
            let state = null;
            for(let i = 2; i < csn.length; i++) {
                const char = csn[i];
                if (char === 'D') {
                    props.digit = csn[i+1];
                    i++;
                }
                else if (char === 'C') {
                    props.colorCode = csn[i+1];
                    i++;
                }
                else if (char === 'T' || char === 'N' || char === 'A') {
                    state = char;
                }
                else if ('0' <= char && char <= '9') {
                    if (state === 'T') {
                        props.outerPencils.push(csn[i]);
                    }
                    else if (state === 'N') {
                        props.innerPencils.push(csn[i]);
                    }
                    else if (state === 'A') {
                        props.engineInner.push(csn[i]);
                    }
                }
                // else ignore any other character
            }
            parsed[index] = props;
        });
        return parsed;
    },

    restoreSnapshot: (grid, snapshot) => {
        const parsed = modelHelpers.parseSnapshotString(snapshot);
        const empty = {
            digit: '0',
            colorCode: '1',
            outerPencils: [],
            innerPencils: [],
            engineInner: [],
            snapshot: '',
        };
        const newCells = grid.get('cells').map(c => {
            const index = c.get('index');
            const props = parsed[index] || empty;
            if (c.get('isGiven')) {
                if (c.get('colorCode') !== props.colorCode) {
                    c = c.merge({
                        colorCode: props.colorCode,
                        snapshot: props.snapshot,
                    });
                }
            }
            else {
                c = c.merge({
                    digit: props.digit,
                    colorCode: props.colorCode,
                    outerPencils: Set(props.outerPencils),
                    innerPencils: Set(props.innerPencils),
                    engineInner: Set(props.engineInner || []),
                    snapshot: props.snapshot,
                });
            }
            return c;
        });
        grid = grid.set('cells', newCells);
        grid = modelHelpers.setCurrentSnapshot(grid, snapshot);
        // Undo/redo restored manual state — re-derive auto-mark layers
        // so any active modes reflect the restored grid.
        grid = modelHelpers.refreshAutoMarkLayers(grid);
        // G-05 — also refresh conflict highlights so an undo that
        // removed a duplicate digit clears the red tint, and a redo
        // that re-introduces one re-tints it.
        return modelHelpers.applyLiveErrorHighlights(grid);
    },

    retainSelection: (grid, operation) => {
        const isSelected = grid.get('cells').filter(c => c.get('isSelected')).reduce((s, c) => {
            s[c.get('index')] = true;
            return s;
        }, {});

        grid = operation(grid);

        const newCells = grid.get('cells').map(c => {
            return (c.get('isSelected') === (isSelected[c.get('index')] || false))
                ? c
                : c.set('isSelected', true);
        });
        return grid.set('cells', newCells);
    },

    showWelcomeModal: (grid) => {
        // Batch-1: the recently-played strip and its fetch were dropped
        // along with the daily/streak surfaces. The welcome modal no
        // longer needs `fetchRequired` (which app.js used as the cue
        // to hit fetchRecentlyShared) or the `loading` flag (no async
        // data to wait for). showRatings / shortenLinks remain because
        // the saved-puzzles list inside PasteSection still uses them.
        return grid.set('modalState', {
            modalType: MODAL_TYPE_WELCOME,
            showRatings: modelHelpers.getSetting(grid, SETTINGS.showRatings),
            savedPuzzles: modelHelpers.getSavedPuzzles(grid),
            shortenLinks: modelHelpers.getSetting(grid, SETTINGS.shortenLinks),
        });
    },

    confirmRestart: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_CONFIRM_RESTART,
            solved: grid.get("solved"),
            escapeAction: 'close',
        });
    },

    confirmClearColorHighlights: (grid) => {
        const coloredCount = grid.get('cells').count(c => c.get('colorCode') !== '1')
        if (coloredCount > 0) {
            return grid.set('modalState', {
                modalType: MODAL_TYPE_CONFIRM_CLEAR_COLOR_HIGHLIGHTS,
                escapeAction: 'close',
            });
        }
        return grid;
    },

    showSavedPuzzlesModal: (grid, oldModalState) => {
        if (!oldModalState) {
            oldModalState = {
                showRatings: modelHelpers.getSetting(grid, SETTINGS.showRatings),
                savedPuzzles: modelHelpers.getSavedPuzzles(grid),
            };
        }
        const {savedPuzzles} = oldModalState;
        if (!savedPuzzles || savedPuzzles.length === 0) {
            return modelHelpers.showWelcomeModal(grid);
        }
        return grid.set('modalState', {
            ...oldModalState,
            modalType: MODAL_TYPE_SAVED_PUZZLES,
            shortenLinks: modelHelpers.getSetting(grid, SETTINGS.shortenLinks),
            escapeAction: 'show-welcome-modal',
        });
    },

    showShareModal: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_SHARE,
            initialDigits: grid.get('initialDigits'),
            difficultyLevel: grid.get('difficultyLevel'),
            intervalStartTime: grid.get('intervalStartTime'),
            endTime: grid.get('endTime'),
            shortenLinks: modelHelpers.getSetting(grid, SETTINGS.shortenLinks),
            escapeAction: 'close',
        });
    },

    showPasteModal: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_PASTE,
            escapeAction: 'cancel-paste',
        });
    },

    showSolverModal: (grid) => {
        const passProgressSetting = modelHelpers.getSetting(grid, SETTINGS.passProgressToSolver);
        return grid.set('modalState', {
            modalType: MODAL_TYPE_SOLVER,
            initialDigits: grid.get('initialDigits'),
            allDigits: grid.get('cells').map(c => c.get('digit')).join(''),
            passProgressSetting,
            escapeAction: 'close',
        });
    },

    showQRModal: (grid, puzzleURL) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_QR_CODE ,
            puzzleURL,
            escapeAction: 'show-share-modal',
        });
    },

    showSettingsModal: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_SETTINGS,
            currentSettings: grid.get('settings'),
            // Round-12 (2026-05-01): the active puzzle's Hardcore lock
            // is a separate state from the SETTINGS.hardcoreMode toggle
            // — the lock is captured at game start and the toggle takes
            // effect on the NEXT puzzle. Surface the current lock here
            // so ModalSettings can render an "Applies on next puzzle"
            // pill on the Hardcore row when the two diverge.
            lockedHardcore: !!grid.get('lockedHardcore'),
            // Round-12 — Puzzle / More nav rows inside Settings need
            // initialDigits to know whether Share / Open-in-Wiki are
            // valid (they require a started puzzle).
            initialDigits: grid.get('initialDigits'),
            escapeAction: 'close',
        });
    },

    showHintModal: (grid, options = {}) => {
        // P12a-fix: if the puzzle is already solved (e.g. the player
        // hit Apply & Next on the last hint), there's nothing left
        // to suggest — quietly bail rather than walking the explainer
        // step list (which would otherwise return null and pop a
        // useless "no hint available" modal on top of the win flow).
        if (grid.get('solved')) {
            return grid;
        }
        // Alert user of any error first if there are any
        grid = modelHelpers.gameOverCheck(grid);
        const modalState = grid.get('modalState');
        if (modalState && modalState.icon !== 'ok') {
            return grid;
        }
        grid = grid.set('modalState', undefined);
        // B7 / QA-2 (#7): hint budget is enforced AND surfaced in the
        // modal as a small chip ("3 / 5 used"). Computed once and
        // attached to every variant of the hint modalState below so
        // the modal renderer doesn't have to thread context through
        // ModalContainer.
        const budgetSetting = modelHelpers.getSetting(grid, SETTINGS.hintBudget) || 'unlimited';
        const budgetInfo = {
            setting: budgetSetting,
            used: grid.get('hintsUsed').size,
            limit: budgetSetting === 'unlimited' ? null : parseInt(budgetSetting, 10),
        };
        if (budgetInfo.limit !== null && budgetInfo.used >= budgetInfo.limit) {
            return grid.set('modalState', {
                modalType: MODAL_TYPE_HINT,
                escapeAction: 'close',
                budgetExceeded: true,
                budgetInfo,
            });
        }

        // Make sure we have hints available
        const explainer = grid.get('explainer');
        if (!explainer) {
            return grid.set('modalState', {
                modalType: MODAL_TYPE_HINT,
                fetchRequired: true,
                loading: true,
                retries: 10,
                budgetInfo,
            });
        }
        const hint = modelHelpers.findNextHint(grid);
        if (hint) {
            // Batch-5 — two-stage hint disclosure. When the user has
            // the 'nudge' style enabled, open in nudge stage first;
            // the 'reveal-hint' modal action transitions stage and
            // burns the hint then. Falls back to 'reveal' if the hint
            // payload predates the nudge fields.
            //
            // Batch-6 — Apply & Next signals a "fast-forward through
            // hints" intent. Once the player presses it (from either
            // nudge or reveal stage), every subsequent hint in the
            // chain opens in reveal stage regardless of setting; the
            // chain breaks only when the modal closes for real. The
            // forceReveal option carries that signal across the
            // applyHint → showHintModal call.
            //
            // Batch-6 — the QA-4 "tryFillFirst" intercept on T&E
            // hints (which used to suggest the player toggle Show-
            // candidates before applying brute-force) was removed.
            // Show-candidates is now a first-class keypad button
            // and the intercept added friction without earning it;
            // T&E hints surface directly as a regular reveal/nudge.
            // The 'show-candidates-from-hint' action handler is
            // left in place as dead code in case the flow is ever
            // re-introduced.
            const hintStyle = modelHelpers.getSetting(grid, SETTINGS.hintStyle) || 'nudge';
            const isNudgeStage = !options.forceReveal
                && hintStyle === 'nudge'
                && !!hint.nudge;
            grid = grid.set('modalState', {
                modalType: MODAL_TYPE_HINT,
                escapeAction: 'close',
                hint: hint,
                budgetInfo,
                revealStage: isNudgeStage ? 'nudge' : 'reveal',
            });
            // Don't burn a hint from the budget for a nudge —
            // only when the player actually applies (or reveals).
            if (!isNudgeStage) {
                grid = modelHelpers.markHintUsed(grid, hint);
            }
        }
        else {
            grid = grid.set('modalState', {
                modalType: MODAL_TYPE_HINT,
                escapeAction: 'close',
                noHint: true,
                budgetInfo,
            });
        }
        return grid;
    },

    showHelpPage: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_HELP,
            escapeAction: 'close',
        });
    },

    showAboutModal: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_ABOUT,
            escapeAction: 'close',
         });
    },

    showFeaturesModal: (grid) => {
        return grid.set('modalState', {
            modalType: MODAL_TYPE_FEATURES,
            availableFeatures: AVAILABLE_FEATURE_FLAGS,
            enabledFeatures: grid.get("featureFlags"),
            escapeAction: 'goto-main-entry',
         });
    },

    applyModalAction: (grid, args) => {
        const action = args.action || args;
        const oldModalState = grid.get('modalState');
        grid = grid.set('modalState', undefined);
        if (action === 'cancel' || action === 'close') {
            return grid;
        }
        else if (action === 'cancel-paste') {
            return modelHelpers.showWelcomeModal(grid);
        }
        else if (action === 'cancel-solver') {
            return modelHelpers.saveSolverPreferences(grid, args.passProgress);
        }
        else if (action === 'goto-main-entry') {
            window.location.href = window.location.href.replace(/[?#].*$/, "");
            return grid;
        }
        else if (action === 'show-welcome-modal') {
            return modelHelpers.showWelcomeModal(grid);
        }
        else if (action === 'show-saved-puzzles-modal') {
            return modelHelpers.showSavedPuzzlesModal(grid, oldModalState);
        }
        else if (action === 'show-stats-modal') {
            // Reset-stats batch — used by the confirm modal's
            // escapeAction (Cancel / Esc) to return to Stats with the
            // previous data intact, AND by the reset-stats-confirmed
            // action to land the user on the now-empty Stats view
            // after the wipe.
            return modelHelpers.showStatsModal(grid);
        }
        else if (action === 'show-confirm-reset-stats') {
            return modelHelpers.showConfirmResetStats(grid);
        }
        else if (action === 'reset-stats-confirmed') {
            return modelHelpers.resetAllStatsAndSavedPuzzles(grid);
        }
        else if (action === 'discard-saved-puzzle') {
            return modelHelpers.discardSavedPuzzle(grid, args.puzzleStateKey);
        }
        else if (action === 'resume-saved-puzzle') {
            // Only called from ResumeRestart modal - the SavedPuzzle modal
            // achieves similar through a link.
            return modelHelpers.restoreFromPuzzleState(grid, args.puzzleStateKey);
        }
        else if (action === 'restart-over-saved-puzzle') {
            return modelHelpers.restartOverSavedPuzzle(grid, args.puzzleStateKey);
        }
        else if (action === 'show-share-modal') {
            return modelHelpers.showShareModal(grid);
        }
        else if (action === 'retry-initial-digits') {
            return modelHelpers.retryInitialDigits(grid, args.digits);
        }
        else if (action === 'show-paste-modal') {
            return modelHelpers.showPasteModal(grid);
        }
        else if (action === 'show-qr-modal') {
            return modelHelpers.showQRModal(grid, args.puzzleURL);
        }
        else if (action === 'paste-initial-digits') {
            return modelHelpers.retryInitialDigits(grid, args.digits);
        }
        else if (action === 'save-settings') {
            return modelHelpers.applyNewSettings(grid, args.newSettings);
        }
        else if (action === 'save-feature-flags') {
            return modelHelpers.applyNewFeatureFlags(grid, args.newFeatureFlags);
        }
        else if (action === 'show-error-location') {
            // G-08 — driven by the "Show me where" button on the
            // check-error modal. args.firstErrorIndex carries the
            // leftmost conflicting cell stashed by gameOverCheck.
            return modelHelpers.applyShowErrorLocation(grid, args.firstErrorIndex);
        }
        else if (action === 'apply-hint-and-next') {
            // U-08 — "Apply & next" secondary in the hint modal.
            // Applies the current hint exactly like apply-hint, then
            // immediately re-opens the hint modal with the next hint
            // so a stuck player doesn't have to round-trip the modal
            // for every step. showHintModal handles budget exhaustion
            // and the no-more-hints case (renders an empty-state).
            //
            // Batch-6: when triggered from nudge stage, the hint
            // hasn't been burned yet (nudges are free). Apply implies
            // commit, so burn it here before applying. Without this
            // the budget would never decrement when the player chains
            // Apply&Next from the nudge stage.
            //
            // Batch-6 (follow-up): pressing Apply & Next is a strong
            // "keep going, skip the nudge" signal — bouncing the
            // player back to a fresh nudge for the next hint defeats
            // the purpose. forceReveal: true tells showHintModal to
            // open the next hint directly in reveal stage regardless
            // of the player's hintStyle setting; the chain breaks the
            // moment the modal closes (Close / Esc), so a fresh Hint
            // press starts back at nudge stage as before.
            if (oldModalState && oldModalState.revealStage === 'nudge') {
                grid = modelHelpers.markHintUsed(grid, args.hint);
            }
            grid = modelHelpers.applyHint(grid, args.hint);
            return modelHelpers.showHintModal(grid, { forceReveal: true });
        }
        else if (action === 'restart-confirmed') {
            return modelHelpers.applyRestart(grid);
        }
        else if (action === 'clear-color-highlights-confirmed') {
            return modelHelpers.applyClearColorHighlights(grid);
        }
        else if (action === 'resume-timer') {
            return modelHelpers.resumeTimer(grid);
        }
        else if (action === 'apply-hint') {
            return modelHelpers.applyHint(grid, args.hint);
        }
        else if (action === 'reveal-hint') {
            // Batch-5 — two-stage hint disclosure transition. The user
            // saw the nudge and pressed "Show me anyway"; burn the
            // hint from the budget now, then re-set the modal state
            // with revealStage='reveal' and a refreshed budgetInfo so
            // the chip reflects the just-burned hint without waiting
            // for the next modal open. The applyModalAction wrapper
            // above already cleared modalState; we restore it from
            // the saved oldModalState.
            if (!oldModalState || !oldModalState.hint) return grid;
            grid = modelHelpers.markHintUsed(grid, oldModalState.hint);
            const budgetSetting = modelHelpers.getSetting(grid, SETTINGS.hintBudget) || 'unlimited';
            const budgetInfo = {
                setting: budgetSetting,
                used: grid.get('hintsUsed').size,
                limit: budgetSetting === 'unlimited' ? null : parseInt(budgetSetting, 10),
            };
            return grid.set('modalState', {
                ...oldModalState,
                revealStage: 'reveal',
                budgetInfo,
            });
        }
        else if (action === 'show-candidates-from-hint') {
            // QA-4 (#12): T&E pre-fill flow — the player chose to
            // enable Show-candidates and look at the field themselves
            // rather than apply the brute-force step. Toggle the
            // global flag if it isn't already on; the modal stays
            // closed (we already cleared modalState above).
            if (!grid.get('showCandidates')) {
                grid = modelHelpers.toggleShowCandidates(grid);
            }
            return grid;
        }
        else {
            console.log(`Unhandled modal action '${action}', args =`, args);
        }
        return grid;
    },

    persistPuzzleState: (grid) => {
        if (!modelHelpers.getSetting(grid, SETTINGS.autoSave)) {
            return;
        }
        const solved = grid.get('solved');
        const initialDigits = grid.get('initialDigits');
        const puzzleStateKey = grid.get("puzzleStateKey");
        if (solved) {
            localStorage.removeItem(puzzleStateKey);
        }
        else {
            // Don't bother saving if there's no progress to save yet
            const currentSnapshot = grid.get('currentSnapshot');
            const previousSave = localStorage.getItem(puzzleStateKey) || '';
            if (previousSave === '') {
                if (currentSnapshot === '') {
                    return;
                }
                // We're saving a new puzzle, so check if we need to discard old ones
                modelHelpers.pruneSavedState(grid);
            }
            const elapsedTime = (grid.get('pausedAt') || Date.now()) - grid.get('intervalStartTime');
            const puzzleState = {
                initialDigits,
                difficultyLevel: grid.get('difficultyLevel'),
                startTime: grid.get('startTime'),
                elapsedTime: elapsedTime,
                undoList: grid.get('undoList').toArray(),
                redoList: grid.get('redoList').toArray(),
                currentSnapshot: currentSnapshot,
                hintsUsed: grid.get('hintsUsed').toArray(),
                lastUpdatedTime: Date.now(),
                // Round-6: persist the puzzle's hardcore lock so a
                // resumed game keeps its starting mode regardless of
                // any setting flip the player has made since.
                lockedHardcore: !!grid.get('lockedHardcore'),
            };
            const difficultyRating = grid.get('difficultyRating');
            if (difficultyRating) {
                puzzleState.difficultyRating = difficultyRating;
            }
            const puzzleStateJson = JSON.stringify(puzzleState);
            localStorage.setItem(puzzleStateKey, puzzleStateJson);
        }
    },

    pruneSavedState: (grid) => {
        const savedPuzzles = modelHelpers.getSavedPuzzles(grid) || [];
        if (savedPuzzles.length <= MAX_SAVED_PUZZLES) {
            return;
        }
        savedPuzzles.forEach((p, i) => {
            if (i >= (MAX_SAVED_PUZZLES - 1)) {
                localStorage.removeItem(p.puzzleStateKey);
            }
        });
    },

    handleVisibilityChange: (grid, isVisible) => {
        if (grid.get('solved') || grid.get('modalState')) {
            return grid;
        }
        if (grid.get('mode') === 'solve') {
            if (isVisible === false) {
                modelHelpers.persistPuzzleState(grid);
                const intervalEnd = grid.get('pausedAt') || Date.now();
                const intervalBeforePause = intervalEnd - grid.get('intervalStartTime');
                grid = grid.set('intervalBeforePause', intervalBeforePause);
            }
            else {
                const intervalBeforePause = grid.get('intervalBeforePause');
                grid = grid.delete('intervalBeforePause');
                const pausedAt = grid.get('pausedAt');
                if (intervalBeforePause && !pausedAt) {
                    grid = grid.set('intervalStartTime', Date.now() - intervalBeforePause);
                }
            }
        }
        return grid;
    },

    discardSavedPuzzle: (grid, puzzleStateKey) => {
        localStorage.removeItem(puzzleStateKey);
        return modelHelpers.showSavedPuzzlesModal(grid);
    },

    restartOverSavedPuzzle: (grid, puzzleStateKey) => {
        localStorage.removeItem(puzzleStateKey);
        grid = grid.set("startTime", Date.now());
        return grid;
    },

    restoreFromPuzzleState: (grid, puzzleStateKey) => {
        let puzzleState;
        try {
            const puzzleStateJson = localStorage.getItem(puzzleStateKey);
            puzzleState =  JSON.parse(puzzleStateJson);
        } catch (e) {
            if (puzzleStateKey) localStorage.removeItem(puzzleStateKey);
            return modelHelpers.showWelcomeModal(grid);
        }
        // Round-5 fix #1.1 — JSON.parse(null) returns null without
        // throwing, so a missing localStorage entry would silently
        // hand `null` past the try/catch and crash the destructure
        // below. Treat the null-state case the same as a parse error:
        // remove the dead key (if any) and show the welcome modal so
        // the player can start fresh instead of seeing a frozen page.
        if (!puzzleState) {
            if (puzzleStateKey) localStorage.removeItem(puzzleStateKey);
            return modelHelpers.showWelcomeModal(grid);
        }
        const {initialDigits, currentSnapshot} = puzzleState;
        // Round-6: restore the puzzle's hardcore lock from the saved
        // state. Older saves (no field) fall back to false — a pre-
        // hardcore puzzle is by definition not hardcore.
        const lockedHardcore = !!puzzleState.lockedHardcore;
        grid = grid.merge({
            mode: 'solve',
            initialDigits,
            difficultyLevel: puzzleState.difficultyLevel,
            startTime: puzzleState.startTime,
            intervalStartTime: Date.now() - puzzleState.elapsedTime,
            undoList: List(puzzleState.undoList),
            redoList: List(puzzleState.redoList),
            hintsUsed: Set(puzzleState.hintsUsed || []),
            pausedAt: undefined,
            modalState: undefined,
            lockedHardcore,
        });
        grid = modelHelpers.setGivenDigits(grid, initialDigits, {fromPuzzleState: true});
        grid = modelHelpers.restoreSnapshot(grid, currentSnapshot);
        grid = modelHelpers.checkCompletedDigits(grid);
        modelHelpers.notifyPuzzleStateChange(grid);
        return grid;
    },

    retryInitialDigits: (grid, digits) => {
        if(modelHelpers.getSetting(grid, SETTINGS.shortenLinks)) {
            digits = compressPuzzleDigits(digits);
        }

        window.location.search = `s=${digits}`;
        return grid;
    },

    applyNewSettings: (grid, newSettings) => {
        const oldSettings = grid.get('settings') || {};
        grid = modelHelpers.saveSettings(grid, newSettings);
        // QA-4: disabling the Snyder advanced setting also retires
        // any active Snyder overlay — otherwise the cascade marks
        // would linger after the setting that exposed them is gone.
        if (
            !!oldSettings[SETTINGS.snyderModeAdvanced] &&
            !newSettings[SETTINGS.snyderModeAdvanced] &&
            grid.get('showSnyderMarks')
        ) {
            grid = grid.set('showSnyderMarks', false);
            grid = modelHelpers.refreshAutoMarkLayers(grid);
        }
        // Bugs A + C — re-run the live highlight pass when
        // highlightConflicts toggles. Toggling OFF clears any red
        // tints currently on the grid; toggling ON tints any
        // existing duplicates the player accumulated while it was off.
        if (!!oldSettings[SETTINGS.highlightConflicts] !== !!newSettings[SETTINGS.highlightConflicts]) {
            grid = modelHelpers.applyLiveErrorHighlights(grid);
        }
        return grid;
    },

    applyNewFeatureFlags: (grid, newFeatureFlags) => {
        grid = modelHelpers.saveFeatureFlags(grid, newFeatureFlags);
        window.location.href = window.location.href.replace(/[?#].*$/, "");
        return grid;
    },

    collapseAllOuterPencilMarks: (grid) => {
        const newCells = grid.get('cells').map(c => {
            return modelHelpers.updateCellSnapshotCache(
                modelHelpers.pencilMarksToInnerAsCellOp(c)
            );
        });
        grid = grid.set('cells', newCells);
        const snapshotAfter = modelHelpers.toSnapshotString(grid);
        return modelHelpers.setCurrentSnapshot(grid, snapshotAfter);
    },

    applyRestart: (grid) => {
        // Bug 4 — restart now resets the clock unconditionally. The
        // previous behaviour only zeroed startTime/intervalStartTime
        // when the puzzle was already solved, which contradicted the
        // restart-from-saved-puzzle path (restartOverSavedPuzzle, which
        // always sets a fresh startTime) and surprised players who
        // expected "Restart" to mean a clean slate. pausedAt is also
        // cleared so a paused mid-puzzle restart doesn't leave the
        // pause modal armed against the new run.
        const startTime = Date.now();
        // Round-6: Restart re-captures the hardcore setting from the
        // current settings map. Lifecycle: a global toggle made
        // mid-puzzle takes effect on the NEXT attempt — Restart is
        // a "next attempt", so the lock refreshes here.
        const settings = grid.get('settings') || {};
        const lockedHardcore = !!settings[SETTINGS.hardcoreMode];
        grid = grid.merge({
            'solved': false,
            'startTime': startTime,
            'intervalStartTime': startTime,
            'endTime': undefined,
            'pausedAt': undefined,
            'hintsUsed': emptySet,
            'lockedHardcore': lockedHardcore,
        });
        const emptySnapshot = '';
        grid = modelHelpers.restoreSnapshot(grid, emptySnapshot)
            .merge({
                'undoList': List(),
                'redoList': List(),
                'focusIndex': null,
                'matchDigit': '0',
                'completedDigits': {},
                'inputMode': 'digit',
                'hintsUsed': emptySet,
                // QA-fix #10 — Restart drops the auto-fill toggles so
                // the puzzle starts with all candidates off (the
                // showPencilmarks default of true stays — that's the
                // "are pencil marks visible at all" master switch,
                // not an auto-fill flag). restoreSnapshot already
                // clears the per-cell innerPencils/outerPencils;
                // these two flags govern the auto-derived layers
                // (showCandidates fills every empty cell with its
                // legal digits, showSnyderMarks runs the Snyder
                // cascade), which would otherwise repopulate
                // immediately on the empty grid.
                'showCandidates': false,
                'showSnyderMarks': false,
                'showPencilmarks': true,
            });
        return modelHelpers.checkCompletedDigits(grid);
    },

    applyHint: (grid, hint) => {
        grid = hint.digitValue
            ? modelHelpers.applyNewDigitHint(grid, hint)
            : modelHelpers.applyCandidateEliminationHint(grid, hint);
        grid = modelHelpers.checkCompletedDigits(grid);
        return grid;
    },

    // G-02: Per-cell candidate fill driven by hint.highlightCell.
    // Reads the current hint from modalState, computes legal candidates
    // for each highlighted empty cell, writes them to engineInner
    // (the engine-supplied pencil-mark layer — Round-10), clears any
    // prior userHiddenInner that would mask them, and re-requests the
    // hint so the engine can now apply its elimination.
    //
    // Round-10 (2026-05-01): the candidates land in engineInner, not
    // innerPencils, so the renderer paints them in the auto colour
    // (--pencil-mark-auto-color) instead of printer's red. Red is now
    // reserved for digits the player typed via the numpad.
    applyCalculateCandidates: (grid) => {
        const modalState = grid.get('modalState');
        const hint = modalState && modalState.hint;
        if (!hint || !hint.highlightCell) {
            return grid;
        }
        const highlightCell = hint.highlightCell;
        const hinter = modelHelpers.hinter(grid);
        const candidates = hinter.calculateCellCandidates();
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        const cells = grid.get('cells').map(c => {
            const i = c.get('index');
            if (highlightCell[i] && c.get('digit') === '0') {
                const cellCands = candidates[i] || [];
                if (cellCands.length > 0) {
                    let engineInner = c.get('engineInner');
                    let userHiddenInner = c.get('userHiddenInner');
                    cellCands.forEach(d => {
                        engineInner = engineInner.add(d);
                        if (userHiddenInner.includes(d)) {
                            userHiddenInner = userHiddenInner.delete(d);
                        }
                    });
                    c = c.merge({
                        engineInner,
                        userHiddenInner,
                    });
                    c = modelHelpers.updateCellSnapshotCache(c);
                }
            }
            return c;
        });
        grid = grid.set('cells', cells);
        grid = grid.set('modalState', undefined);
        // Phase-16: pushNewSnapshot handles the no-change case
        // internally (compares full undo state), so the previous
        // snapshot-string equality short-circuit is no longer needed.
        grid = modelHelpers.pushNewSnapshot(grid, undoStateBefore);
        // Re-request a hint now that candidates are visible.
        // Batch-6: pressing Enter (G-02 candidate fill) is part of
        // an ongoing hint reveal — the player has already committed
        // to seeing the answer for this step. Pass forceReveal so
        // the re-opened hint doesn't bounce back to a nudge.
        return modelHelpers.showHintModal(grid, { forceReveal: true });
    },

    applyNewDigitHint: (grid, hint) => {
        grid = modelHelpers.applySelectionOp(grid, 'setSelection', hint.digitIndex);
        return modelHelpers.updateSelectedCells(grid, 'setDigit', hint.digitValue);
    },

    applyCandidateEliminationHint: (grid, hint) => {
        const eliminations = hint.eliminationsByCell;
        let matchDigit;
        if (eliminations) {
            const undoStateBefore = modelHelpers.captureUndoState(grid);
            const cells = grid.get('cells').map(c => {
                const i = c.get('index');
                const ce = eliminations[i];
                if (ce) {
                    let innerPencils = c.get('innerPencils');
                    let outerPencils = c.get('outerPencils');
                    // Round-10: engineInner also gets the elimination
                    // applied — engine-supplied candidates that the hint
                    // itself eliminates shouldn't survive on the cell.
                    let engineInner = c.get('engineInner');
                    // G-01: also write to userHidden{Inner,Outer} so eliminated
                    // digits are filtered from auto-derived layers (Snyder /
                    // ≤3 / All), not just from the manual sets.
                    let userHiddenInner = c.get('userHiddenInner');
                    let userHiddenOuter = c.get('userHiddenOuter');
                    Object.keys(ce).forEach(d => {
                        matchDigit = d;
                        if (innerPencils.includes(d)) {
                            innerPencils = innerPencils.delete(d);
                        }
                        if (outerPencils.includes(d)) {
                            outerPencils = outerPencils.delete(d);
                        }
                        if (engineInner.includes(d)) {
                            engineInner = engineInner.delete(d);
                        }
                        userHiddenInner = userHiddenInner.add(d);
                        userHiddenOuter = userHiddenOuter.add(d);
                    });
                    c = c.merge({
                        'innerPencils': innerPencils,
                        'outerPencils': outerPencils,
                        'engineInner': engineInner,
                        'userHiddenInner': userHiddenInner,
                        'userHiddenOuter': userHiddenOuter,
                    });
                    c = modelHelpers.updateCellSnapshotCache(c);
                }
                return c;
            });
            grid = grid.merge({
                'cells': cells,
                'matchDigit': matchDigit,
            });
            grid = modelHelpers.clearSelection(grid);
            grid = modelHelpers.pushNewSnapshot(grid, undoStateBefore);
        }
        return grid;
    },

    saveSolverPreferences: (grid, passProgress) => {
        const allSettings = grid.get('settings');
        if (allSettings[SETTINGS.passProgressToSolver] === passProgress) {
            return grid;
        }
        const newSettings = { ...allSettings, [SETTINGS.passProgressToSolver]: passProgress }
        return modelHelpers.saveSettings(grid, newSettings);
    },

    trackSnapshotsForUndo: (grid, f) => {
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        grid = f(grid);
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    applyClearColorHighlights: (grid) => {
        return modelHelpers.trackSnapshotsForUndo(grid, grid => {
            const cells = grid.get('cells').map(c => {
                if (c.get('colorCode') !== '1') {
                    c = modelHelpers.updateCellSnapshotCache( c.set('colorCode', '1') );
                }
                return c;
            });
            return grid.merge({
                cells: cells,
                inputMode: 'digit',
            });
        });
    },

    gameOverCheck: (grid) => {
        const digits = grid.get('cells').map(c => c.get('digit')).join('');
        const finalDigits = grid.get('finalDigits');
        const result = modelHelpers.checkDigits(digits, finalDigits);
        if (result.hasErrors) {
            // Bug B — Check is the explicit "find my errors" gesture.
            // Force-highlight even when the live setting is OFF; the
            // modal copy below ("Errors found in highlighted cells")
            // would otherwise lie when the player has the live
            // setting disabled.
            grid = modelHelpers.applyErrorHighlights(grid, result.errorAtIndex, {force: true});
            // G-08 — surface the leftmost (smallest cell index)
            // conflicting cell so the modal can offer a "Show me where"
            // affordance that selects it + lights up matchDigit. The
            // index is stashed on modalState; the dispatcher picks it
            // up via applyShowErrorLocation.
            const errorIndices = Object.keys(result.errorAtIndex || {})
                .map(k => parseInt(k, 10))
                .filter(n => !Number.isNaN(n));
            const firstErrorIndex = errorIndices.length > 0
                ? Math.min(...errorIndices)
                : undefined;
            grid = grid.set('modalState', {
                modalType: MODAL_TYPE_CHECK_RESULT,
                icon: 'error',
                errorMessage: 'Errors found in highlighted cells',
                escapeAction: 'close',
                firstErrorIndex,
            });
        }
        else if (grid.get('mode') === 'enter') {
            const digits = grid.get('cells').map(c => c.get('digit')).toArray();
            const result = modelHelpers.findSolutions(digits);
            if (result.uniqueSolution) {
                // U-05 — clearer copy ("Puzzle is solvable" / one-line
                // explainer) plus a primary "Start solving" CTA so the
                // player doesn't have to find the corner Start link
                // afterwards. puzzleStartHref carries the same
                // ?s=<digits> URL the in-app Start link uses, letting
                // modal-check-result render it as an <a>.
                grid = grid.set('modalState', {
                    modalType: MODAL_TYPE_CHECK_RESULT,
                    icon: 'ok',
                    title: 'Puzzle is solvable',
                    errorMessage: 'Exactly one valid solution. Ready when you are.',
                    escapeAction: 'close',
                    puzzleStartHref: '?s=' + digits.join(''),
                });
            }
            else {
                grid = grid.set('modalState', {
                    modalType: MODAL_TYPE_CHECK_RESULT,
                    icon: 'warning',
                    errorMessage: result.error,
                    escapeAction: 'close',
                });
            }
        }
        else if (result.incompleteCount) {
            const s = result.incompleteCount === 1 ? '' : 's';
            grid = grid.set('modalState', {
                modalType: MODAL_TYPE_CHECK_RESULT,
                icon: 'ok',
                errorMessage: `No conflicting digits were found, but ${result.incompleteCount} cell${s} not yet filled`,
                escapeAction: 'close',
            });
        }
        return grid;
    },

    // G-08 — handler for the modal's "Show me where" button. Selects
    // the leftmost conflicting cell (passed in via modalState's
    // firstErrorIndex) and clears the modal. applySelectionOp's
    // setSelection branch automatically refreshes focusIndex and
    // matchDigit for us, so the row/col/box wash and digit highlight
    // light up without extra plumbing.
    applyShowErrorLocation: (grid, firstErrorIndex) => {
        grid = grid.set('modalState', undefined);
        if (firstErrorIndex === undefined || firstErrorIndex === null) {
            return grid;
        }
        return modelHelpers.applySelectionOp(grid, 'setSelection', firstErrorIndex);
    },

    // B1 — Count conflicting cells. P12a-fix: previously this had its
    // own row/col/box duplicate scan that ran in parallel to
    // checkDigits, which is the source of truth for cell-level
    // conflict tinting. Any subtle divergence between the two scans
    // produced the symptom that triggered this fix — the chip read
    // "no conflicts" while a cell was already painted red. Delegating
    // to checkDigits guarantees the chip count and the cell tint are
    // computed from exactly the same logic. Pure read; no mutation;
    // no dependency on the highlightConflicts setting.
    countConflicts: (grid) => {
        const digits = grid.get('cells').map(c => c.get('digit')).join('');
        const result = modelHelpers.checkDigits(digits);
        return result.errorAtIndex
            ? Object.keys(result.errorAtIndex).length
            : 0;
    },

    applyErrorHighlights: (grid, errorAtIndex = {}, opts) => {
        // Bug A / C — when SETTINGS.highlightConflicts is OFF, treat the
        // incoming errorAtIndex as empty so existing red tints clear on
        // a setting flip. Previously this function early-returned on the
        // OFF case, which meant any tint set while the setting was ON
        // persisted forever even after the player turned it off.
        //
        // Bug B — Check is the explicit "find my errors" gesture; it must
        // highlight regardless of the live-highlight setting. Callers
        // pass {force: true} to bypass the setting check (gameOverCheck
        // does so). Subsequent live passes will tidy up per the player's
        // setting.
        const force = !!(opts && opts.force);
        const settingOn = modelHelpers.getSetting(grid, SETTINGS.highlightConflicts);
        // Batch-5: in enter mode (custom-puzzle creation) conflict
        // tinting is feedback, not a preference — without it, the player
        // can't see a misplaced given until they press Start. Treat the
        // setting as on regardless of what the user chose for solve
        // mode. The complementary restriction-highlight override lives
        // in components/sudoku-grid/sudoku-grid.js.
        const enterMode = grid.get('mode') === 'enter';
        const effectiveErrorAtIndex = (force || settingOn || enterMode) ? errorAtIndex : {};
        const cells = grid.get('cells').map((c) => {
            const index = c.get('index');
            const ok = (
                c.get('isGiven')
                || (c.get('errorMessage') === effectiveErrorAtIndex[index])
            );
            return ok ? c : c.set('errorMessage', effectiveErrorAtIndex[index]);
        });
        return grid.set('cells', cells);
    },

    // G-05 — live conflict highlighting. Called from updateSelectedCells
    // after a digit op and from restoreSnapshot after undo/redo so
    // tints refresh in lockstep with the underlying digit grid.
    // applyErrorHighlights short-circuits when SETTINGS.highlightConflicts
    // is off, so this is a cheap no-op for users who disabled the
    // setting. checkDigits called WITHOUT finalDigits argument so it
    // reports row/col/box duplicates only — wrong-but-not-conflicting
    // entries (e.g. solver disagrees) stay silent here; explicit Check
    // still surfaces those.
    applyLiveErrorHighlights: (grid) => {
        const digits = grid.get('cells').map(c => c.get('digit')).join('');
        const result = modelHelpers.checkDigits(digits);
        return modelHelpers.applyErrorHighlights(grid, result.errorAtIndex || {});
    },

    defaultDigitOpForSelection: (grid) => {
        const selection = grid.get("cells").filter((c) => c.get("isSelected"));
        if (selection.size < 2) {
            return 'setDigit';
        }
        const seen = {};
        const sameRegion = selection.find(c => {
            return ["row", "col", "box"].find(rType => {
                const region = rType + c.get(rType);
                const wasSeen = seen[region];
                seen[region] = true;
                return wasSeen;
            })
        })
        return sameRegion ? 'toggleOuterPencilMark' : 'setDigit';
    },

    selectionHasMatch: (grid, testFunc) => {
        const selection = grid.get("cells").filter((c) => c.get("isSelected"));
        return !!(selection.find(testFunc));
    },

    // Round-12 (2026-05-01) — REC-4. Compute the set of digits 1–9
    // that, if placed in the (single) selected cell, would create a
    // duplicate in its row, column, or box. The numpad consumes this
    // to render a strike-through on dies that would conflict, so the
    // player sees the consequence at the moment of decision.
    //
    // Returns null when the indicator should NOT paint:
    //   • Hardcore lock active (assists go silent)
    //   • Selection size != 1 (multi-cell selections are not a single
    //     decision; a strike-through across 9 dies for every variant
    //     selection would be visual noise)
    //   • Selected cell already holds a digit (the player would be
    //     replacing, not committing into emptiness — duplicate-tinting
    //     in the grid covers that path)
    //
    // Otherwise returns a plain object {'1': true, ..., '9': true}
    // with truthy keys for each conflicting digit. The keypad reads
    // by lookup (conflictDigits[d]) so the shape mirrors completedDigits.
    //
    // The shim's .filter / .first work; .some / .every are NOT
    // implemented (see feedback_not_mutable_shim memory). All access
    // here uses .filter + .size or .first.
    conflictDigitsForKeypad: (grid) => {
        // Round-12 (2026-05-01) — REC-4 turned into an opt-in setting.
        // When the player hasn't enabled it, return null and the
        // keypad paints no strikes. Hardcore lock continues to win
        // regardless of setting (assists silent).
        if (grid.get('lockedHardcore')) return null;
        if (!modelHelpers.getSetting(grid, SETTINGS.numpadConflictIndicator)) return null;
        const cells = grid.get('cells');
        // Round-12 fix (2026-05-01) — the not-mutable shim's .filter()
        // result does NOT implement .first() (see feedback memory).
        // Use .find() to grab the single selected cell, and a separate
        // .filter().size check to confirm the selection is exactly 1.
        // Mirrors the .find() pattern in modelHelpers.selectionHasMatch.
        const sel = cells.find((c) => c.get('isSelected'));
        if (!sel) return null;
        const selectionSize = cells.filter((c) => c.get('isSelected')).size;
        if (selectionSize !== 1) return null;
        if (sel.get('digit') !== '0') return null;
        // Walk the peer row, column, and box. cellSet arrays are
        // 1-indexed by row/col/box number. Some peer indices are
        // visited up to twice (row∩box and col∩box overlaps) — we
        // just write each peer's digit into a plain {} which dedupes
        // the conflict map naturally, so no Set is needed.
        //
        // NB: this file imports Set from './not-mutable', which is
        // the shim's factory function (not new-constructable). Don't
        // reach for `new Set()` here — use a plain object or visit
        // through the array iteration as below.
        const r = sel.get('row');
        const c = sel.get('col');
        const b = sel.get('box');
        const selIndex = sel.get('index');
        const conflicts = {};
        const collect = (i) => {
            if (i === selIndex) return;
            const peerDigit = cells.get(i).get('digit');
            if (peerDigit && peerDigit !== '0') {
                conflicts[peerDigit] = true;
            }
        };
        cellSet.row[r].forEach(collect);
        cellSet.col[c].forEach(collect);
        cellSet.box[b].forEach(collect);
        return conflicts;
    },

    updateSelectedCells: (grid, opName, ...args) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        // Round-6 (2026-04-30) — block input on a completed digit
        // (the green numpad mark) across every digit-aware mode and
        // every entry path: physical keyboard, Standard SVG numpad,
        // Editorial numpad. The block fires on:
        //   • setDigit                (digit mode)
        //   • toggleOuterPencilMark   (corner mode)
        //   • toggleInnerPencilMark   (centre mode)
        // setCellColor (colour mode) is NOT blocked because the
        // 1-9 keys are colour codes there, not digit values.
        //
        // setDigit allows a toggle-off pass: pressing the digit on
        // a cell that already holds it removes one of the 9 instances
        // and drops the digit out of completed. Multi-cell batches
        // are rejected unless EVERY selected cell already holds the
        // digit (a pure toggle-off batch).
        //
        // Pencil ops have no toggle-off allowance — pencil marks for
        // a completed digit are auto-wiped by autocleanPencilmarks
        // (default ON), and even with autoclean OFF the player can
        // still clear stray marks via CLR / Erase.
        //
        // remove-candidate-N (numpad long-press) routes through
        // removePencilMarkFromSelection, NOT through here, so it
        // remains allowed — REMOVAL of a pencil mark isn't "entering"
        // the digit.
        if (!grid.get('lockedHardcore') && (
                opName === 'setDigit'
                || opName === 'toggleOuterPencilMark'
                || opName === 'toggleInnerPencilMark'
            )) {
            const [digit] = args;
            const completedDigits = grid.get('completedDigits') || {};
            if (completedDigits[digit]) {
                if (opName === 'setDigit') {
                    const anySelectedNotHavingDigit = !!grid.get('cells').find(
                        c => c.get('isSelected') && c.get('digit') !== digit
                    );
                    if (anySelectedNotHavingDigit) {
                        return grid;
                    }
                    // else: every selected cell already holds the
                    // digit → pure toggle-off batch → allow.
                }
                else {
                    // Pencil op on a completed digit — blanket block.
                    return grid;
                }
            }
        }
        if (opName === 'toggleInnerPencilMark' || opName === 'toggleOuterPencilMark') {
            const [digit] = args;
            const isInner = opName === 'toggleInnerPencilMark';
            // setMode = true means "add" — at least one selected cell
            // currently doesn't display the digit. setMode = false
            // means "remove" — every selected cell already displays
            // it. Critically, "displays" looks at the combined view
            // (manual ∪ active auto-layers, minus userHidden), so
            // toggling correctly subtracts auto-derived digits via
            // userHidden rather than no-op'ing on the manual set.
            const setMode = modelHelpers.selectionHasMatch(grid, c => {
                if (c.get('digit') !== '0') return false;
                return isInner
                    ? !modelHelpers.isInnerVisible(c, digit)
                    : !modelHelpers.isOuterVisible(c, digit);
            });
            args = [digit, setMode];
        }
        const mode = grid.get('mode');
        const op = modelHelpers[opName + 'AsCellOp'];
        if (!op) {
            console.log(`Unknown cell update operation: '${opName}'`);
            return grid;
        }
        if (opName === 'setDigit' && args[1] && args[1].replaceUndo) {
            grid = modelHelpers.undoOneAction(grid);
        }
        // Phase-15 — every op whose name starts with `clear` is a
        // layer-specific or full wipe (clearCell, clearDigit,
        // clearOuterPencils, clearInnerPencils). They share the same
        // dispatch behaviour: skip-given guard relaxed (the per-op
        // function takes care of given-cell semantics itself), reset
        // matchDigit, and (for digit-affecting ops) refresh the live
        // error highlights.
        const isClearOp = opName.startsWith('clear');
        const isDigitClearOp = opName === 'clearCell' || opName === 'clearDigit';
        // Phase-16 — capture the rich undo state up front so view-flag
        // and userHidden changes (not just snapshot-string changes)
        // get into the undo trail. The no-change branch below is now
        // gated on the full undo state, so a clear op that only
        // mutates userHidden still records an undo entry.
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        let newCells = grid.get('cells')
            .map(c => {
                const canUpdate = (!c.get('isGiven') || opName === 'setCellColor' || isClearOp);
                if (canUpdate && c.get('isSelected')) {
                    return modelHelpers.updateCellSnapshotCache( op(c, ...args) );
                }
                else {
                    return c;
                }
            });
        if (opName === 'setDigit' && modelHelpers.getSetting(grid, SETTINGS.autocleanPencilmarks)) {
            newCells = modelHelpers.autoCleanPencilMarks(newCells, args[0]);
        }
        grid = grid.set('cells', newCells);
        const undoStateAfter = modelHelpers.captureUndoState(grid);
        if (mode === 'solve' && undoStateAfter === undoStateBefore) {
            // Truly no change (no cell flipped a layer, no userHidden
            // mutation). Still surface matchDigit for digit ops so
            // pressing a number on a filled/unselected cell highlights
            // matching digits in the grid — same effect as clicking a
            // filled cell with that digit.
            const isDigitOp = (
                opName === 'setDigit'
                || opName === 'toggleInnerPencilMark'
                || opName === 'toggleOuterPencilMark'
            );
            if (isDigitOp && args[0] !== '0') {
                return grid.set('matchDigit', args[0]);
            }
            return grid;
        }
        grid = modelHelpers.checkCompletedDigits(grid);
        if (mode === 'enter' && opName === 'setDigit') {
            grid = modelHelpers.autoAdvanceFocus(grid);
        }
        else if (
            opName === 'setDigit'
            || opName === 'toggleInnerPencilMark'
            || opName === 'toggleOuterPencilMark'
        ) {
            const newDigit = args[0];
            // Round-5 — pencil-mark ops never set matchDigit. Adding
            // a candidate is a "what could go here" notation gesture,
            // not a "focus this digit across the grid" gesture. Only
            // setDigit (a real placement) lights up matching peers /
            // restriction wash. Reverses the Batch-6 single-cell-
            // pencil-still-sets-matchDigit branch — Sam confirmed
            // single-cell pencilling should NOT trigger the
            // restriction highlight any more than multi-cell does.
            const isPencilOp = opName === 'toggleInnerPencilMark'
                || opName === 'toggleOuterPencilMark';
            if (!isPencilOp) {
                grid = grid.set('matchDigit', newDigit);
            }
        }
        else if (isClearOp) {
            grid = grid.set('matchDigit', '0');
        }
        // G-05 — refresh live conflict tint after any op that can
        // change the digit grid. setDigit, clearCell and clearDigit
        // mutate filled values; pencil-mark toggles + outer/inner
        // pencil clears can't introduce or resolve a conflict.
        if (opName === 'setDigit' || isDigitClearOp) {
            grid = modelHelpers.applyLiveErrorHighlights(grid);
        }
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    setDigitAsCellOp: (c, newDigit) => {
        if (c.get('digit') === newDigit) {
            // QA-fix #11 — pressing the same digit on a cell that
            // already holds it toggles the digit back off. Standard
            // sudoku UX: digit keys are committal-and-revertible. The
            // pencil layers stay cleared (they were already cleared
            // when the digit was first placed); errorMessage is
            // dropped so the cell reverts to a clean empty state.
            return c.merge({
                'digit': '0',
                'errorMessage': undefined,
            });
        }
        return c.merge({
            'digit': newDigit,
            'outerPencils': emptySet,
            'innerPencils': emptySet,
            'userHiddenInner': emptySet,
            'userHiddenOuter': emptySet,
            'errorMessage': undefined,
        });
    },

    clearCellAsCellOp: (c) => {
        if (c.get('isGiven')) {
            return c.set('colorCode', '1');
        }
        // Compute every digit currently visible on this cell across
        // every source layer (manual + auto + engine). We add those to
        // userHidden so the cell appears empty in the renderer even
        // when Show candidates would otherwise re-derive marks for it
        // on the next refresh. engineInner is wiped here too — it's
        // engine-supplied state that shouldn't survive a "clear cell"
        // any more than manual marks would.
        const visibleInner = c.get('innerPencils')
            .union(c.get('autoInner'))
            .union(c.get('engineInner'));
        const visibleOuter = c.get('outerPencils').union(c.get('autoOuter'));
        return c.merge({
            digit: '0',
            outerPencils: emptySet,
            innerPencils: emptySet,
            engineInner: emptySet,
            userHiddenInner: visibleInner,
            userHiddenOuter: visibleOuter,
            colorCode: '1',
            errorMessage: undefined,
        });
    },

    // Phase 3 — layer-specific clear ops (cell-level building blocks).
    // The keypad CLR / Erase / physical Backspace dispatch through
    // clearSelectionByMode (a per-cell-state-and-mode matrix that
    // composes these per-layer ops). The keypad DEL / physical Delete
    // dispatch through deleteSelection (heavyweight wipe via
    // clearEverythingAsCellOp). The pre-phase-3 surgical
    // "DEL = digit only" workflow is retired.
    //
    // Givens are skipped everywhere — DEL never erases a given digit,
    // and CLR's per-cell-op skips them too. Cells holding a typed
    // digit skip the per-layer pencil-mark clears in CLR; the wipe-
    // entire-cell path runs directly in clearByModeAsCellOp's first
    // branch (rule 1).
    clearDigitAsCellOp: (c) => {
        if (c.get('isGiven') || c.get('digit') === '0') {
            return c;
        }
        return c.merge({
            digit: '0',
            errorMessage: undefined,
        });
    },

    // Mirrors the G-01 toggle-off routing: the manual layer is wiped
    // and every digit that was visible (manual ∪ auto) gets pinned to
    // userHiddenOuter so the renderer keeps the cell clean even when
    // refreshAutoMarkLayers re-derives autoOuter on the next state
    // change. Brand-new candidates that emerge later still surface.
    clearOuterPencilsAsCellOp: (c) => {
        if (c.get('isGiven') || c.get('digit') !== '0') {
            return c;
        }
        const visibleOuter = c.get('outerPencils').union(c.get('autoOuter'));
        if (visibleOuter.size === 0) {
            return c;
        }
        return c.merge({
            outerPencils: emptySet,
            userHiddenOuter: c.get('userHiddenOuter').union(visibleOuter),
        });
    },

    clearInnerPencilsAsCellOp: (c) => {
        if (c.get('isGiven') || c.get('digit') !== '0') {
            return c;
        }
        // Round-10: include engineInner in the visibility union so
        // engine-supplied candidates also get routed to userHiddenInner
        // and the layer is wiped cleanly. Without this, an Erase in
        // inner mode would leave engineInner content untouched and
        // re-render after the userHidden filter doesn't catch them.
        const visibleInner = c.get('innerPencils')
            .union(c.get('autoInner'))
            .union(c.get('engineInner'));
        if (visibleInner.size === 0) {
            return c;
        }
        return c.merge({
            innerPencils: emptySet,
            engineInner: emptySet,
            userHiddenInner: c.get('userHiddenInner').union(visibleInner),
        });
    },

    // CLR-rework — wipe BOTH pencil layers on a single cell. Used by
    // digit-mode CLR (where the player isn't pencilling at all and
    // wants the cell completely free of any prior notation). Same
    // userHidden routing as the per-layer ops so auto-overlays don't
    // immediately re-derive the cleared digits.
    clearAllPencilsAsCellOp: (c) => {
        if (c.get('isGiven') || c.get('digit') !== '0') {
            return c;
        }
        const visibleInner = c.get('innerPencils')
            .union(c.get('autoInner'))
            .union(c.get('engineInner'));
        const visibleOuter = c.get('outerPencils').union(c.get('autoOuter'));
        if (visibleInner.size === 0 && visibleOuter.size === 0) {
            return c;
        }
        return c.merge({
            innerPencils: emptySet,
            outerPencils: emptySet,
            engineInner: emptySet,
            userHiddenInner: c.get('userHiddenInner').union(visibleInner),
            userHiddenOuter: c.get('userHiddenOuter').union(visibleOuter),
        });
    },

    // Phase 3 — wipe-the-entire-cell op. Used by both rule 1 of
    // clearByModeAsCellOp (any-mode CLR on a digit-bearing cell) and
    // by deleteSelection (heavyweight DEL). Clears digit + both
    // pencil layers + colour in one merge. Givens are skipped.
    // Hidden-mark routing matches the per-layer ops so auto-overlays
    // don't immediately re-derive the cleared digits.
    //
    // Pre-phase-3 this op skipped the colour layer (the round-4 spec
    // didn't include colour); phase 3's "wipe the entire cell"
    // semantic includes it.
    clearEverythingAsCellOp: (c) => {
        if (c.get('isGiven')) {
            return c;
        }
        const visibleInner = c.get('innerPencils')
            .union(c.get('autoInner'))
            .union(c.get('engineInner'));
        const visibleOuter = c.get('outerPencils').union(c.get('autoOuter'));
        const hasDigit = c.get('digit') !== '0';
        const hasColour = c.get('colorCode') !== '1';
        if (!hasDigit && !hasColour && visibleInner.size === 0 && visibleOuter.size === 0) {
            return c;
        }
        return c.merge({
            digit: '0',
            errorMessage: undefined,
            innerPencils: emptySet,
            outerPencils: emptySet,
            engineInner: emptySet,
            userHiddenInner: c.get('userHiddenInner').union(visibleInner),
            userHiddenOuter: c.get('userHiddenOuter').union(visibleOuter),
            colorCode: '1',
        });
    },

    // Phase 3 — Per-cell CLR matrix. Implements the with-selection
    // ruleset agreed in the consistency-rollout phase 3 spec:
    //
    //   Cell has a digit (any mode) → wipe entire cell
    //   No digit:
    //     digit  mode → clear corner + centre + colour (heavyweight)
    //     corner mode → if Cn present: clear Cn + Co
    //                   else if Ct present: no-op (don't touch other layer)
    //                   else if Co only: clear Co
    //                   else: no-op
    //     centre mode → mirror of corner
    //     colour mode → clear Co if present, else no-op
    //
    // Layer presence checks include auto-derived overlays (autoOuter,
    // autoInner) so the matrix decisions match what the player sees.
    // userHidden routing mirrors the per-layer ops so auto-overlays
    // don't immediately re-derive the cleared digits.
    //
    // Used by updateSelectedCells via clearSelectionByMode. The mode
    // arg is the second positional arg passed to updateSelectedCells.
    clearByModeAsCellOp: (c, mode) => {
        if (c.get('isGiven')) return c;

        const hasDigit = c.get('digit') !== '0';
        if (hasDigit) {
            return modelHelpers.clearEverythingAsCellOp(c);
        }

        const visibleOuter = c.get('outerPencils').union(c.get('autoOuter'));
        // Round-10: visibleInner now also includes engineInner so the
        // matrix's "is there anything to clear?" check matches what the
        // player actually sees.
        const visibleInner = c.get('innerPencils')
            .union(c.get('autoInner'))
            .union(c.get('engineInner'));
        const hasCorner = visibleOuter.size > 0;
        const hasCentre = visibleInner.size > 0;
        const hasColour = c.get('colorCode') !== '1';

        if (mode === 'digit') {
            // Heavyweight: clear corner + centre + colour.
            const patch = {};
            if (hasCorner) {
                patch.outerPencils = emptySet;
                patch.userHiddenOuter = c.get('userHiddenOuter').union(visibleOuter);
            }
            if (hasCentre) {
                patch.innerPencils = emptySet;
                patch.engineInner = emptySet;
                patch.userHiddenInner = c.get('userHiddenInner').union(visibleInner);
            }
            if (hasColour) {
                patch.colorCode = '1';
            }
            return Object.keys(patch).length ? c.merge(patch) : c;
        }

        if (mode === 'outer') {
            if (hasCorner) {
                return c.merge({
                    outerPencils: emptySet,
                    userHiddenOuter: c.get('userHiddenOuter').union(visibleOuter),
                    colorCode: '1',
                });
            }
            if (hasCentre) return c;        // don't touch the other layer's content
            if (hasColour) return c.set('colorCode', '1');
            return c;
        }

        if (mode === 'inner') {
            if (hasCentre) {
                return c.merge({
                    innerPencils: emptySet,
                    engineInner: emptySet,
                    userHiddenInner: c.get('userHiddenInner').union(visibleInner),
                    colorCode: '1',
                });
            }
            if (hasCorner) return c;
            if (hasColour) return c.set('colorCode', '1');
            return c;
        }

        if (mode === 'color') {
            return hasColour ? c.set('colorCode', '1') : c;
        }

        return c;
    },

    // Display-set predicates — true if the digit is currently
    // visible to the user. The combined view is
    //   manual ∪ auto, minus userHidden.
    // setMode (in updateSelectedCells) and the toggle cell ops below
    // both rely on these so clicks behave consistently regardless of
    // which layer produced the digit.
    isInnerVisible: (c, digit) => {
        if (c.get('userHiddenInner').includes(digit)) return false;
        return c.get('innerPencils').includes(digit) ||
               c.get('autoInner').includes(digit) ||
               c.get('engineInner').includes(digit);
    },

    isOuterVisible: (c, digit) => {
        if (c.get('userHiddenOuter').includes(digit)) return false;
        return c.get('outerPencils').includes(digit) ||
               c.get('autoOuter').includes(digit);
    },

    // Three-way toggle:
    //   - setMode = true (make digit visible): if it was hidden via
    //     userHidden, un-hide it. Otherwise add it to manual.
    //   - setMode = false (make digit invisible): add it to userHidden.
    //     Manual is left alone — userHidden filters the display.
    // This way a click reliably flips visibility regardless of which
    // layer the digit came from.
    toggleInnerPencilMarkAsCellOp: (c, digit, setMode) => {
        if (c.get('digit') !== '0' || digit === '0') {
            return c;
        }
        let manual = c.get('innerPencils');
        let hidden = c.get('userHiddenInner');
        // Round-10: "auto" for visibility purposes is the union of
        // every non-manual source — autoInner (overlay-derived,
        // currently always empty) plus engineInner (from
        // applyCalculateCandidates). If un-hiding alone would render
        // the digit because it's already in one of those layers, we
        // skip the manual write.
        const auto = c.get('autoInner').union(c.get('engineInner'));
        if (setMode) {
            if (hidden.includes(digit)) {
                hidden = hidden.delete(digit);
                // Batch-6 fix (mirrors toggleOuterPencilMarkAsCellOp):
                // when un-hiding wouldn't render anything (auto layer
                // is empty), also write to manual so the user's add
                // intent isn't a silent no-op.
                if (!auto.includes(digit)) {
                    manual = manual.add(digit);
                }
            } else {
                manual = manual.add(digit);
            }
        } else {
            hidden = hidden.add(digit);
        }
        return c.merge({
            innerPencils: manual,
            userHiddenInner: hidden,
        });
    },

    toggleOuterPencilMarkAsCellOp: (c, digit, setMode) => {
        if (c.get('digit') !== '0' || digit === '0') {
            return c;
        }
        let manual = c.get('outerPencils');
        let hidden = c.get('userHiddenOuter');
        const auto = c.get('autoOuter');
        if (setMode) {
            if (hidden.includes(digit)) {
                hidden = hidden.delete(digit);
                // Batch-6 fix: un-hiding alone doesn't render the digit
                // unless an auto layer would supply it. After CLR with
                // no selection (digit mode), userHidden carries the
                // previously visible digits AND showCandidates flips
                // off — so autoOuter is empty. Without this guard the
                // first numpad press un-hides nothing-visible and the
                // candidate appears to silently fail. Now we also add
                // to manual when the auto layer wouldn't cover it.
                if (!auto.includes(digit)) {
                    manual = manual.add(digit);
                }
            } else {
                manual = manual.add(digit);
            }
        } else {
            hidden = hidden.add(digit);
        }
        return c.merge({
            outerPencils: manual,
            userHiddenOuter: hidden,
        });
    },

    pencilMarksToInnerAsCellOp: (c) => {
        if (c.get('digit') !== '0') {
            return c;
        }
        let newInner = c.get('innerPencils').union(c.get('outerPencils'));
        return c.merge({
            'innerPencils': newInner,
            'outerPencils': emptySet,
        });
    },

    setCellColorAsCellOp: (c, newColorCode) => {
        return c.set('colorCode', newColorCode);
    },

    autoCleanPencilMarks: (cells, newDigit) => {
        let isEliminated = {};
        cells.forEach(c => {
            if (c.get('isSelected') && !c.get('isGiven')) {
                [
                    cellSet.row[c.get('row')],
                    cellSet.col[c.get('col')],
                    cellSet.box[c.get('box')],
                ].flat().forEach(i => isEliminated[i] = true);
            }
        });
        return cells.map(c => {
            const i = c.get('index');
            if (c.get('digit') === '0' && isEliminated[i]) {
                const inner = c.get('innerPencils');
                const outer = c.get('outerPencils');
                // Round-10: engineInner also gets the auto-clean applied
                // — engine-supplied candidates that the new placement
                // eliminates from peer cells should drop too, same as
                // manual marks.
                const engine = c.get('engineInner');
                if (
                    inner.includes(newDigit) ||
                    outer.includes(newDigit) ||
                    engine.includes(newDigit)
                ) {
                    return modelHelpers.updateCellSnapshotCache(
                        c.merge({
                            innerPencils: inner.delete(newDigit),
                            outerPencils: outer.delete(newDigit),
                            engineInner: engine.delete(newDigit),
                        })
                    );
                }
            }
            return c;
        });
    },

    checkCompletedDigits: (grid) => {
        const digits = grid.get('cells').map(c => c.get('digit')).join('');
        const result = modelHelpers.checkDigits(digits);
        grid = grid.set('completedDigits', result.completedDigits);
        if (result.isSolved && !grid.get('endTime')) {
            return modelHelpers.setGridSolved(grid);
        }
        grid = modelHelpers.applyErrorHighlights(grid, result.errorAtIndex);
        return grid.set('hasErrors', !!result.hasErrors);
    },

    pauseTimer: (grid) => {
        grid = grid.merge({
            pausedAt: Date.now(),
            modalState: {
                modalType: MODAL_TYPE_PAUSED,
                escapeAction: 'resume-timer',
            },
        });
        modelHelpers.notifyPuzzleStateChange(grid);
        return grid;
    },

    resumeTimer: (grid) => {
        const elapsed = grid.get('pausedAt') - grid.get('intervalStartTime');
        grid = grid.merge({
            pausedAt: undefined,
            intervalStartTime: Date.now() - elapsed,
        });
        modelHelpers.notifyPuzzleStateChange(grid);
        return grid;
    },

    // Phase-16 — bring the pencilmarks-visibility toggle into the undo
    // trail. captureUndoState now includes the showPencilmarks flag,
    // so pushNewSnapshot will record the flip and undo can roll it
    // back like any other action.
    toggleShowPencilmarks: (grid) => {
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        grid = grid.update('showPencilmarks', flag => !flag);
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    clearPencilmarks: (grid) => {
        return modelHelpers.trackSnapshotsForUndo(grid, grid => {
            const cells = grid.get('cells');
            const clearSnapshot = cells.filter(c => !c.get('isGiven') && c.get('digit') !== '0')
                .map(c => {
                    return [c.get('row'), c.get('col'), 'D', c.get('digit')].join('');
                })
                .join(',');
            return modelHelpers.restoreSnapshot(grid, clearSnapshot);
        });
    },

    // ----------------------------------------------------------------
    // G-03 — auto-mark mode collapsed to a single "Show candidates"
    // overlay. When on, every empty cell shows its full legal
    // candidate set as inner pencil marks. Cells with 1 or 2 visible
    // pencil marks render bold via the size-based predicate in
    // sudoku-cell-pencil-marks.js (always-on, regardless of mode).
    //
    // SETTINGS.snyderModeAdvanced (opt-in, off by default) gates the
    // Snyder feature: when on, the keypad's Snyder Marks button is
    // active and toggling it fills autoOuter with pair-locked corner
    // marks per box (Round-10: hidden-single centre marks no longer
    // surface — the player scans for them by absence; naked pairs
    // stay as matching pair corners for the player to recognise).
    //
    // The user's manual innerPencils and outerPencils are NEVER
    // overwritten by the auto layer; the cell renderer unions both at
    // display time.
    //
    // Auto-mark cell fields are transient (not in the snapshot
    // string), so undo/redo never restores them directly. Instead,
    // refreshAutoMarkLayers re-derives them from the showCandidates
    // flag after every grid mutation (hooked into pushNewSnapshot and
    // restoreSnapshot).
    // ----------------------------------------------------------------

    // Phase-16 — toggling the overlay ON resets the matching userHidden
    // layer so any candidates the user previously cleared (via CLR in
    // the matching pencil mode) light back up. Without this, the
    // userHidden filter is sticky and the cells the user wiped stay
    // dark even though the auto layer has been re-populated. Toggling
    // OFF leaves userHidden alone — manual marks the user typed are
    // still gated by their own toggle on/off cycles, so we don't want
    // to re-reveal those just because the auto overlay is being
    // dismissed.
    toggleShowCandidates: (grid) => {
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        const turningOn = !grid.get('showCandidates');
        grid = grid.set('showCandidates', turningOn);
        if (turningOn) {
            // Show-candidates writes to autoOuter; reset only the
            // matching userHidden layer.
            grid = modelHelpers.resetUserHidden(grid, {outer: true});
        }
        grid = modelHelpers.refreshAutoMarkLayers(grid);
        grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    // QA-4: independent toggle for the Snyder cascade overlay. Only
    // visible on the keypad when SETTINGS.snyderModeAdvanced is on.
    // Round-10: Snyder writes only to autoOuter (pair corners) — the
    // hidden-single inner output was retired. Turning the flag ON
    // still resets both userHidden layers as a courtesy: a player
    // who recently cleared centre marks via CLR in centre mode would
    // see nothing change otherwise on first activation, but the
    // outer reset is what actually matters for the pair-corner fill.
    toggleShowSnyderMarks: (grid) => {
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        const turningOn = !grid.get('showSnyderMarks');
        grid = grid.set('showSnyderMarks', turningOn);
        if (turningOn) {
            grid = modelHelpers.resetUserHidden(grid, {inner: true, outer: true});
        }
        grid = modelHelpers.refreshAutoMarkLayers(grid);
        grid = modelHelpers.applySelectionOp(grid, 'clearSelection');
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    // Wipe userHidden{Inner,Outer} on every cell. Used by the auto-
    // overlay toggles to give the user a fresh-start view when they
    // re-enable Show-candidates / Snyder.
    resetUserHidden: (grid, {inner = false, outer = false}) => {
        if (!inner && !outer) return grid;
        const newCells = grid.get('cells').map(c => {
            const patch = {};
            if (inner && c.get('userHiddenInner').size > 0) {
                patch.userHiddenInner = emptySet;
            }
            if (outer && c.get('userHiddenOuter').size > 0) {
                patch.userHiddenOuter = emptySet;
            }
            if (Object.keys(patch).length === 0) return c;
            return modelHelpers.updateCellSnapshotCache(c.merge(patch));
        });
        return grid.set('cells', newCells);
    },

    // Phase 3 — unified CLR/Erase/DEL semantics (consistency rollout).
    //
    // Replaces the pre-phase-3 split between clearSelectionDigits
    // (DEL = surgical digit-only), clearSelectionEverything (Editorial
    // Erase = mode-sensitive selection, all-pencils wipe on no-selection)
    // and clearSelectionCandidatesByMode (Standard CLR = mode-aware
    // candidate-clearer with overlay-flag flips on no-selection).
    //
    // The phase-3 spec collapses those three into two named operations:
    //
    //   clearSelectionByMode  (CLR / Erase / Backspace) — see below
    //   deleteSelection       (keypad DEL / physical Delete) — heavy
    //                          wipe of every selected non-given cell
    //
    // CLR (clearSelectionByMode) — mode-aware, scope-aware:
    //
    //   With selection:
    //     Cell has a digit (any mode) → wipe entire cell
    //     No digit:
    //       digit  mode → clear corner + centre + colour
    //       corner mode → if Cn present: clear Cn + Co
    //                     else if Ct present: no-op
    //                     else if Co only: clear Co
    //                     else: no-op
    //       centre mode → mirror of corner
    //       colour mode → clear Co if present, else no-op
    //   No selection:
    //     digit  mode → wipe USER corner + centre pencils on every empty
    //                   non-given cell + flip showCandidates off + flip
    //                   showSnyderMarks off. Colours STAY (digit mode is
    //                   not a colour-aware mode). Single undo step.
    //     corner mode → wipe USER corner pencils on every empty non-
    //                   given cell + flip showCandidates off + wipe
    //                   ALL cell colours
    //     centre mode → wipe USER centre pencils + wipe ALL cell colours.
    //                   showSnyderMarks survives — Snyder writes only to
    //                   the corner layer post-Round-10, so flipping it
    //                   on a centre-mode CLR would be mode confusion.
    //     colour mode → wipe ALL cell colours; digits + pencils stay
    //
    // DEL (deleteSelection): heavyweight wipe of every selected
    // non-given cell — clears digit + both pencil layers + colour in
    // one undo step regardless of active mode. Empty selection → no-op.
    //
    // Auto-mark overlays (Show-candidates, Snyder) keep their dedicated
    // keypad toggles. The userHidden routing on the per-layer cell ops
    // ensures auto-derived candidates don't immediately re-render after
    // a clear. Toggling Show-candidates / Snyder OFF then ON resets
    // userHidden so the cleared cells light back up.
    activeInputMode: (grid) => {
        return grid.get('tempInputMode') || grid.get('inputMode');
    },

    // Round-5: deleteSelection retired. The keypad DEL button + the
    // physical Delete key both now route through clearSelectionByMode
    // (mode-aware Erase, same as Backspace). The phase-3 heavyweight
    // wipe semantic is gone with the keypad DEL surface.

    // CLR-rework — apply a clear-cell-op to every empty non-given
    // cell on the grid as a single undo step. Used when the player
    // hits CLR with no selection. Mirrors the bookkeeping
    // updateSelectedCells does (capture undo, push snapshot, zero
    // matchDigit on a clear op) but operates over the whole board
    // instead of the selected subset.
    //
    // Optional extraMerge bundles arbitrary grid-level changes into
    // the same undo entry, e.g. flipping showCandidates /
    // showSnyderMarks off so the keypad buttons reflect a cleared
    // grid (see clearGridForCandidateMode below).
    clearAllEmptyCellsByOp: (grid, opName, extraMerge) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        const op = modelHelpers[opName + 'AsCellOp'];
        if (!op) {
            console.log(`Unknown cell update operation: '${opName}'`);
            return grid;
        }
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        const newCells = grid.get('cells').map(c => {
            if (c.get('isGiven') || c.get('digit') !== '0') return c;
            return modelHelpers.updateCellSnapshotCache(op(c));
        });
        grid = grid.set('cells', newCells).set('matchDigit', '0');
        if (extraMerge) {
            grid = grid.merge(extraMerge);
        }
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    // Phase 3 — unified CLR / Erase entry point. See the long comment
    // above activeInputMode for the full ruleset.
    //
    // With selection: per-cell-state-and-mode matrix via clearByMode.
    // No selection: mode-driven grid-wide ops:
    //   digit  → clearGridForDigitMode (both pencil layers + both flags;
    //            colours STAY)
    //   color  → clearAllColoursGridWide
    //   outer  → clearGridForCandidateMode('outer')
    //   inner  → clearGridForCandidateMode('inner')
    clearSelectionByMode: (grid) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        const mode = modelHelpers.activeInputMode(grid);
        const hasSelection = !!grid.get('cells').find(c => c.get('isSelected'));

        if (hasSelection) {
            // Per-cell-state matrix. `mode` is the second arg —
            // updateSelectedCells forwards it to clearByModeAsCellOp.
            return modelHelpers.updateSelectedCells(grid, 'clearByMode', mode);
        }

        if (mode === 'digit') {
            return modelHelpers.clearGridForDigitMode(grid);
        }
        if (mode === 'color') {
            return modelHelpers.clearAllColoursGridWide(grid);
        }
        if (mode === 'outer' || mode === 'inner') {
            return modelHelpers.clearGridForCandidateMode(grid, mode);
        }
        return grid;
    },

    // Round-6 (2026-04-30) — no-selection digit-mode helper.
    // Wipes USER corner AND centre pencils on every empty non-given
    // cell, flips both overlay flags (showCandidates + showSnyderMarks)
    // off, and bundles all changes into a single undo entry. Colours
    // are intentionally NOT touched — digit mode isn't colour-aware,
    // and a player placing digits has placed colours deliberately.
    //
    // userHidden routing matches the per-layer ops so auto-derived
    // candidates the player just saw stay invisible until the player
    // explicitly re-toggles the matching overlay flag (see the
    // userHidden reset in toggleShowCandidates / toggleShowSnyderMarks).
    //
    // No-change short-circuit: if there are no user pencils anywhere
    // and both flags are already off, return the grid unchanged so we
    // don't pollute the undo stack with empty entries.
    clearGridForDigitMode: (grid) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        let anyChange = false;
        const newCells = grid.get('cells').map(c => {
            if (c.get('isGiven') || c.get('digit') !== '0') return c;
            const next = modelHelpers.clearAllPencilsAsCellOp(c);
            if (next !== c) {
                anyChange = true;
                return modelHelpers.updateCellSnapshotCache(next);
            }
            return c;
        });
        const flagFlip = {};
        if (grid.get('showCandidates')) flagFlip.showCandidates = false;
        if (grid.get('showSnyderMarks')) flagFlip.showSnyderMarks = false;
        if (!anyChange && Object.keys(flagFlip).length === 0) {
            return grid;
        }
        grid = grid.set('cells', newCells)
                   .set('matchDigit', '0')
                   .merge(flagFlip);
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    // Phase 3 — no-selection corner / centre mode helper.
    // Wipes USER pencils on the matching layer for every empty
    // non-given cell and wipes EVERY cell's colour. Auto-derived
    // candidates the player just saw are routed into userHidden so
    // they stay invisible until the player explicitly re-toggles the
    // overlay flag.
    //
    // Overlay-flag handling differs by mode:
    //   corner → also flips showCandidates off (the corner overlay
    //            IS a bulk fill — silencing it on a corner-mode CLR
    //            matches the player's "wipe my corner work" intent)
    //   centre → leaves showSnyderMarks ALONE (Snyder writes only to
    //            the corner layer post-Round-10, so it has nothing
    //            to do with centre marks; flipping it would be
    //            mode confusion)
    clearGridForCandidateMode: (grid, mode) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        const opName = mode === 'outer' ? 'clearOuterPencils' : 'clearInnerPencils';
        const op = modelHelpers[opName + 'AsCellOp'];
        const settingFlip = mode === 'outer'
            ? { showCandidates: false }
            : {};

        const undoStateBefore = modelHelpers.captureUndoState(grid);
        const newCells = grid.get('cells').map(c => {
            let cell = c;
            // Wipe USER pencils on empty non-given cells.
            if (!c.get('isGiven') && c.get('digit') === '0') {
                cell = op(cell);
            }
            // Wipe colour on every cell that has one (givens included
            // — colour is decoration, not bound to digit/given status).
            if (cell.get('colorCode') !== '1') {
                cell = cell.set('colorCode', '1');
            }
            return modelHelpers.updateCellSnapshotCache(cell);
        });
        grid = grid.set('cells', newCells)
                   .set('matchDigit', '0')
                   .merge(settingFlip);
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    // Phase 3 — no-selection colour-mode helper.
    // Wipes every cell's colour (colorCode = '1' is the no-colour
    // sentinel). Digits, pencils, and overlay flags are untouched.
    clearAllColoursGridWide: (grid) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        const undoStateBefore = modelHelpers.captureUndoState(grid);
        let anyChange = false;
        const newCells = grid.get('cells').map(c => {
            if (c.get('colorCode') === '1') return c;
            anyChange = true;
            return modelHelpers.updateCellSnapshotCache(c.set('colorCode', '1'));
        });
        if (!anyChange) {
            return grid;
        }
        grid = grid.set('cells', newCells).set('matchDigit', '0');
        return modelHelpers.pushNewSnapshot(grid, undoStateBefore);
    },

    // Snyder notation — single-pass per-box scan of the CURRENT grid
    // state. For each box, for each digit not yet placed in that box,
    // count cells where the digit could legally go. Exactly 2 → mark
    // both as pair-corner candidates. 0/1/3+ → emit nothing.
    //
    // Round-10 (2026-05-01): the prior cascade-style algorithm was
    // retired. The cascade ran iteratively, treating each hidden
    // single it found as a virtual placement and re-scanning with
    // that placement applied; the output was the stable-pass pair
    // corners after the cascade had resolved every possible hidden
    // single. That worked when hidden singles were also surfaced as
    // bold centre marks (the cascade's mid-passes were visible). Once
    // the centre output was retired, the cascade silently swallowed
    // most early-game pair-locks into virtual placements before
    // committing the stable pair corners — so the player saw very
    // little after a digit fill, even though the pair-lock structure
    // was rich. This single-pass scan returns pair corners on the
    // current state, not on the cascade's resolved state. Hidden
    // singles in the current state are not surfaced; the player
    // finds them by absence (a digit with no pair corner in a box
    // where it isn't placed yet is locked to one cell — the player's
    // scanning discipline).
    //
    // Algorithm:
    //   1. Compute candidates for every empty cell from the real grid
    //      digits (no virtual placements). A cell's candidates = the
    //      digits 1-9 minus any digit already placed in its row,
    //      column, or box.
    //   2. For each box (boxes 1-9, deterministic order):
    //        For each digit 1-9 not already placed in that box:
    //          Count "homes" = cells in the box that are empty and
    //          carry the digit in their candidate set.
    //          - 0 homes → contradiction. Log; emit nothing for this
    //            digit. Display continues for other digits.
    //          - 1 home → hidden single. Emit nothing (player finds
    //            by absence; it isn't a pair-lock).
    //          - 2 homes → pair-lock. Mark corner pencil for digit on
    //            both cells.
    //          - 3+ homes → not pair-locked. No mark.
    //
    // Pure function: takes the grid, returns an array of 81 entries
    // each shaped {inner: [], outer: Array<digit>}. The inner slot is
    // always empty — kept in the shape for back-compatibility with
    // refreshAutoMarkLayers and to leave the door open for future
    // re-introduction of an inner-layer signal. Never mutates the grid.
    computeSnyderMarks: (grid) => {
        const cellsList = grid.get('cells');
        const allDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

        // Read the real grid digits into a flat array. No virtual
        // placements — single-pass on the current state.
        const realDigits = new Array(81);
        for (let i = 0; i < 81; i++) {
            realDigits[i] = cellsList.get(i).get('digit');
        }

        // Per-cell candidate sets for the current state (peer-aware).
        const cands = new Array(81);
        for (let i = 0; i < 81; i++) {
            if (realDigits[i] !== '0') { cands[i] = null; continue; }
            const r = Math.floor(i / 9), c = i % 9;
            const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
            const used = {};
            for (let j = 0; j < 9; j++) {
                used[realDigits[r * 9 + j]] = true;
                used[realDigits[j * 9 + c]] = true;
            }
            for (let dr = 0; dr < 3; dr++) {
                for (let dc = 0; dc < 3; dc++) {
                    used[realDigits[(br + dr) * 9 + (bc + dc)]] = true;
                }
            }
            cands[i] = allDigits.filter(d => !used[d]);
        }

        // Boxes in deterministic order (1-9, row-major).
        const cornerMarks = new Array(81).fill(null).map(() => ({}));
        for (let b = 0; b < 9; b++) {
            const br = Math.floor(b / 3) * 3;
            const bc = (b % 3) * 3;
            const boxCells = [];
            for (let dr = 0; dr < 3; dr++) {
                for (let dc = 0; dc < 3; dc++) {
                    boxCells.push((br + dr) * 9 + (bc + dc));
                }
            }

            const placedInBox = {};
            for (const i of boxCells) {
                const d = realDigits[i];
                if (d !== '0') placedInBox[d] = true;
            }

            for (const d of allDigits) {
                if (placedInBox[d]) continue;
                const homes = boxCells.filter(i =>
                    realDigits[i] === '0' &&
                    cands[i] !== null &&
                    cands[i].indexOf(d) !== -1
                );
                if (homes.length === 0) {
                    // Contradiction in the current state — digit can't
                    // land anywhere in this box. Log once; emit nothing
                    // for this digit. Display continues for other digits.
                    console.error(
                        'Snyder scan: digit ' + d +
                        ' has no legal home in box ' + (b + 1) +
                        ' under the current grid state.'
                    );
                } else if (homes.length === 2) {
                    for (const cell of homes) {
                        cornerMarks[cell][d] = true;
                    }
                }
                // homes.length === 1 (hidden single) and 3+ → no marks.
            }
        }

        const result = new Array(81);
        for (let i = 0; i < 81; i++) {
            result[i] = {
                inner: [],
                outer: Object.keys(cornerMarks[i]).sort(),
            };
        }
        return result;
    },

    // G-03 — every empty cell's full candidate list, no count limit.
    // Pure function. Used by refreshAutoMarkLayers (when Show
    // candidates is on and SETTINGS.snyderModeAdvanced is off) to
    // populate autoInner for every cell with at least one candidate.
    // Bolding for cells with 1 or 2 visible inner pencil marks is
    // applied size-based by sudoku-cell-pencil-marks.js — no separate
    // computeMax3Marks helper is needed.
    computeAllMarks: (grid, candidates) => {
        const result = new Array(81).fill(null);
        for (let i = 0; i < 81; i++) {
            const c = candidates[i];
            if (c !== null && c.length >= 1) {
                result[i] = { inner: c.slice().sort() };
            }
        }
        return result;
    },

    // G-03 / QA-3 / QA-4 — re-derive the auto-mark layers from the
    // grid's flags and current state. Idempotent. Hooked into
    // pushNewSnapshot (every user mutation) and restoreSnapshot
    // (undo/redo) so layers always reflect the latest puzzle state.
    //
    // QA-4 routing — two independent layer sources, each driven by
    // its own flag. Round-10 (2026-05-01): the engine no longer
    // writes to the inner pencil layer at all. Snyder used to surface
    // hidden singles as bold centre marks + elevate naked pairs from
    // corners to centres; both were retired so the inner layer is
    // purely the player's annotation surface.
    //   showCandidates → autoOuter gets the full legal-candidate set
    //                    (corner marks). The corner renderer's 9
    //                    perimeter slots fit 9 candidates cleanly.
    //   showSnyderMarks → autoOuter gets Snyder pair corners — UNLESS
    //                    showCandidates is also on, in which case
    //                    the full candidate corners win (they're a
    //                    superset of the Snyder pairs).
    //   autoInner       → never populated. Stays in the cell schema
    //                    for back-compat and easy re-introduction.
    //
    // Round-10 also dropped the per-cell suppression that emptied
    // autoOuter on any cell carrying manual innerPencils. Adding a
    // single centre mark no longer wipes the auto-fill corner
    // candidates; auto corners and manual centres coexist.
    refreshAutoMarkLayers: (grid) => {
        const showCandidates = grid.get('showCandidates');
        const showSnyderMarks = grid.get('showSnyderMarks');

        let snyderOuterByIndex = null;
        let allCandsByIndex = null;
        if (showSnyderMarks) {
            const snyderMarks = modelHelpers.computeSnyderMarks(grid);
            snyderOuterByIndex = snyderMarks.map(m => m.outer);
        }
        if (showCandidates) {
            const hinter = modelHelpers.hinter(grid);
            const candidates = hinter.calculateCellCandidates();
            const allMarks = modelHelpers.computeAllMarks(grid, candidates);
            allCandsByIndex = allMarks.map(m => (m ? m.inner : []));
        }

        const newCells = grid.get('cells').map((c, i) => {
            // Outer layer — full candidates (preferred) or Snyder pairs.
            let outerArr = [];
            if (allCandsByIndex && allCandsByIndex[i]) {
                outerArr = allCandsByIndex[i];
            } else if (snyderOuterByIndex && snyderOuterByIndex[i]) {
                outerArr = snyderOuterByIndex[i];
            }

            const outerTarget = outerArr && outerArr.length > 0
                ? Set(outerArr)
                : emptySet;
            // Always merge. The not-mutable shim's Set doesn't expose
            // .equals(), so we can't cheaply skip unchanged cells; the
            // refresh is small enough (81 cells) that this is fine.
            // Round-10: autoInner held flat to emptySet so any prior
            // engine-placed hidden singles don't linger after the flag
            // round-trip.
            return c.merge({
                autoInner: emptySet,
                autoOuter: outerTarget,
            });
        });
        return grid.set('cells', newCells);
    },

    setGridSolved: (grid) => {
        grid = modelHelpers.applySelectionOp(grid, 'clearSelection')
            .set('solved', true)
            .set('endTime', Date.now());
        // B4 — record this solve in the stats history. Wrapped in
        // try/catch so a corrupt store can't crash the win flow.
        try {
            const elapsedMs = (grid.get('endTime') - grid.get('intervalStartTime')) || 0;
            modelHelpers.appendStatsHistory({
                date: new Date().toISOString(),
                level: grid.get('difficultyLevel') || '',
                elapsed: Math.max(0, Math.round(elapsedMs / 1000)),
                hintsUsed: grid.get('hintsUsed').size,
            });
        } catch { /* never let stats writes interrupt the solve */ }
        modelHelpers.notifyPuzzleStateChange(grid);
        return grid;
    },

    showStatsModal: (grid) => grid.set('modalState', {
        modalType: MODAL_TYPE_STATS,
        escapeAction: 'close',
    }),

    // Reset-stats batch — open the destructive-confirm modal from
    // the Stats footer button. The counts are read once here and
    // passed through modalState so the confirm body can show "X
    // recorded solves, Y saved puzzles" without re-scanning storage
    // at render time. escapeAction returns to the Stats modal so a
    // Cancel / Esc / backdrop click puts the user back where they
    // were with the previous data still intact.
    showConfirmResetStats: (grid) => {
        const history = modelHelpers.loadStatsHistory();
        const saved = modelHelpers.getSavedPuzzles(grid) || [];
        return grid.set('modalState', {
            modalType: MODAL_TYPE_CONFIRM_RESET_STATS,
            solveCount: history.length,
            savedCount: saved.length,
            escapeAction: 'show-stats-modal',
        });
    },

    // Reset-stats batch — irreversible nuke called from the confirm
    // modal's Reset button. Wipes the stats-history localStorage key
    // AND every save-* localStorage key. Settings, the SETTINGS.theme
    // key, sudoku-last-difficulty, and the coach-marks-seen flag are
    // all in OTHER localStorage keys and are intentionally preserved.
    // After wiping, reopen the Stats modal so the user lands on the
    // empty-state view ("No solves recorded yet").
    resetAllStatsAndSavedPuzzles: (grid) => {
        modelHelpers.clearStatsHistory();
        modelHelpers.deleteSavedPuzzles();
        return modelHelpers.showStatsModal(grid);
    },

    applySelectionOp: (grid, opName, ...args) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        const op = modelHelpers[opName];
        if (!op) {
            console.log(`Unknown cell operation: '${opName}'`);
            return grid;
        }
        const newCells = grid.get('cells').map(c => op(c, ...args));
        if (opName === 'setSelection' || opName === 'extendSelection') {
            const currIndex = args[0];
            grid = grid.set('focusIndex', currIndex);
            if (opName === 'setSelection') {
                const currDigit = newCells.get(currIndex).get('digit');
                grid = grid.set('matchDigit', currDigit);
            }
        }
        else if (opName === 'clearSelection') {
            grid = grid.set('matchDigit', '0');
        }
        return grid.set('cells', newCells);
    },

    setSelection: (c, index) => {
        if (c.get('index') === index) {
            return c.set('isSelected', true);
        }
        else if (c.get('isSelected')) {
            return c.set('isSelected', false);
        }
        return c;
    },

    extendSelection: (c, index) => {
        if (c.get('index') === index && !c.get('isSelected')) {
            return c.set('isSelected', true);
        }
        return c;
    },

    toggleExtendSelection: (c, index) => {
        if (c.get('index') === index) {
            return c.set('isSelected', !c.get('isSelected'));
        }
        return c;
    },

    clearSelection: (c) => {
        if (c.get('isSelected')) {
            return c.set('isSelected', false);
        }
        return c;
    },

    moveFocus: (grid, deltaX, deltaY, isExtend) => {
        let focusIndex = grid.get('focusIndex');
        if (focusIndex === null) {
            focusIndex = modelHelpers.CENTER_CELL;
        }
        else  {
            const newCol = (9 + focusIndex % 9 + deltaX) % 9;
            const newRow = (9 + Math.floor(focusIndex / 9) + deltaY) % 9;
            focusIndex = newRow * 9 + newCol;
        }
        const operation = isExtend ? 'extendSelection' : 'setSelection';
        return modelHelpers.applySelectionOp(grid, operation, focusIndex);
    },

    autoAdvanceFocus: (grid) => {
        const cells = grid.get('cells')
        const focusIndex = grid.get('focusIndex');
        const focusCell = cells.get(focusIndex);
        if (focusCell && focusCell.get('errorMessage') !== undefined) {
            return grid;
        }
        if (cells.filter(c => c.get('isSelected')).size !== 1) {
            return grid;
        }
        grid = modelHelpers.moveFocus(grid, 1, 0, false);
        if (grid.get('focusIndex') % 9 === 0) {
            grid = modelHelpers.moveFocus(grid, 0, 1, false);
        }
        return grid;
    },

    // B12 — Toggle the SAM (single/multi) cell-selection mode.
    toggleSelectionMode: (grid) => {
        if (actionsBlocked(grid)) return grid;
        const current = grid.get('selectionMode') || 'single';
        return grid.set('selectionMode', current === 'single' ? 'multi' : 'single');
    },

    // B2 — remove a single candidate digit from every selected cell's
    // inner *and* outer pencilmark layers. The visible auto-derived
    // marks (Snyder pair corners / full candidates) are subtracted
    // via userHidden so the long-press always feels destructive even
    // when the digit was only auto-marked. Round-10: engineInner is
    // also cleaned so engine-supplied candidates removed by long-press
    // don't reappear.
    removePencilMarkFromSelection: (grid, digit) => {
        if (actionsBlocked(grid)) return grid;
        if (!digit || digit === '0') return grid;
        const newCells = grid.get('cells').map(c => {
            if (!c.get('isSelected')) return c;
            if (c.get('isGiven')) return c;
            if (c.get('digit') !== '0') return c;
            const innerManual = c.get('innerPencils').delete(digit);
            const outerManual = c.get('outerPencils').delete(digit);
            const engineInner = c.get('engineInner').delete(digit);
            const innerHidden = c.get('userHiddenInner').add(digit);
            const outerHidden = c.get('userHiddenOuter').add(digit);
            return modelHelpers.updateCellSnapshotCache(c.merge({
                innerPencils: innerManual,
                outerPencils: outerManual,
                engineInner: engineInner,
                userHiddenInner: innerHidden,
                userHiddenOuter: outerHidden,
            }));
        });
        return modelHelpers.checkCompletedDigits(grid.set('cells', newCells));
    },

    setInputMode: (grid, newMode) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        if (newMode.match(/^(digit|inner|outer|color)$/)) {
            grid = grid.set('inputMode', newMode);
        }
        return grid;
    },

    setTempInputMode: (grid, newMode) => {
        if (actionsBlocked(grid)) {
            return grid;
        }
        if (newMode.match(/^(inner|outer|color)$/)) {
            grid = grid.set('tempInputMode', newMode);
        }
        return grid;
    },

    clearTempInputMode: (grid) => {
        return grid.set('tempInputMode', undefined);
    },

    asDigits: (grid) => {
        return grid.get('cells').map(c => c.get('digit')).join('');
    },

}
