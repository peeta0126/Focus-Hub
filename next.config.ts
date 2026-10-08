import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: process.cwd() },

  allowedDevOrigins: ["10.10.21.33"],

};

export default nextConfig;
