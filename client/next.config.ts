import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.NEXT_STATIC_EXPORT === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.NEXT_STATIC_EXPORT === 'true',
  },
  trailingSlash: process.env.NEXT_STATIC_EXPORT === 'true',
  skipTrailingSlashRedirect: process.env.NEXT_STATIC_EXPORT === 'true',
  outputFileTracingRoot: process.env.NEXT_STATIC_EXPORT === 'true' ? undefined : process.cwd(),
};

export default nextConfig;
