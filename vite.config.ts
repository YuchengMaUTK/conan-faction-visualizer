import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/conan-faction-visualizer/',
  plugins: [react()],
  // @ts-expect-error vitest config extends vite config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
})
