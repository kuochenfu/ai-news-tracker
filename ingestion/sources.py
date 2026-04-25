from __future__ import annotations

from typing import Any, Mapping


def parse_hn_story(item: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize a Hacker News item payload to the raw_events contract."""

    return {
        "external_id": str(item["id"]),
        "source": "hn",
        "title": item.get("title"),
        "body": item.get("text"),
        "url": item.get("url"),
        "author": item.get("by"),
        "published_at": item.get("time"),
        "score": item.get("score", 0),
        "comment_count": item.get("descendants", 0),
        "raw_json": dict(item),
    }


def parse_x_post(post: Mapping[str, Any], includes: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Normalize X recent-search payload to the raw_events contract."""

    metrics = post.get("public_metrics", {}) or {}
    author_id = post.get("author_id")

    author = author_id
    if includes and author_id:
        users = includes.get("users", [])
        for user in users:
            if user.get("id") == author_id:
                author = user.get("username") or author_id
                break

    return {
        "external_id": str(post["id"]),
        "source": "x",
        "title": None,
        "body": post.get("text"),
        "url": f"https://x.com/i/web/status/{post['id']}",
        "author": author,
        "published_at": post.get("created_at"),
        "like_count": metrics.get("like_count", 0),
        "repost_count": metrics.get("retweet_count", 0),
        "reply_count": metrics.get("reply_count", 0),
        "quote_count": metrics.get("quote_count", 0),
        "raw_json": dict(post),
    }


def parse_github_repo(repo: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize GitHub repository search payload to the raw_events contract."""

    owner = repo.get("owner", {})
    return {
        "external_id": str(repo["id"]),
        "source": "github",
        "title": repo.get("full_name"),
        "body": repo.get("description"),
        "url": repo.get("html_url"),
        "author": owner.get("login"),
        "published_at": repo.get("created_at"),
        "stars": repo.get("stargazers_count", 0),
        "forks": repo.get("forks_count", 0),
        "language": repo.get("language"),
        "topics": repo.get("topics", []),
        "pushed_at": repo.get("pushed_at"),
        "raw_json": dict(repo),
    }
