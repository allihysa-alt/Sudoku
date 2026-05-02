'use client';

// useStoreHydration — SSR-safe gate for components that depend on
// persisted store state. Returns true once Zustand's persist
// middleware has finished rehydrating from localStorage.
//
// On the server, hydrated is always false. On the client, the first
// render is also false (matches server output, no hydration
// mismatch); useEffect runs, the persist middleware finishes
// rehydration, hydrated flips to true, the component re-renders with
// the persisted values.
//
// Components that ONLY render visual output dependent on persisted
// state (e.g. ThemePickerStub showing the active theme) should gate
// their render on this hook. Components that render the same output
// regardless (e.g. the home page placeholder) don't need it.

import { useEffect, useState } from 'react';

import { useSettingsStore } from '@/state/settingsStore';

export function useSettingsHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // If hydration has already finished (e.g. fast remount), set
    // immediately. Otherwise subscribe to the finish event.
    if (useSettingsStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    return () => unsub();
  }, []);

  return hydrated;
}
