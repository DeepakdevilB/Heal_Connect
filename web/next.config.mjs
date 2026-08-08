/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['cytoplast-robin-hasty.ngrok-free.dev', 'localhost:3000'],
  // Proxy /api/* → backend (browser calls /api/... → Next.js forwards to backend, no CORS issues)
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
          : `${backendUrl}/api/:path*`,
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
