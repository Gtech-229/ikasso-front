import type { NextConfig } from "next";
import { readEnv } from "./lib/env";

const { API_URL } = readEnv();

const nextConfig: NextConfig = {
  // A self-contained server (`.next/standalone/server.js`) for the production
  // Docker image (feature 18).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Same-origin proxy: the browser only calls /api/v1, so the API's httpOnly
  // session cookies stay on this origin.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
