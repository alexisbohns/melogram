import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // vinyl-kit is consumed from source (a local workspace package), so Next
  // compiles its TS/JSX alongside the app.
  transpilePackages: ["vinyl-kit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
