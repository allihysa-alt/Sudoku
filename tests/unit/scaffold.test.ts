import { describe, expect, it } from 'vitest';

// Phase 1 placeholder. Removed in Phase 3 once the engine port lands
// real engine unit tests. Exists so CI's `pnpm test` step has at
// least one green test to confirm the runner is wired correctly.
describe('scaffold sanity', () => {
  it('arithmetic still works', () => {
    expect(2 + 2).toBe(4);
  });
});
