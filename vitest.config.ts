import { defineConfig } from 'vitest/config'

/**
 * Pure-function unit tests (node environment, no DOM): roster.ts derivations
 * and the I1–I3 invariant plans. Vitest compiles the TypeScript sources
 * itself; roster.ts imports only erased type-only faces, so no harness
 * junction is required to run `npm test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
