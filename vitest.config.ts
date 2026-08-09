import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 45,
        statements: 55,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsxDev: true,
  } as any,
})
