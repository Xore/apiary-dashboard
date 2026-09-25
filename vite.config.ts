import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Console piping off: with Vite's own client-console forwarding it echoes
  // every browser error between client and server without end.
  plugins: [devtools({ consolePiping: { enabled: false } }), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
