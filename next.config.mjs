/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  experimental: {
    // admin photo uploads go through server actions
    serverActions: { bodySizeLimit: '8mb' },
  },
  async redirects() {
    // keep URLs canonical: lowercase, hyphenated. Old/alt paths 301 to the real slug.
    return [
      { source: '/place/:slug', destination: '/places/:slug', permanent: true },
      { source: '/destinations/:slug', destination: '/places/:slug', permanent: true },
    ];
  },
};
export default nextConfig;
