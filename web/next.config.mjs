/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* → backend (browser calls /api/... → Next.js forwards to backend, no CORS issues)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/api/:path*',
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
