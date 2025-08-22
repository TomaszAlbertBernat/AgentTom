import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Ensure route handlers can access cookies in edge/runtime if enabled later
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/docs/:path*`,
      },
    ];
  },
};

export default nextConfig;
