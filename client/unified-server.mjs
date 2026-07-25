// Unified single server for comeback.AI.
//
// Serves the Next.js pages AND the Express API AND the Socket.IO websocket
// from ONE Node process on ONE port. This removes the need to run the client
// (port 3000) and the backend (port 5000) as two separate servers, and lets
// every page talk to its API on the same origin (faster, no CORS, one deploy).
//
// Run with:  node unified-server.mjs            (dev)
//            NODE_ENV=production node unified-server.mjs   (after `next build`)

// In unified mode the API + websocket live on the SAME origin/port as the
// pages, so force relative URLs. This intentionally overrides any
// NEXT_PUBLIC_API_URL/SOCKET_URL set in .env.local (e.g. a LAN IP:5000) so the
// browser talks to the single unified server instead of the old backend port.
process.env.UNIFIED_SERVER = 'true';
process.env.NEXT_PUBLIC_API_URL = '';
process.env.NEXT_PUBLIC_SOCKET_URL = '';

// Load the backend's environment file BEFORE importing the backend bundle.
// The bundled backend resolves its own dotenv relative to the bundle's
// location, which can point at the wrong directory, so load it explicitly
// here from the known path (client/../server/.env).
import { dirname as __dirname2, resolve as __resolve } from 'path';
import { fileURLToPath as __fileURLToPath } from 'url';
import { createRequire as __createRequire } from 'module';
const __unifiedDir = __dirname2(__fileURLToPath(import.meta.url));
const __require = __createRequire(import.meta.url);
// dotenv lives in the server package; load it from there.
const dotenv = __require(__resolve(__unifiedDir, '..', 'server', 'node_modules', 'dotenv'));
dotenv.config({ path: __resolve(__unifiedDir, '..', 'server', '.env') });

import next from 'next';
import http from 'http';
import path from 'path';
// Use the single bundled backend file when it exists; otherwise fall back to the
// modular source so development works without a rebuild.
let backend;
try {
  backend = await import('../server/dist/backend.bundle.mjs');
} catch {
  backend = await import('../server/src/server.js');
}
const { createApp, initializeServices, errorHandler } = backend;

const __dirname = __unifiedDir;
const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();

// The Express app already mounts every /api/*, /uploads and /health route.
// In unified mode its catch-all defers to Next.js for page/runtime requests.
const app = createApp({ unified: true });
app.use((req, res) => handle(req, res));
app.use(errorHandler);

const server = http.createServer(app);

await nextApp.prepare();
await initializeServices(server);

server.listen(port, () => {
  console.log(`\n🚀 comeback.AI Unified Server`);
  console.log(`📡 Port: ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${port}`);
  console.log(`💬 WebSocket: ws://localhost:${port}`);
  console.log(`📄 Pages + API + Socket.IO served from ONE server\n`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
