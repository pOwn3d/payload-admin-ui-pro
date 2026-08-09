import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    // e2e/ holds Playwright specs — running them under vitest throws
    // "Playwright Test did not expect test.describe() to be called here".
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
})
