import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable favicon generation
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['@react-email/components'],
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { isServer }) => {
    // Disable favicon generation
    config.module.rules.push({
      test: /favicon\.ico$/,
      use: 'null-loader',
    });
    return config;
  },
};

export default nextConfig;
