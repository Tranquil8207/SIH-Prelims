import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/materials": ["./Ref materials/**/*"],
    "/materials/file": ["./Ref materials/**/*"],
  },
};

export default nextConfig;
