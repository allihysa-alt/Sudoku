'use client';

// Phase 2 throwaway. A fixed-position trio of buttons in the top-right
// corner of the page that cycles between Classic / Modern / Editorial.
// Reads + writes the same localStorage key the FOUC script reads
// (`sudoku:settings`, Zustand-persist shape), so a reload preserves
// the picked theme via the FOUC script — no flash on cold load.
//
// Removed in Phase 8 when the real Settings modal lands. Until then,
// this is the only way to verify all three theme blocks render
// correctly across the live + dev surfaces.

import { useEffect, useState } from 'react';

import styles from './ThemePickerStub.module.css';

type Theme = 'classic' | 'modern' | 'editorial';

const THEMES: ReadonlyArray<Theme> = ['classic', 'modern', 'editorial'];
const STORAGE_KEY = 'sudoku:settings';

function writePersistedTheme(next: Theme) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const merged = {
      state: { ...(parsed?.state ?? {}), theme: next },
      version: parsed?.version ?? 1,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // best-effort — private-mode etc.
  }
}

export function ThemePickerStub() {
  const [active, setActive] = useState<Theme>('modern');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // The FOUC script already wrote data-theme on documentElement at
    // boot. Mirror that into local state so the picker's active button
    // matches what's visibly painted.
    const dom = document.documentElement.getAttribute('data-theme');
    const fromDom: Theme = dom === 'classic' || dom === 'editorial' ? dom : 'modern';
    setActive(fromDom);
    setHydrated(true);
  }, []);

  function pick(next: Theme) {
    document.documentElement.setAttribute('data-theme', next);
    writePersistedTheme(next);
    setActive(next);
  }

  // Avoid an SSR/CSR mismatch. A single tick of invisibility is fine
  // for a dev affordance; production removes the stub entirely (Phase 8).
  if (!hydrated) return null;

  return (
    <div className={styles.picker} role="group" aria-label="Theme picker">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          className={styles.button}
          data-active={active === t}
          onClick={() => pick(t)}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
      <span className={styles.label} aria-hidden="true">
        dev
      </span>
    </div>
  );
}
