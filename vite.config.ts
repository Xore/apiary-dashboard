import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { assertBootPolicies } from './src/server/policy.ts'

// The dev server holds itself to the same boot policies as production
// (src/server/policy.ts), with NODE_ENV=development as the dev signal.
if (process.argv.includes('dev')) assertBootPolicies({ ...process.env, NODE_ENV: 'development' })

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Console piping off: with Vite's own client-console forwarding it echoes
  // every browser error between client and server without end.
  plugins: [devtools({ consolePiping: { enabled: false } }), tailwindcss(), tanstackStart({ router: { routeFileIgnorePattern: '\\.test\\.' } }), viteReact()],
})

export default config
