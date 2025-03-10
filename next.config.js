/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      enabled: true
    },
    turbo: {
      resolveAlias: {
        '@': './src',
        '@shared': '../shared'
      }
    }
  },
  distDir: 'dist',
  useFileSystemPublicRoutes: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'x-skip-middleware',
            value: 'true',
          },
        ],
      },
    ]
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    apiTimeout: 300000, // 5 minutes
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:11434',
  },
}

module.exports = nextConfig
