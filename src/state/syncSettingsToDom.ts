'use client';

// syncSettingsToDom — keeps the documentElement's data-attributes in
// lockstep with the persisted settings. The anti-FOUC script in
// app/layout.tsx writes the initial values BEFORE React mounts; this
// hook takes over once the store hydrates and re-applies on every
// settings change.
//
// Three attributes are owned here:
//   data-theme                       — raw theme setting (Classic /
//                                      Modern / Editorial). Drives
//                                      every token cascade in
//                                      app/globals.css.
//   data-numpad-layout               — raw numpad-layout setting
//                                      (auto / stacked / calculator).
//                                      Useful for diagnostics; CSS
//                                      should generally key off the
//                                      EFFECTIVE attribute below.
//   data-compact-settings            — Phase 8 (settings modal density).
//                                      Wired here for forward-compat.
//
// data-numpad-layout-effective is owned by useEffectiveNumpadLayout
// because it depends on viewport orientation, not just the setting.

import { useEffect } from 'react';

import { useSettingsStore } from './settingsStore';

export function useSyncSettingsToDom() {
  const themeValue = useSettingsStore((s) => s.theme);
  const layoutValue = useSettingsStore((s) => s.numpadLayout);
  const compactValue = useSettingsStore((s) => s.compactSettingsLayout);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeValue);
  }, [themeValue]);

  useEffect(() => {
    document.documentElement.setAttribute('data-numpad-layout', layoutValue);
  }, [layoutValue]);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-compact-settings',
      compactValue ? 'true' : 'false',
    );
  }, [compactValue]);
}
