'use client';

// useEffectiveNumpadLayout — resolves the raw `numpadLayout` setting
// (auto / stacked / calculator) into the EFFECTIVE layout (stacked or
// calculator) and writes data-numpad-layout-effective on
// documentElement. Re-evaluates on orientation change so a viewport
// rotation flips structural CSS without a settings round-trip.
//
// Per ARCHITECTURE.md: structural CSS keys off the EFFECTIVE attribute
// (data-numpad-layout-effective), NOT the raw setting. The raw
// attribute is preserved by useSyncSettingsToDom for diagnostics; the
// effective attribute is the one renderers consume.
//
// Resolution rule (mirrors CRA app.js's effectiveNumpadLayout):
//   stacked        → 'stacked'  (always)
//   calculator     → 'calculator' (always)
//   auto           → portrait → 'stacked', landscape → 'calculator'

import { useEffect } from 'react';

import { useSettingsStore } from '@/state/settingsStore';

type EffectiveLayout = 'stacked' | 'calculator';

function resolveEffective(setting: string, isLandscape: boolean): EffectiveLayout {
  if (setting === 'stacked') return 'stacked';
  if (setting === 'calculator') return 'calculator';
  // 'auto' (default) — portrait stacks, landscape goes calculator.
  return isLandscape ? 'calculator' : 'stacked';
}

export function useEffectiveNumpadLayout() {
  const layoutSetting = useSettingsStore((s) => s.numpadLayout);

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)');
    const apply = () => {
      const eff = resolveEffective(layoutSetting, mql.matches);
      document.documentElement.setAttribute('data-numpad-layout-effective', eff);
    };
    apply();
    // matchMedia listeners are scoped; safe to re-bind on every
    // setting change because the cleanup runs on the same instance.
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [layoutSetting]);
}
