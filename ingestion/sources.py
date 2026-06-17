from __future__ import annotations

from typing import Any, Mapping

from .source_registry import enrich_event_with_source_metadata


def parse_hn_story(item: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize a Hacker News item payload to the raw_events contract."""

    return enrich_event_with_source_metadata({
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
    })


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

    return enrich_event_with_source_metadata({
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
    })


def parse_github_repo(repo: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize GitHub repository search payload to the raw_events contract."""

    owner = repo.get("owner", {})
    return enrich_event_with_source_metadata({
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
    })


def parse_github_release(release: Mapping[str, Any], repo_full_name: str | None = None) -> dict[str, Any]:
    """Normalize a GitHub release payload as a first-party origin signal."""

    repo = repo_full_name or release.get("repo_full_name") or release.get("repository")
    tag_name = release.get("tag_name") or release.get("name")
    external_id = release.get("id") or f"{repo}:{tag_name}"

    return enrich_event_with_source_metadata({
        "external_id": str(external_id),
        "source": "github_releases",
        "title": release.get("name") or tag_name,
        "body": release.get("body"),
        "url": release.get("html_url"),
        "author": (release.get("author") or {}).get("login") if isinstance(release.get("author"), Mapping) else release.get("author"),
        "published_at": release.get("published_at") or release.get("created_at"),
        "repo_full_name": repo,
        "tag_name": tag_name,
        "raw_json": dict(release),
    })


def parse_arxiv_paper(entry: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize an arXiv entry payload to the raw_events contract."""

    arxiv_id = entry.get("id") or entry.get("arxiv_id")
    authors = entry.get("authors") or []
    if isinstance(authors, str):
        author = authors
    else:
        author_names = [
            str(author.get("name", author)) if isinstance(author, Mapping) else str(author)
            for author in authors
        ]
        author = ", ".join(author_names)

    return enrich_event_with_source_metadata({
        "external_id": str(arxiv_id),
        "source": "arxiv",
        "title": entry.get("title"),
        "body": entry.get("summary") or entry.get("abstract"),
        "url": entry.get("url") or entry.get("link") or str(arxiv_id),
        "author": author,
        "published_at": entry.get("published") or entry.get("published_at"),
        "updated_at": entry.get("updated"),
        "categories": entry.get("categories", []),
        "raw_json": dict(entry),
    })


def parse_hugging_face_model(model: Mapping[str, Any]) -> dict[str, Any]:
    """Normalize a Hugging Face model record as a platform adoption signal."""

    model_id = model.get("modelId") or model.get("id")
    return enrich_event_with_source_metadata({
        "external_id": str(model_id),
        "source": "hugging_face",
        "title": model_id,
        "body": model.get("description") or model.get("pipeline_tag"),
        "url": model.get("url") or f"https://huggingface.co/{model_id}",
        "author": model.get("author"),
        "published_at": model.get("createdAt"),
        "downloads": model.get("downloads", 0),
        "likes": model.get("likes", 0),
        "pipeline_tag": model.get("pipeline_tag"),
        "tags": model.get("tags", []),
        "raw_json": dict(model),
    })


def parse_package_release(package: Mapping[str, Any], ecosystem: str) -> dict[str, Any]:
    """Normalize npm/PyPI package metadata as a developer adoption signal."""

    normalized_ecosystem = ecosystem.strip().lower()
    if normalized_ecosystem not in {"npm", "pypi"}:
        raise ValueError("ecosystem must be 'npm' or 'pypi'")

    info = package.get("info", {})
    info = info if isinstance(info, Mapping) else {}
    name = package.get("name") or info.get("name")
    version = package.get("version") or info.get("version")
    url = package.get("url") or package.get("project_url")
    if not url and name:
        base_url = "https://www.npmjs.com/package" if normalized_ecosystem == "npm" else "https://pypi.org/project"
        url = f"{base_url}/{name}"

    return enrich_event_with_source_metadata({
        "external_id": str(package.get("id") or f"{name}:{version}"),
        "source": normalized_ecosystem,
        "title": name,
        "body": package.get("description") or info.get("summary"),
        "url": url,
        "author": package.get("author") or package.get("maintainer"),
        "published_at": package.get("published_at") or package.get("upload_time"),
        "package_name": name,
        "version": version,
        "downloads": package.get("downloads"),
        "raw_json": dict(package),
    })


def parse_official_blog_post(post: Mapping[str, Any], publisher: str) -> dict[str, Any]:
    """Normalize a first-party blog, changelog, or press-room post."""

    url = post.get("url") or post.get("link")
    external_id = post.get("id") or post.get("guid") or url
    return enrich_event_with_source_metadata({
        "external_id": str(external_id),
        "source": "official_blog",
        "title": post.get("title"),
        "body": post.get("summary") or post.get("content") or post.get("description"),
        "url": url,
        "author": post.get("author") or publisher,
        "published_at": post.get("published_at") or post.get("published"),
        "publisher": publisher,
        "raw_json": dict(post),
    })
