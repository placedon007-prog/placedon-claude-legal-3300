import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output builds a self-contained Node server at
   * `.next/standalone/server.js` (what Azure App Service runs via
   * `node server.js`). It is OFF by default because on Vercel it breaks the
   * post-build trace step (`onBuildComplete` fails with ENOENT on
   * `.next/next-server.js.nft.json`). Enable it only for a self-hosted build
   * (e.g. Azure) by setting BUILD_STANDALONE=1.
   */
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
};

export default nextConfig;
