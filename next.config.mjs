import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Enable Cloudflare bindings in local dev (optional, harmless if unused)
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform().catch(() => {});
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.cloudflare.steamstatic.com',
        pathname: '/apps/dota2/images/**',
      },
    ],
  },
};

export default nextConfig;
