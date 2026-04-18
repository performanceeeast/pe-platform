/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pe/ui', '@pe/auth', '@pe/database', '@pe/branding'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
