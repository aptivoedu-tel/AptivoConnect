import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ['@aptivo/connect'],
  turbopack: { root: path.resolve(__dirname, '..') },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  // Allow an isolated local mobile API preview alongside the existing portal server.
  distDir: process.env.APTIVO_REVIEW_DIST || '.next',
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'aptivo.tech',
          },
        ],
        destination: 'https://www.aptivo.tech/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
