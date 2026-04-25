import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { typedRoutes: true },
  images: {
    domains: ["p16-oec-va.tiktokcdn.com", "p77-oec-va.tiktokcdn.com"],
  },
};

export default nextConfig;
