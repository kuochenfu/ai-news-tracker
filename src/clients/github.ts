export interface GitHubRepoSearchItem {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  pushed_at: string;
  created_at: string;
  owner: {
    login: string;
  };
}

interface GitHubSearchResponse {
  items: GitHubRepoSearchItem[];
}

export async function searchGitHubRepositories(query: string, token?: string) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "30");

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub repository search failed with ${response.status}`);
  }

  return ((await response.json()) as GitHubSearchResponse).items;
}

