const withSerwist = require("@serwist/next").default({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  cacheOnNavigation: true,
  precacheOptions: {
    concurrency: 10,
    cleanupOutdatedCaches: true,
  },
  disable: process.env.NODE_ENV === "development",
  disableGoogleAnalytics: true,
});

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig = {
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3", "mongodb"],
  experimental: {
    turbopackFileSystemCacheForDev: false,
    proxyClientMaxBodySize: "100mb",
    serverActions: {
      bodySizeLimit: "100mb",
    },
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/utils",
      "recharts",
      "lucide-react",
      "date-fns",
      "@visx/shape",
      "@visx/scale",
      "@visx/geo",
      "@visx/grid",
      "@visx/group",
      "@visx/heatmap",
      "@visx/curve",
      "@visx/event",
      "@visx/pattern",
      "@visx/responsive",
      "@visx/zoom",
      "rxjs",
      "date-fns-tz",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/web-app-manifest-192x192.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/web-app-manifest-512x512.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

if (process.env.CDN_URL) {
  nextConfig.assetPrefix = process.env.CDN_URL;
}

module.exports = withSerwist(nextConfig);