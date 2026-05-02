'use client';

// StoreSync — a render-nothing client component that mounts the
// settings → DOM sync hooks. Embedded once at the page level so the
// hooks fire on every render of the play surface.
//
// Phase 4 mounts: useSyncSettingsToDom, useEffectiveNumpadLayout.
// Phase 8 may extend with the compact-settings auto-track effect.

import { useEffectiveNumpadLayout } from '@/hooks/useEffectiveNumpadLayout';
import { useSyncSettingsToDom } from '@/state/syncSettingsToDom';

export function StoreSync() {
  useSyncSettingsToDom();
  useEffectiveNumpadLayout();
  return null;
}
