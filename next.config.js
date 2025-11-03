/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100kb',
    },
  },
};

module.exports = nextConfig;
