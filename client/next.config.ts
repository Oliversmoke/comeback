import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '10.20.181.119', '*.ngrok-free.dev', '*.ngrok.io'],
  async rewrites() {
    // When running the unified single server, the API, uploads and websocket
    // are served by the same process on the same origin, so no proxy is needed.
    if (process.env.UNIFIED_SERVER === 'true') return [];
    return [
      { source: '/api/:path*', destination: 'http://localhost:5000/api/:path*' },
      { source: '/ws', destination: 'http://localhost:5000/ws' },
      { source: '/uploads/:path*', destination: 'http://localhost:5000/uploads/:path*' },
    ];
  },
  output: process.env.NEXT_STATIC_EXPORT === 'true' ? 'export' : process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    unoptimized: process.env.NEXT_STATIC_EXPORT === 'true',
  },
  trailingSlash: process.env.NEXT_STATIC_EXPORT === 'true',
  skipTrailingSlashRedirect: process.env.NEXT_STATIC_EXPORT === 'true',
  outputFileTracingRoot: process.env.NEXT_STATIC_EXPORT === 'true' ? undefined : process.cwd(),
};

export default nextConfig;
