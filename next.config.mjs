/** @type {import("next").NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: isGitHubPages ? "/ai-news-tracker" : "",
  assetPrefix: isGitHubPages ? "/ai-news-tracker/" : ""
};

export default nextConfig;
