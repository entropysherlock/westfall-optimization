/** Static export for GitHub Pages. NEXT_PUBLIC_BASE_PATH is "/westfall-optimization" in the Pages workflow. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
