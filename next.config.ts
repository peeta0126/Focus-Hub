import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.FOCUS_HUB_TEST_BUILD === "1" ? ".next-test" : ".next",
  devIndicators: process.env.FOCUS_HUB_TEST_BUILD === "1" ? false : undefined,
  reactStrictMode: true,
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["10.10.21.33"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
