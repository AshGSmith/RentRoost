import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb"
    }
  },
  images: {
    remotePatterns: []
  }
};

export default nextConfig;
