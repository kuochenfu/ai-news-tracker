const HN_BASE_URL = "https://hacker-news.firebaseio.com/v0";

export interface HnItem {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  text?: string;
  url?: string;
  score?: number;
  title?: string;
  kids?: number[];
  descendants?: number;
}

export async function fetchHackerNewsStoryIds(kind: "topstories" | "newstories" | "beststories") {
  const response = await fetch(`${HN_BASE_URL}/${kind}.json`);
  if (!response.ok) {
    throw new Error(`HN ${kind} request failed with ${response.status}`);
  }
  return (await response.json()) as number[];
}

export async function fetchHackerNewsItem(id: number) {
  const response = await fetch(`${HN_BASE_URL}/item/${id}.json`);
  if (!response.ok) {
    throw new Error(`HN item ${id} request failed with ${response.status}`);
  }
  return (await response.json()) as HnItem | null;
}

