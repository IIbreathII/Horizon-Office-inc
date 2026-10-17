import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3000"; // Express

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
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

  async rewrites() {
    return [
      // браузер ходит на /api/... (свой же :3001), Next проксирует в Express, где роуты в корне:
      // /api/quests → http://localhost:3000/quests (без CORS). В .env: NEXT_PUBLIC_API_URL=/api
      { source: "/api/:path*", destination: `${API_URL}/:path*` },
    ];
  },
};

export default nextConfig;