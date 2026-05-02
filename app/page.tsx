import PlayClient from '@/components/play/PlayClient';
import { ThemePickerStub } from '@/components/dev/ThemePickerStub';

// Server shell. The server's job is the HTML scaffold + anti-FOUC
// (handled in layout.tsx) + OG metadata. The play surface is a single
// client island — see src/components/play/PlayClient.tsx.
//
// ThemePickerStub stays as a dev affordance until Phase 8 ships the
// real Settings modal; remove or move under /dev once the picker is
// wired into ModalSettings.
export default function HomePage() {
  return (
    <>
      <ThemePickerStub />
      <PlayClient />
    </>
  );
}
