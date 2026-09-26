import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths so the built game also runs from a desktop wrapper (Electron/Tauri) or a sub-folder.
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    // The engine chunk is ~5 MB (~2 MB gzipped), mostly the Rapier physics engine's embedded WebAssembly.
    chunkSizeWarningLimit: 6000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
