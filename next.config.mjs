/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
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
