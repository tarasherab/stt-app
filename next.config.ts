/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'microphone=*' // Allows microphone access
          }
        ],
      },
    ]
  }
}

module.exports = nextConfig