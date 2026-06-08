import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // necessário para deploy no Coolify via Docker
  compress: true,        // gzip nos responses do servidor Node.js
  poweredByHeader: false,
  // Cache agressivo para assets estáticos (/_next/static/)
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;
