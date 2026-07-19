/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double useEffect firing (timer issue)
  // Proxy /api/* → backend (browser calls /api/... → Next.js forwards to backend, no CORS issues)
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  output: 'standalone',
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
