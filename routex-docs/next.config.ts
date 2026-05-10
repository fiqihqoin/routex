import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/id/docs',
        permanent: false,
      },
      {
        source: '/docs',
        destination: '/id/docs',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
