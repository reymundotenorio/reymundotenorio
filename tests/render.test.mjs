import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { headerSvg, statsSvg, languageSvg, readme } from '../scripts/render.mjs';
const data = JSON.parse(readFileSync(new URL('../metrics.json', import.meta.url), 'utf8'));
test('every chart variant preserves real totals, labels and portable script-free SVG', () => {
  for (const lang of ['en', 'es']) for (const theme of ['dark', 'light']) for (const mobile of [false, true]) {
    for (const svg of [headerSvg(data, lang, theme, mobile), statsSvg(data, lang, theme, mobile), languageSvg(data, lang, theme, mobile)]) {
      assert.match(svg, new RegExp(`viewBox="0 0 ${mobile ? 360 : 900} `));
      assert.doesNotMatch(svg, /<script|foreignObject|onload=|(?:href|src)=["']https?:\/\//i);
      assert.match(svg, /prefers-reduced-motion/);
    }
    const fixture = structuredClone(data);
    Object.assign(fixture.lifetime, { authoredPullRequests: 20, reviewedPullRequests: 30, mergedPullRequests: 18 });
    const stats = statsSvg(fixture, lang, theme, mobile);
    assert(stats.includes('>20</text>') && stats.includes('>30</text>') && stats.includes('>18</text>'));
    assert(stats.includes(lang === 'en' ? 'PRs reviewed' : 'PRs revisados'));
    assert(!stats.includes('commits'));
  }
});
test('chart labels escape markup instead of allowing injected SVG', () => {
  const altered = structuredClone(data);
  altered.languages.items[0].name = '<script>alert("x")</script>';
  const svg = languageSvg(altered, 'en', 'dark', false);
  assert(!svg.includes('<script>'));
  assert(svg.includes('&lt;script&gt;'));
});
test('README is native GitHub-compatible content with real links and both responsive themes', () => {
  for (const lang of ['en', 'es']) {
    const html = readme(data, lang);
    assert.match(html, /<picture>/);
    assert.match(html, /prefers-color-scheme: dark/);
    assert.match(html, /max-width: 900px/);
    assert.match(html, /https:\/\/reymundotenorio.github.io\//);
    assert.doesNotMatch(html, /<script|<style|onclick=|mailto:|tel:|token|SAML|intermediary|\/Users\//i);
    assert(html.includes(lang === 'en' ? 'README.es.md' : 'README.md'));
  }
});
