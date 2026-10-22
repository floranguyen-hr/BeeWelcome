import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["msnodesqlv8", "mssql"],
};

export default nextConfig;
