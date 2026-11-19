/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    agentUpgrade: 'security',
  },
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: '/pesquisa',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
