import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Vinext currently redirects non-root prerender requests when this is true.
  // The postbuild step restores clean directory-index URLs for static hosting.
  trailingSlash: false,
};

export default nextConfig;
