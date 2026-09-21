import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname ?? '.', 'src'),
      'next/link': resolve(import.meta.dirname ?? '.', 'src/lib/link.tsx'),
      'next/navigation': resolve(import.meta.dirname ?? '.', 'src/lib/navigation.ts'),
    },
    tsconfigPaths: true
  },
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
  server: { port: 3009 },
  preview: { port: 3009 }
})
