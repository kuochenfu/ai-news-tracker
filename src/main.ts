import './style.css';
import { computeTrendScore } from './core/trendScoring';

const sample = computeTrendScore({
  hnDiscussionScore: 0.8,
  xVelocityScore: 0.5,
  githubAdoptionScore: 0.6,
  noveltyScore: 1,
  credibilityScore: 0.4
});

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main>
    <h1>AI News Tracker (TypeScript)</h1>
    <p>Ready for GitHub Pages deployment via GitHub Actions.</p>

    <section>
      <h2>Trend Score Demo</h2>
      <ul>
        <li>Final Score: <strong>${sample.finalScore.toFixed(2)}</strong></li>
        <li>Verdict: <strong>${sample.verdict}</strong></li>
      </ul>
    </section>
  </main>
`;
