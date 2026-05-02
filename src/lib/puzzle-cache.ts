/* eslint-disable */
// @ts-nocheck
// Phase 3 — port from the CRA blueprint at
// C:\Users\ismoo\Desktop\sudoku-web-app-master\src\lib\puzzle-cache.js.
// One adjustment from spec: the worker URL points at the new
// src/lib/workers/sudoku-generator.worker.ts path.

// G-06 — In-memory puzzle cache fed by the generator Web Worker.
//
// Why this exists: Master / Evil-level generation can take 1–2 s on
// slower machines because the generator retries up to ~24 times to
// land its target rating band. Done synchronously on chip-click,
// that froze the welcome modal. With the worker, generation runs
// off-thread; with this cache layered on top, chip clicks become
// effectively instant whenever the welcome modal has been open long
// enough for the worker to pre-warm one puzzle per level.
//
// Public API:
//   prewarmAll()              — fire-and-forget; for each level not
//                               already cached or in flight, request
//                               one puzzle from the worker.
//   takeCachedPuzzle(level)   — synchronous; if there's a cached
//                               puzzle for that level, pop it AND
//                               kick off a replacement request so
//                               the cache refills for next time.
//                               Returns the puzzle or null.
//
// Failure mode: if the worker can't be constructed (browser blocks
// workers, file:// scheme, etc.) the cache silently degrades to
// always-empty. Callers fall back to the synchronous generator path
// they were already using before this layer existed.

let workerInstance = null;
let workerUnavailable = false;
const cache = {};      // level → {digits, rating, level}
const inFlight = {};   // level → Promise<{digits, rating, level}>
let nextRequestId = 1;

function getWorker() {
    if (workerInstance) return workerInstance;
    if (workerUnavailable) return null;
    try {
        workerInstance = new Worker(
            new URL('./workers/sudoku-generator.worker.ts', import.meta.url),
            { type: 'module' }
        );
        workerInstance.addEventListener('error', (err) => {
            console.warn('puzzle-cache worker runtime error:', err && err.message);
        });
    } catch (err) {
        workerUnavailable = true;
        // eslint-disable-next-line no-console
        console.warn('puzzle-cache worker unavailable, falling back to sync:',
            err && err.message);
        return null;
    }
    return workerInstance;
}

function generateInWorker(worker, level) {
    return new Promise((resolve, reject) => {
        const id = nextRequestId++;
        const handler = (e) => {
            const data = e.data || {};
            if (data.id !== id) return;
            worker.removeEventListener('message', handler);
            if (data.error) reject(new Error(data.error));
            else resolve(data.payload);
        };
        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'generate', level, id });
    });
}

function requestReplacement(level) {
    if (inFlight[level]) return inFlight[level];
    const worker = getWorker();
    if (!worker) return Promise.reject(new Error('worker unavailable'));
    const p = generateInWorker(worker, level)
        .then((result) => {
            cache[level] = result;
            delete inFlight[level];
            return result;
        })
        .catch((err) => {
            delete inFlight[level];
            throw err;
        });
    inFlight[level] = p;
    return p;
}

export function prewarmAll() {
    // Round-11: levels 1..6 (was 1..5). Hell pre-warm may take a
    // while — the worker has 32 retries to find a strategy-ladder-
    // exhaustive puzzle — but it runs off the main thread so the UI
    // doesn't feel it.
    [1, 2, 3, 4, 5, 6].forEach((level) => {
        if (cache[level] || inFlight[level]) return;
        // Swallow rejections — the synchronous fallback in startGenerated
        // handles the cache-miss path, so a failed pre-warm is not
        // user-visible.
        requestReplacement(level).catch(() => { /* swallow */ });
    });
}

export function takeCachedPuzzle(level) {
    const hit = cache[level];
    if (!hit) return null;
    delete cache[level];
    // Refill in the background so the next click on the same level is
    // also instant. Same swallow semantics as prewarmAll.
    requestReplacement(level).catch(() => { /* swallow */ });
    return hit;
}
