import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output: builds a self-contained Node server at
   * `.next/standalone/server.js` that listens on `process.env.PORT`. This is
   * what Azure App Service runs (`node server.js`). Vercel ignores this and
   * continues to work unchanged.
   */
  output: "standalone",
};

export default nextConfig;
