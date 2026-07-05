const nextConfig = {
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
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
};

if (process.env.CDN_URL) {
  nextConfig.assetPrefix = process.env.CDN_URL;
}

module.exports = nextConfig;
