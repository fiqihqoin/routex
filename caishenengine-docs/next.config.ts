import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  typescript: {
    // Abaikan error tipe saat build agar tidak memakan RAM untuk pengecekan
    ignoreBuildErrors: true,
  },
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
