import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  cacheDir: '/tmp/.vite',
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Split heavy 3D libs out of the main bundle so first paint doesn't
        // wait on them. three + 3d-force-graph together dominate bundle size.
        manualChunks: {
          three: ['three'],
          'force-graph': ['3d-force-graph'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
