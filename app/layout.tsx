import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter, Manrope } from 'next/font/google';
import './globals.css';

// next/font self-hosts at build time. The CSS variables are attached
// to whatever element gets the className — here, <html>. The
// --app-font-family token in globals.css resolves to these vars.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sudoku',
  description: 'A modern Sudoku web app.',
};

// Anti-FOUC. Reads the persisted Zustand-shape settings blob and
// writes data-theme + data-numpad-layout-effective on <html> BEFORE
// React mounts and before first paint. Private-mode browsers, corrupt
// JSON, and missing keys all silently fall back to Modern + stacked
// (the intended defaults). The Zustand persist middleware lands in
// Phase 4; until then, the Phase 2 ThemePickerStub writes localStorage
// in the same { state: {...}, version: 1 } shape so this script is
// forward-compatible.
const ANTI_FOUC = `(function () {
  var theme = 'modern';
  try {
    var raw = window.localStorage.getItem('sudoku:settings');
    if (raw) {
      var parsed = JSON.parse(raw);
      var s = parsed && parsed.state;
      if (s && (s.theme === 'classic' || s.theme === 'editorial')) {
        theme = s.theme;
      }
    }
  } catch (e) { /* fall through to Modern */ }
  document.documentElement.setAttribute('data-theme', theme);

  var layoutEff = 'stacked';
  try {
    var raw2 = window.localStorage.getItem('sudoku:settings');
    var setting = 'auto';
    if (raw2) {
      var p2 = JSON.parse(raw2);
      var s2 = p2 && p2.state;
      if (s2 && (s2.numpadLayout === 'stacked' || s2.numpadLayout === 'calculator')) {
        setting = s2.numpadLayout;
      }
    }
    if (setting === 'auto') {
      var ls = window.matchMedia('(orientation: landscape)').matches;
      layoutEff = ls ? 'calculator' : 'stacked';
    } else {
      layoutEff = setting;
    }
  } catch (e) { /* default stacked */ }
  document.documentElement.setAttribute('data-numpad-layout-effective', layoutEff);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${plexMono.variable}`}
      // The anti-FOUC script writes data-theme and
      // data-numpad-layout-effective on <html> before React hydrates.
      // suppressHydrationWarning only silences attribute drift on THIS
      // element — children still hydrate normally.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
