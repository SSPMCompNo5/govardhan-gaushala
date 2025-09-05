/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack configuration for all builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        'fs/promises': false,
        path: false,
        crypto: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'timers/promises': false,
      };
    }
    return config;
  },
};

export default nextConfig;
