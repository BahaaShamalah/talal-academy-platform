/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1', port: '8000', pathname: '/storage/**' },
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/storage/**' },
    ],
  },
  async redirects() {
    return [
      { source: '/account', destination: '/portal/children', permanent: false },
      { source: '/account/children/new', destination: '/portal/children/new', permanent: false },
      { source: '/account/children/:id', destination: '/portal/children/:id', permanent: false },
    ];
  },
};
export default nextConfig;
