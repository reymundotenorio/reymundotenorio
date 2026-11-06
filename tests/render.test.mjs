import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { headerSvg, statsSvg, languageSvg, readme } from '../scripts/render.mjs';
const data = JSON.parse(readFileSync(new URL('../metrics.json', import.meta.url), 'utf8'));
test('every chart variant preserves real totals, labels and portable script-free SVG', () => {
  for (const theme of ['dark', 'light']) for (const [size, width] of [['desktop', 720], ['tablet', 540], ['mobile', 360]]) {
    for (const svg of [headerSvg(data, theme, size), statsSvg(data, theme, size), languageSvg(data, theme, size)]) {
      assert.match(svg, new RegExp(`viewBox="0 0 ${width} `));
      assert.doesNotMatch(svg, /<script|foreignObject|onload=|(?:href|src)=["']https?:\/\//i);
      assert.match(svg, /prefers-reduced-motion/);
    }
    const fixture = structuredClone(data);
    Object.assign(fixture.lifetime, { authoredPullRequests: 20, reviewedPullRequests: 30, mergedPullRequests: 18 });
    const stats = statsSvg(fixture, theme, size);
    assert(stats.includes('>20</text>') && stats.includes('>30</text>') && stats.includes('>18</text>'));
    assert(stats.includes('PRs reviewed'));
    assert(!stats.includes('commits'));
  }
});
test('chart labels escape markup instead of allowing injected SVG', () => {
  const altered = structuredClone(data);
  altered.languages.items[0].name = '<script>alert("x")</script>';
  const svg = languageSvg(altered, 'dark', 'desktop');
  assert(!svg.includes('<script>'));
  assert(svg.includes('&lt;script&gt;'));
});
test('role and GitHub tenure stay centered in every header layout', () => {
  for (const theme of ['dark', 'light']) for (const [size, width] of [['desktop', 720], ['tablet', 540], ['mobile', 360]]) {
    const svg = headerSvg(data, theme, size);
    for (const label of ['Software Engineer', `Building on GitHub since ${data.since}`]) {
      assert(new RegExp(`<text x="${width / 2}"[^>]*text-anchor="middle"[^>]*>${label}</text>`).test(svg), `${label} must be centered in ${size}/${theme}`);
    }
  }
});
test('README is native GitHub-compatible content with real links and both responsive themes', () => {
    const html = readme(data);
    assert.match(html, /<picture>/);
    assert.match(html, /prefers-color-scheme: dark/);
    assert.match(html, /max-width: 480px/);
    assert.match(html, /max-width: 800px/);
    assert.match(html, /https:\/\/reymundotenorio.github.io\//);
    assert.doesNotMatch(html, /<script|<style|onclick=|mailto:|tel:|token|SAML|intermediary|\/Users\//i);
    assert.doesNotMatch(html, /Español|README\.es\.md/);
    assert.doesNotMatch(html, /<img[^>]*width=/);
});
