import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // necessário para deploy no Coolify via Docker
};

export default nextConfig;
