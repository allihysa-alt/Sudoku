## Phase

<!-- e.g. "Phase 6 — numpad contract + editorial renderer" -->

## What changed

<!-- Brief, one-paragraph description. -->

## Spec deviations

<!-- Any deviation from the architecture proposal or known-good behaviour
from the CRA blueprint. None? Write "None." -->

## Verify matrix

```yaml
- scenario: <user-visible action>
  expected: <observable outcome>
```

## Lock-in gates

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm lint:css` clean
- [ ] `pnpm test` green
- [ ] `pnpm build` succeeds
- [ ] Firebase App Hosting rollout looks right (after merge to main)
