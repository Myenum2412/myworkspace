import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "mongodb"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://localhost:4000/api/:path*",
        },
        {
          source: "/uploads/:path*",
          destination: "http://localhost:4000/uploads/:path*",
        },
        {
          source: "/banners/:path*",
          destination: "http://localhost:4000/banners/:path*",
        },
      ],
    };
  },
  turbopack: {
    root: process.cwd(),
  },
  // Compress responses
  compress: true,
  // Generate etags for caching
  generateEtags: true,
  poweredByHeader: false,
  // CDN asset prefix — set CDN_URL env var to enable (e.g. https://cdn.example.com)
  assetPrefix: process.env.CDN_URL || undefined,
};

export default nextConfig;
