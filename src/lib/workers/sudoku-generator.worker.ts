/* eslint-disable */
// @ts-nocheck
// Phase 3 — verbatim port from the CRA blueprint at
// C:\Users\ismoo\Desktop\sudoku-web-app-master\src\lib\sudoku-generator.worker.js.
// Worker file; uses self.* per the standard DedicatedWorker globals.
// Imports the generator from one level up (src/lib/sudoku-generator.ts).

// G-06 — Web Worker wrapping the puzzle generator.
//
// Runs generatePuzzle off the main thread so high-difficulty levels
// (Master / Evil / Hell) with their extensive retry loops don't freeze
// the UI. Bundled as a separate worker chunk by Next.js / webpack via
// the standard `new Worker(new URL(...), import.meta.url)` pattern in
// puzzle-cache.ts.
//
// Message protocol:
//   in:  { type: 'generate', level: 1..6, id: <any> }
//        (level 6 = Hell, added Round-11)
//   out: { id: <same>, payload: { digits, rating, level } }
//        or { id: <same>, error: <message> }
//
// The worker only handles puzzle generation requests; it has no
// access to the React tree, no DOM, and no app state. Everything
// it needs comes through the message payload.

import { generatePuzzle } from '../sudoku-generator';

self.addEventListener('message', (e) => {
    const data = e.data || {};
    const { type, level, id } = data;
    if (type !== 'generate') return;
    try {
        const result = generatePuzzle(level);
        self.postMessage({ id, payload: result });
    } catch (err) {
        const message = (err && err.message) ? err.message : 'unknown generator error';
        self.postMessage({ id, error: message });
    }
});
