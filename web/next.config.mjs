/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://healconnect-backend-dqcsaqf4a6baffaz.centralindia-01.azurewebsites.net/api/:path*',
      },
    ];
  },
};

export default nextConfig;
