import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local runbook opens 127.0.0.1 while Next dev starts on localhost.
  // Allow that loopback host to receive the dev assets needed for hydration.
  allowedDevOrigins: ["127.0.0.1"],
  /**
   * Standalone output builds a self-contained Node server at
   * `.next/standalone/server.js` (what Azure App Service runs via
   * `node server.js`). It is OFF by default because on Vercel it breaks the
   * post-build trace step (`onBuildComplete` fails with ENOENT on
   * `.next/next-server.js.nft.json`). Enable it only for a self-hosted build
   * (e.g. Azure) by setting BUILD_STANDALONE=1.
   */
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // The application accepts one file up to 10 MiB. The framework must admit that
  // file plus multipart boundaries, action metadata, and other bounded fields.
  // Individual upload actions still enforce the tighter 10 MiB file limit.
  experimental: { serverActions: { bodySizeLimit: 11 * 1024 * 1024 } },
  /**
   * The development-only route badge sits bottom-left, exactly where the console's account
   * avatar is, and reads as a broken avatar. Off; compile and runtime errors still show.
   */
  devIndicators: false,
};

export default nextConfig;
