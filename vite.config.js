import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { pathToFileURL } from 'url';

// Load .env.local into process.env (so API handlers can read env vars locally)
if (existsSync('.env.local')) {
  readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 0) return;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  });
}

// Local API middleware: routes /api/* to the matching file in /api/
const localApiPlugin = {
  name: 'local-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/')) return next();
      const urlPath = req.url.split('?')[0];
      const route = urlPath.replace(/^\//, '');

      // Resolve handler file: try exact match, then walk up looking for [...slug].js catch-all
      let filePath = resolve(__dirname, route + '.js');
      let catchAllParam = null;
      let catchAllValue = null;
      if (!existsSync(filePath)) {
        const segs = route.split('/');
        let found = false;
        for (let i = segs.length; i > 0 && !found; i--) {
          const dir = resolve(__dirname, segs.slice(0, i - 1).join('/'));
          // Look for any [...XXX].js in this dir
          try {
            const fs = await import('fs');
            const entries = fs.readdirSync(dir);
            for (const e of entries) {
              const m = e.match(/^\[\.\.\.(.+?)\]\.js$/);
              if (m) {
                filePath = resolve(dir, e);
                catchAllParam = m[1];
                catchAllValue = segs.slice(i - 1);
                found = true;
                break;
              }
            }
          } catch {}
        }
        if (!found) return next();
      }

      try {
        const mod = await import(pathToFileURL(filePath).href + '?t=' + Date.now());
        const handler = mod.default;
        if (typeof handler !== 'function') {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'API handler missing default export' }));
          return;
        }

        // Collect body
        let raw = '';
        req.setEncoding('utf8');
        for await (const chunk of req) raw += chunk;
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }

        // Parse query params
        const u = new URL(req.url, 'http://localhost');
        req.query = {};
        u.searchParams.forEach((v, k) => { req.query[k] = v; });
        // For Vercel-style [...slug] catch-all, inject the captured segments
        if (catchAllParam && catchAllValue) {
          req.query[catchAllParam] = catchAllValue;
        }

        // Express-like helpers on res
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        res.send = (data) => {
          if (typeof data === 'string') res.end(data);
          else res.json(data);
        };

        await handler(req, res);
      } catch (e) {
        console.error('[local-api] Error in', urlPath, e);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Local API error', detail: String(e.message || e) }));
        }
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), localApiPlugin],
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
