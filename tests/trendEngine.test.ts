import { describe, expect, it } from 'vitest';
import { parseGithubRepo, parseHnStory, parseXPost } from '../src/core/sources';
import { classifyVerdict, computeTrendScore } from '../src/core/trendScoring';

describe('trend scoring and normalizers', () => {
  it('computes trend formula', () => {
    const result = computeTrendScore({
      hnDiscussionScore: 0.8,
      xVelocityScore: 0.5,
      githubAdoptionScore: 0.6,
      noveltyScore: 1,
      credibilityScore: 0.4
    });

    expect(Number(result.finalScore.toFixed(3))).toBe(0.66);
    expect(result.verdict).toBe('watchlist');
  });

  it('clamps inputs', () => {
    const result = computeTrendScore({
      hnDiscussionScore: 2,
      xVelocityScore: -5,
      githubAdoptionScore: 1,
      noveltyScore: 1,
      credibilityScore: 1
    });
    expect(Number(result.finalScore.toFixed(2))).toBe(0.7);
  });

  it('supports verdict bands', () => {
    expect(classifyVerdict(0.2)).toBe('likely-hype');
    expect(classifyVerdict(0.4)).toBe('emerging');
    expect(classifyVerdict(0.55)).toBe('watchlist');
    expect(classifyVerdict(0.8)).toBe('high-confidence');
  });

  it('normalizes source payloads', () => {
    const hn = parseHnStory({ id: 1, title: 'T', by: 'a', score: 10, descendants: 3 });
    expect(hn.external_id).toBe('1');
    expect(hn.source).toBe('hn');

    const x = parseXPost(
      {
        id: '20',
        author_id: 'u1',
        text: 'new model',
        created_at: '2026-04-25T00:00:00Z',
        public_metrics: { like_count: 5, retweet_count: 2, reply_count: 1, quote_count: 0 }
      },
      { users: [{ id: 'u1', username: 'alice' }] }
    );
    expect(x.author).toBe('alice');
    expect(x.repost_count).toBe(2);

    const gh = parseGithubRepo({
      id: 99,
      full_name: 'openai/openai-python',
      owner: { login: 'openai' },
      stargazers_count: 100,
      forks_count: 11
    });
    expect(gh.source).toBe('github');
    expect(gh.stars).toBe(100);
  });
});
