/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // ignoreBuildErrors: true, // Temporarily commented out
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      { // Add new pattern for i.postimg.cc
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
       { // Pattern for placehold.co
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

module.exports = nextConfig;
