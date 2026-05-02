/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port from the CRA blueprint at
// C:\Users\ismoo\Desktop\sudoku-web-app-master\src\lib\modal-types.js.
// Annotations and lint re-enabled per-module in later phases.

export const MODAL_TYPE_WELCOME = 'no-initial-digits';
export const MODAL_TYPE_SAVED_PUZZLES = "saved-puzzles";
export const MODAL_TYPE_RESUME_OR_RESTART = "resume-or-restart";
export const MODAL_TYPE_INVALID_INITIAL_DIGITS = 'invalid-initial-digits';
export const MODAL_TYPE_PASTE = 'paste';
export const MODAL_TYPE_SHARE = 'share';
export const MODAL_TYPE_SETTINGS = 'settings';
export const MODAL_TYPE_CHECK_RESULT = 'check-result';
export const MODAL_TYPE_PAUSED = 'paused';
export const MODAL_TYPE_CONFIRM_RESTART = 'confirm-restart';
export const MODAL_TYPE_CONFIRM_CLEAR_COLOR_HIGHLIGHTS = 'confirm-clear-color-highlights';
export const MODAL_TYPE_SOLVER = 'solver';
export const MODAL_TYPE_HELP = 'help';
export const MODAL_TYPE_HINT = 'hint';
export const MODAL_TYPE_ABOUT = 'about';
export const MODAL_TYPE_QR_CODE = 'qr-code';
export const MODAL_TYPE_FEATURES = 'features';
// B4 — Stats dashboard modal.
export const MODAL_TYPE_STATS = 'stats';
// Reset-stats batch — destructive-confirm modal that wipes the entire
// stats history AND every saved puzzle in localStorage. Triggered from
// the Stats modal's footer button. Wipe is irreversible, so the
// confirm modal shows the actual counts ("X recorded solves, Y saved
// puzzles") and uses a btn-danger CTA so the destructive intent reads.
export const MODAL_TYPE_CONFIRM_RESET_STATS = 'confirm-reset-stats';
