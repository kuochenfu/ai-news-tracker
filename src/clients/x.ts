export interface XRecentSearchPost {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
}

interface XRecentSearchResponse {
  data?: XRecentSearchPost[];
  includes?: {
    users?: Array<{ id: string; username?: string }>;
  };
}

export async function searchRecentXPosts(query: string, bearerToken: string) {
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "50");
  url.searchParams.set("tweet.fields", "author_id,created_at,entities,public_metrics");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`X recent search failed with ${response.status}`);
  }

  return (await response.json()) as XRecentSearchResponse;
}

