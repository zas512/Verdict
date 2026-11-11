import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Experimental performance optimizations
  experimental: {
    optimizeCss: true,
  },
  // Images: enable WebP/AVIF output and Next.js Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60000,
    // Allow optimization of assets served from our public folder
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Trailing slash behavior (false = no trailing slash, canonical-friendly)
  trailingSlash: false,
  // Disable dev prerendering if needed; keep default SSR behavior
  // Prerendering is automatic for static pages
  // No external plugins used to keep build stable
};

export default nextConfig;
