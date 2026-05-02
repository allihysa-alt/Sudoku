import { StoreSync } from '@/components/dev/StoreSync';
import { ThemePickerStub } from '@/components/dev/ThemePickerStub';

export default function HomePage() {
  return (
    <>
      <StoreSync />
      <ThemePickerStub />
      <main className="placeholder">
        <h1 className="placeholder-title">Sudoku</h1>
        <p className="placeholder-subtitle">Coming soon.</p>
      </main>
    </>
  );
}
