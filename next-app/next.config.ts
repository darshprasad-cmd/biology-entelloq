import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser journeys use the loopback IP so they exercise the same origin
  // consistently across Windows and CI.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
