import assert from "node:assert/strict";
import test from "node:test";

import { decodeEntities, parseDate, parseFeed } from "../src/pipeline/feed";

test("decodes named and numeric entities without double-decoding", () => {
  assert.equal(decodeEntities("Anthropic&#8217;s &amp;lt;b&amp;gt; &#x201C;AI&#x201D;"), "Anthropic’s &lt;b&gt; “AI”");
  assert.equal(decodeEntities("<![CDATA[<p>Hello <b>world</b></p>]]>"), "Hello world");
});

test("RSS items without a title are skipped; feed order is kept", () => {
  const xml = `<rss><channel>
    <item><title></title><link>https://a.example/1</link></item>
    <item><title>First AI story</title><link>https://a.example/2</link><pubDate>Thu, 08 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>Second</title><link>https://a.example/3</link></item>
  </channel></rss>`;
  const items = parseFeed(xml, "techcrunch");
  assert.deepEqual(items.map((item) => item.title), ["First AI story", "Second"]);
  assert.deepEqual(items.map((item) => item.feedIndex), [1, 2]);
  assert.equal(items[0].publishedAt, "2026-10-08T10:00:00.000Z");
});

test("missing or broken dates become null instead of the refresh time", () => {
  assert.equal(parseDate(undefined), null);
  assert.equal(parseDate("yesterday-ish"), null);
  const xml = `<feed><entry><title>Atom entry</title><link rel="alternate" href="https://b.example/x"/></entry></feed>`;
  const [entry] = parseFeed(xml, "official_blog");
  assert.equal(entry.publishedAt, null);
  assert.equal(entry.url, "https://b.example/x");
});
