//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/themes/neutral/neutral-family.js',
      'src/themes/neutral/*.d.ts',
      'src/themes/astryx/*/*.js',
      'src/themes/astryx/*/*.d.ts',
      '.tanstack/**',
      // Per-agent checkouts are full copies of this tree. Linting them at the
      // repo root runs the same files many times and OOMs the 4 GB heap
      // (20k+ duplicate TS files once six worktrees exist). Each worktree
      // lints itself against this same config when CI runs there.
      '.claude/**',
      '.grit/**',
    ],
  },
]
