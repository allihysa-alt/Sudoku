'use client';

// Phase 2 throwaway, Phase 4 rewired. A fixed-position trio of
// buttons in the top-right corner that cycles between Classic /
// Modern / Editorial. Reads + writes via settingsStore (Zustand) —
// no longer touches localStorage directly. The store's persist
// middleware writes to `sudoku:settings`, which the anti-FOUC
// script in app/layout.tsx reads on cold load, so reload preserves
// the picked theme without flash.
//
// Removed in Phase 8 when the real Settings modal lands.

import { useSettingsHydration } from '@/hooks/useStoreHydration';
import { THEMES, useSettingsStore, type ThemeValue } from '@/state/settingsStore';

import styles from './ThemePickerStub.module.css';

function labelFor(t: ThemeValue): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function ThemePickerStub() {
  const active = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const hydrated = useSettingsHydration();

  // Avoid an SSR/CSR mismatch on the active state. The picker is a
  // dev affordance; one tick of invisibility is fine. Production
  // removes the stub entirely (Phase 8).
  if (!hydrated) return null;

  return (
    <div className={styles.picker} role="group" aria-label="Theme picker">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          className={styles.button}
          data-active={active === t}
          onClick={() => setTheme(t)}
        >
          {labelFor(t)}
        </button>
      ))}
      <span className={styles.label} aria-hidden="true">
        dev
      </span>
    </div>
  );
}
