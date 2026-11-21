/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { instrumentationHook: true },
  reactStrictMode: true,
  webpack: (config) => { config.resolve.alias.canvas = false; config.resolve.alias.encoding = false; return config; },
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

