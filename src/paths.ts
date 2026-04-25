const basePath = process.env.GITHUB_PAGES === "true" ? "/ai-news-tracker" : "";

export function sitePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

