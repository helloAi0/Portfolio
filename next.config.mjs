import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// In `next dev` this exposes the local D1 / R2 bindings from wrangler.jsonc, so the dev server uses the same data layer as production.
if (process.env.NODE_ENV === 'development') initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No server-side image optimizer on Workers; the site only uses plain <img>.
  images: { unoptimized: true },
};

export default nextConfig;
