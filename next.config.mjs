/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  experimental: {
    // admin photo uploads go through server actions
    serverActions: { bodySizeLimit: '8mb' },
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      // mic is used by "Ask Beyond" on our own origin only
      { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=()' },
    ];
    return [
      { source: '/:path*', headers: security },
    ];
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
