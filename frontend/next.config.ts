import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://localhost:4000/api/:path*",
        },
      ],
    };
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals || []), "mongodb-memory-server", "mongodb-memory-server-core"];
    }
    return config;
  },
};

export default nextConfig;
