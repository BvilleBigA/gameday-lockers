import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma must not be webpack-bundled or the client is often undefined in Route Handlers.
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
