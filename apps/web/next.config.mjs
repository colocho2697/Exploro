/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@exploro/shared-types',
    '@exploro/validation',
    '@exploro/business-rules',
    '@exploro/api-client',
  ],
};

export default nextConfig;

