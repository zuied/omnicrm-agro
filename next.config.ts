import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3111", "http://192.168.1.9:3111", "http://192.168.*:3111"],
};

export default nextConfig;
