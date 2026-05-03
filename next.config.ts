import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pas de télémétrie, pas de tracking, rien.
  // Voir aussi: NEXT_TELEMETRY_DISABLED=1 dans .env si besoin.
};

export default nextConfig;
