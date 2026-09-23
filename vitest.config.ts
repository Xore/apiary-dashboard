import { defineConfig } from 'vitest/config'

// Unit tests run in plain Node with only the #/ path alias; the app's
// vite.config.ts pulls in the TanStack Start plugin, which tests don't need.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    // Component tests opt into a DOM per file with a
    // `// @vitest-environment jsdom` pragma.
    setupFiles: ['src/test/setup.ts'],
  },
})
