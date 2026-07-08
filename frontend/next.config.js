const withSerwist = require("@serwist/next").default({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: true,
});

const API_URL = process.env.API_URL || "http://localhost:4000";

const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "mongodb"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60 * 60 * 24,
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${API_URL}/api/:path*`,
        },
        {
          source: "/uploads/:path*",
          destination: `${API_URL}/uploads/:path*`,
        },
        {
          source: "/banners/:path*",
          destination: `${API_URL}/banners/:path*`,
        },
      ],
    };
  },
  turbopack: {
    root: process.cwd(),
  },
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
};

if (process.env.CDN_URL) {
  nextConfig.assetPrefix = process.env.CDN_URL;
}

module.exports = withSerwist(nextConfig);
