/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { instrumentationHook: true },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

