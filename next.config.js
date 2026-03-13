/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker (disabled for local dev)
  // output: 'standalone',
  
  // Optimize for production
  serverExternalPackages: ['mongodb'],
  
  // Image optimization
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration with performance optimizations
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
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
    
    // Fix pdf-lib SSR issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-lib');
    }
    
    // Performance optimizations disabled for build debugging
    // if (!dev) {
    //   config.optimization.splitChunks = {
    //     chunks: 'all',
    //     cacheGroups: {
    //       vendor: {
    //         test: /[\\/]node_modules[\\/](?!pdf-lib)/,
    //         name: 'vendors',
    //         chunks: 'all',
    //       },
    //     },
    //   };
    // }
    
    return config;
  },

  // Performance optimizations
  experimental: {
    // Disable CSS optimization to fix Docker build issues
    // optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-dialog', '@radix-ui/react-select', 'lucide-react'],
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      // Remove automatic admin redirect - let middleware handle role-based routing
      // {
      //   source: '/dashboard',
      //   destination: '/dashboard/admin',
      //   permanent: false,
      // },
    ];
  },
};

module.exports = nextConfig;
