'use client';

// Phase 5 — the play surface client island. Mounts inside the server
// page shell (app/page.tsx) and owns:
//
//   - Initial puzzle generation on mount (level 2, synchronous; worker
//     swap lands in Phase 10).
//   - Settings → grid sync: settingsStore changes trigger
//     gameStore.reseedSettings so engine getSetting() reads stay
//     fresh.
//   - documentElement data-attribute writes via useSyncSettingsToDom
//     (theme, numpad-layout, compact-settings).
//   - Keyboard + pointer dispatch bridges (useGridKeyboard,
//     useCellMouse).
//   - A minimal responsive board sizing pass that clamps to
//     PLAY_SURFACE_CAPS.boardMax. Real layout (side-by-side keypad)
//     lands in Phase 6.
//
// Phase 5 ships without a status bar, modal renderer, or numpad — the
// grid + keyboard input are the entire interactive surface for now.

import { useEffect, useMemo, useState } from 'react';

import SudokuGrid from '@/components/play/grid/SudokuGrid';
import { useCellMouse } from '@/hooks/useCellMouse';
import { useGridKeyboard } from '@/hooks/useGridKeyboard';
import { useGameStore } from '@/state/gameStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useSyncSettingsToDom } from '@/state/syncSettingsToDom';
import styles from './PlayClient.module.css';

const BOARD_MIN_PX = 280;
const BOARD_MAX_PX = 720; // PLAY_SURFACE_CAPS.boardMax in grid-dimensions.ts

function useResponsiveBoardSize(): number {
  const [size, setSize] = useState(540);
  useEffect(() => {
    function update() {
      const chrome = 64; // breathing room around the board (page padding + future status bar)
      const min = Math.min(window.innerWidth, window.innerHeight) - chrome;
      setSize(Math.min(Math.max(min, BOARD_MIN_PX), BOARD_MAX_PX));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

export default function PlayClient() {
  const grid = useGameStore((s) => s.grid);
  const initStartingPuzzle = useGameStore((s) => s.initStartingPuzzle);
  const reseedSettings = useGameStore((s) => s.reseedSettings);

  // 1. Settings → DOM data attributes (theme, numpad-layout, compact).
  useSyncSettingsToDom();

  // 2. Keyboard bridge — attaches document-level keydown/keyup.
  useGridKeyboard();

  // 3. Pointer / touch handlers passed into SudokuGrid.
  const { mouseDownHandler, mouseOverHandler, doubleClickHandler, inputHandler } = useCellMouse();

  // 4. Responsive board sizing — clamped square, capped at 720 px.
  const gridLength = useResponsiveBoardSize();
  const dimensions = useMemo(() => ({ gridLength }), [gridLength]);

  // 5. On mount: generate the starting puzzle if none seated.
  useEffect(() => {
    if (useGameStore.getState().grid == null) {
      initStartingPuzzle();
    }
  }, [initStartingPuzzle]);

  // 6. Settings → grid re-bake. Subscribe to settingsStore mutations
  //    and re-bake into the engine grid so getSetting reads stay
  //    fresh. Zustand subscribe does NOT fire on initial subscribe —
  //    only on state changes — and reseedSettings short-circuits when
  //    grid is null, so this is safe to wire up before
  //    initStartingPuzzle finishes.
  useEffect(() => {
    const unsub = useSettingsStore.subscribe(() => reseedSettings());
    return () => unsub();
  }, [reseedSettings]);

  if (!grid) {
    return (
      <main className={styles.placeholder}>
        <p className={styles.placeholderText}>Generating puzzle…</p>
      </main>
    );
  }

  return (
    <main className={styles.playSurface}>
      <SudokuGrid
        grid={grid}
        dimensions={dimensions}
        isPaused={false}
        mouseDownHandler={mouseDownHandler}
        mouseOverHandler={mouseOverHandler}
        doubleClickHandler={doubleClickHandler}
        inputHandler={inputHandler}
      />
    </main>
  );
}
