import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Cloud Run Dockerfile (see ./Dockerfile) —
  // bundles a minimal server + only the deps actually used at runtime.
  // Conditional on NOT building on Vercel (process.env.VERCEL is set
  // automatically on every Vercel build/runtime): Vercel has its own
  // serverless bundling and never reads this build's .next/standalone
  // output, but its own post-build step (onBuildComplete) still expects to
  // find a Node File Trace manifest at .next/next-server.js.nft.json --
  // "output: standalone" changes what gets written there, in a way that
  // conflicts with Vercel's adapter. Confirmed live: a real `vercel deploy`
  // (not just a local `next build`) fails with exactly that ENOENT at this
  // step regardless of Next.js patch version, with the build cache fully
  // skipped either way -- so this is a standalone-vs-Vercel incompatibility,
  // not a version regression to chase with more version bumps.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
