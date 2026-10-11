import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { escapeHtml, renderMarkdown } from './markdown';

describe('server Markdown rendering', () => {
  it('renders the supported article structure', () => {
    const html = renderMarkdown(
      '# Heading\n\nA **bold** [link](https://example.com).\n\n- First\n- Second\n\n> Useful quote\n\n```\nconst safe = true;\n```'
    );

    assert.match(html, /<h1>Heading<\/h1>/);
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /href="https:\/\/example\.com\/"/);
    assert.match(html, /<ul><li>First<\/li><li>Second<\/li><\/ul>/);
    assert.match(html, /<blockquote>Useful quote<\/blockquote>/);
    assert.match(html, /<pre><code>const safe = true;<\/code><\/pre>/);
  });

  it('escapes raw HTML and rejects unsafe link protocols', () => {
    const html = renderMarkdown('<script>alert(1)</script> [bad](javascript:alert(1))');

    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /href="javascript:/);
  });

  it('escapes generated metadata values', () => {
    assert.equal(escapeHtml('Ideas & <learning>'), 'Ideas &amp; &lt;learning&gt;');
  });
});
