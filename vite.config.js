import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/.vite',
  server: { port: 5173 },
  // Force a single three.js instance — 3d-force-graph ships its own nested
  // three, and without dedupe both versions load → constructor throws.
  resolve: {
    dedupe: ['three'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Split heavy 3D libs into their own chunks. Safe now that `dedupe`
        // guarantees only one three.js exists across all chunks.
        manualChunks: {
          three: ['three'],
          'force-graph': ['3d-force-graph'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
