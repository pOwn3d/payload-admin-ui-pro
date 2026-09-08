import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // scripts/ holds the shipped `bin` remediation script; its pure helpers
    // are plain .mjs so they stay runnable without a TypeScript loader.
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'scripts/__tests__/**/*.test.mjs'],
    // e2e/ holds Playwright specs — running them under vitest throws
    // "Playwright Test did not expect test.describe() to be called here".
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
})
