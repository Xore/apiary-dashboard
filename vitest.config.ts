import { defineConfig } from 'vitest/config'

// Unit tests run in plain Node with only the #/ path alias; the app's
// vite.config.ts pulls in the TanStack Start plugin, which tests don't need.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
