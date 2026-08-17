/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['cytoplast-robin-hasty.ngrok-free.dev', 'localhost:3000'],
  // Proxy /api/* → backend (browser calls /api/... → Next.js forwards to backend, no CORS issues).
  // Declared as `fallback` (not the default afterFiles array) so our own Route
  // Handlers under app/api/admin/** — which check the admin session cookie and
  // inject the backend x-admin-key server-side — are tried first. A plain
  // array here is checked *before* dynamic app routes, which would let this
  // rewrite forward /api/admin/* straight to the backend unauthenticated,
  // bypassing the session check entirely. See app/api/admin/[...path]/route.ts.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: process.env.NEXT_PUBLIC_API_URL
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
            : `${backendUrl}/api/:path*`,
        },
      ],
    };
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
