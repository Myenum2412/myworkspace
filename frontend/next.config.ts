import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

const isVercel = process.env.VERCEL === "1";
if (isVercel) {
  config.distDir = "../.next";
}

const nextConfig: NextConfig = config;

export default nextConfig;
