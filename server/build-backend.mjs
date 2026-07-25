// Bundles the ENTIRE backend (all routes, models, services, socket, config)
// into a single self-contained file: server/dist/backend.bundle.mjs
//
// The unified server then runs this one file, so the backend is "one file"
// alongside the frontend pages served from the same link.
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.resolve(__dirname, 'src/server.js')],
  outfile: path.resolve(__dirname, 'dist/backend.bundle.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  // `@anthropic-ai/sdk` is declared as an optional null package; keep it external
  // so the bundle never fails to resolve it. It is only used when AI_PROVIDER=anthropic.
  external: ['@anthropic-ai/sdk'],
  // The bundled CJS deps (express, mongoose, ...) use require() for Node builtins.
  // Provide a real require so the ESM bundle can resolve them.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
  sourcemap: false,
  logLevel: 'info',
});

console.log('✅ Backend bundled to server/dist/backend.bundle.mjs');
