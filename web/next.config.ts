import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3000"; // Express
const AUTH_API_URL = process.env.AUTH_API_URL ?? "http://localhost:8080"; // go-api (вхід і реєстрація)

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
      // /auth/login → http://localhost:8080/api/auth/login (go-api), тоже без CORS
      { source: "/auth/:path*", destination: `${AUTH_API_URL}/api/auth/:path*` },
    ];
  },
};

export default nextConfig;