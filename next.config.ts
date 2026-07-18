import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Cloud Run Dockerfile (see ./Dockerfile) —
  // bundles a minimal server + only the deps actually used at runtime.
  output: "standalone",
};

export default nextConfig;
