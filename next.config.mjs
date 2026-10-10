/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint runs as its own CI step (npm run lint); never block builds on it.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
