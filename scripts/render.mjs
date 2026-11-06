import { readFileSync } from 'node:fs';
const font = readFileSync(new URL('../sources/geist-mono.woff2', import.meta.url)).toString('base64');
export const palettes = {
  dark: { bg: '#0d1117', text: '#e6edf3', muted: '#a6adb7', line: '#30363d', mint: '#61ffca', violet: '#a277ff', amber: '#ffd24a' },
  light: { bg: '#ffffff', text: '#202126', muted: '#555965', line: '#d0d7de', mint: '#087456', violet: '#6940b3', amber: '#886300' },
};
const widths = { desktop: 720, tablet: 540, mobile: 360 };
export const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const n = value => new Intl.NumberFormat('en-US').format(value);
const compact = value => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
const text = (x, y, value, size = 13, fill = 'text', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="var(--${fill})" ${extra}>${escape(value)}</text>`;
const css = `@font-face{font-family:ProfileMono;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-style:normal}svg text{font-family:ProfileMono,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.cursor{animation:blink 1.15s steps(1) infinite}.bar{transform-box:fill-box;transform-origin:center bottom;animation:grow .65s cubic-bezier(.2,.8,.2,1) both}.count-step{opacity:0;animation:count-step 120ms steps(1);animation-delay:calc(var(--delay,0ms) + var(--step)*120ms)}.count-final{opacity:1;animation:count-finish 720ms steps(1) both;animation-delay:var(--delay,0ms)}@keyframes blink{50%{opacity:.15}}@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes count-step{0%,99%{opacity:1}100%{opacity:0}}@keyframes count-finish{0%,99%{opacity:0}100%{opacity:1}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;

function shell(width, height, theme, title, description, content, framed = true) {
  const p = palettes[theme];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(description)}</desc><style>text{font-weight:400;letter-spacing:0}${css}</style>${framed ? `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="6" fill="var(--bg)" stroke="var(--line)"/>` : ''}${content}</svg>`;
  return svg.replace(/var\(--(bg|text|muted|line|mint|violet|amber)\)/g, (_, color) => p[color]);
}
function mark(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><rect class="cursor" x="3" y="3" width="8" height="42" rx="2" fill="var(--mint)"/><path d="M17 7 34 15 17 23" fill="none" stroke="var(--violet)" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="m18 31 10 10" stroke="var(--amber)" stroke-width="8" stroke-linecap="round"/></g>`;
}
function counter(x, y, value, color, delay) {
  // The final value remains visible when animation is disabled; README images need no JavaScript.
  const steps = Array.from({ length: 6 }, (_, step) => `<g class="count-step" style="--step:${step}" aria-hidden="true">${text(x, y, n(Math.round(value * step / 6)), 26, color)}</g>`).join('');
  return `<g style="--delay:${delay}ms">${steps}<g class="count-final">${text(x, y, n(value), 26, color)}</g></g>`;
}

export function headerSvg(data, theme = 'dark', size = 'desktop') {
  const width = widths[size], mobile = size === 'mobile';
  const titleX = width / 2 - (mobile ? 92 : 116);
  let body = mark(titleX - 39, 21, mobile ? .66 : .72);
  body += text(titleX, 43, 'Reymundo Tenorio', mobile ? 23 : 28);
  body += text(width / 2, 65, 'Software Engineer', 13, 'violet', 'text-anchor="middle"');
  body += text(width / 2, 91, `Building on GitHub since ${data.since}`, 12, 'muted', 'text-anchor="middle"');
  body += `<path d="M20 103H${width - 20}" stroke="var(--line)"/>`;
  return shell(width, 104, theme, 'Reymundo Tenorio / Software Engineer', 'Web and mobile products, applied AI and automation.', body, false);
}

export function statsSvg(data, theme = 'dark', size = 'desktop') {
  const width = widths[size], mobile = size === 'mobile', desktop = size === 'desktop', pad = 20;
  const range = `${data.years[0].year} - ${data.years.at(-1).year}`;
  const columns = desktop ? 4 : 2, rowGap = 62, numberY = mobile ? 81 : 69;
  const lineY = numberY + (desktop ? 0 : rowGap) + 43;
  const titleY = lineY + 25, legendY = titleY + (mobile ? 22 : 0);
  const base = titleY + (mobile ? 107 : 87), height = base + 72;
  let body = text(pad, 27, 'GitHub activity', 14);
  body += text(mobile ? pad : width - pad, mobile ? 47 : 27, `All time / ${range}`, 11, 'muted', mobile ? '' : 'text-anchor="end"');
  const metrics = [
    [data.lifetime.contributions, 'Contributions', 'mint'],
    [data.lifetime.authoredPullRequests, 'PRs authored', 'text'],
    [data.lifetime.reviewedPullRequests, 'PRs reviewed', 'violet'],
    [data.lifetime.mergedPullRequests, 'PRs merged', 'amber'],
  ];
  metrics.forEach(([value, label, color], i) => {
    const x = pad + (i % columns) * (width - pad * 2) / columns;
    const y = numberY + Math.floor(i / columns) * rowGap;
    body += counter(x, y, value, color, i * 45);
    body += text(x, y + 21, label, 13, 'muted');
  });
  body += `<path d="M${pad} ${lineY}H${width - pad}" stroke="var(--line)"/>`;
  body += text(pad, titleY, 'Contribution history', 13);
  const legendX = mobile ? pad : width - 192;
  body += `<circle cx="${legendX + 3}" cy="${legendY - 4}" r="3" fill="var(--mint)"/>` + text(legendX + 12, legendY, 'Public', 10, 'muted');
  body += `<circle cx="${legendX + 94}" cy="${legendY - 4}" r="3" fill="var(--violet)"/>` + text(legendX + 103, legendY, 'Private', 10, 'muted');
  const graphHeight = 50, step = (width - pad * 2) / data.years.length, barWidth = Math.min(desktop ? 27 : 21, step * .6);
  const max = Math.max(...data.years.map(year => year.contributions), 1);
  body += `<path d="M${pad} ${base + .5}H${width - pad}" stroke="var(--line)"/>`;
  data.years.forEach((year, i) => {
    const x = pad + step * i + (step - barWidth) / 2;
    const h = year.contributions / max * graphHeight, privateHeight = year.privateContributions / max * graphHeight, publicHeight = h - privateHeight;
    body += `<g class="bar" style="animation-delay:${i * 18}ms"><title>${year.year}: ${year.contributions} contributions, ${year.privateContributions} private</title><rect x="${x}" y="${base - publicHeight}" width="${barWidth}" height="${publicHeight}" fill="var(--mint)"/><rect x="${x}" y="${base - h}" width="${barWidth}" height="${privateHeight}" fill="var(--violet)" rx="1"/></g>`;
    body += text(x + barWidth / 2, base - h - 7, compact(year.contributions), mobile ? 9 : 10, 'muted', 'text-anchor="middle"');
    body += text(x + barWidth / 2, base + 18, desktop ? year.year : String(year.year).slice(-2), 10, i === data.years.length - 1 ? 'amber' : 'muted', 'text-anchor="middle"');
  });
  body += text(pad, base + 43, `${n(data.activity.contributions)} contributions / last 12 months`, 12);
  body += text(pad, base + 63, `${n(data.activity.activeDays)} active days / ${n(data.activity.privateContributions)} private`, 11, 'muted');
  return shell(width, height, theme, `GitHub activity / ${range}`, `Personal and organization activity. ${metrics.map(([value, label]) => `${label}: ${value}`).join('. ')}. Last 12 months: ${data.activity.contributions} contributions.`, body);
}

export function languageSvg(data, theme = 'dark', size = 'desktop') {
  const width = widths[size], desktop = size === 'desktop', mobile = size === 'mobile', pad = 20;
  const columns = desktop ? 3 : 2, height = desktop ? 142 : mobile ? 200 : 184;
  const p = palettes[theme];
  const colors = theme === 'dark' ? [p.violet, p.amber, p.mint, '#ff8a8a', '#7bb6ff', p.muted] : [p.violet, p.amber, p.mint, '#a53545', '#245da3', p.muted];
  const rows = data.languages.items.slice(0, 5).map(item => ({ ...item }));
  const remainder = Math.round((100 - rows.reduce((sum, row) => sum + row.share, 0)) * 10) / 10;
  if (remainder > 0) rows.push({ name: 'Other', share: remainder });
  let body = text(pad, 27, 'Repository footprint', 14);
  body += text(mobile ? pad : width - pad, mobile ? 47 : 27, `${data.languages.repositories} repos analyzed`, 11, 'muted', mobile ? '' : 'text-anchor="end"');
  let x = pad;
  const barY = mobile ? 65 : 46, firstY = mobile ? 100 : 80, colWidth = (width - pad * 2) / columns;
  rows.forEach((row, i) => {
    const segment = row.share / 100 * (width - pad * 2);
    body += `<rect x="${x}" y="${barY}" width="${segment}" height="8" fill="${colors[i]}"/>`; x += segment;
    const start = pad + (i % columns) * colWidth, y = firstY + Math.floor(i / columns) * 29;
    body += `<circle cx="${start + 3}" cy="${y - 4}" r="3" fill="${colors[i]}"/>`;
    body += text(start + 12, y, row.name, row.name.length > 13 ? 10 : 12);
    body += text(start + colWidth - 14, y, `${row.share.toFixed(1)}%`, 11, 'muted', 'text-anchor="end"');
  });
  body += text(pad, height - 17, 'Code bytes, not a skill rating', 10, 'muted');
  return shell(width, height, theme, 'Repository footprint', `${data.languages.repositories} repositories analyzed. ${rows.map(row => `${row.name}: ${row.share}%`).join(', ')}. Code bytes, not a skill rating.`, body);
}

function picture(kind, alt) {
  const source = (media, suffix) => `  <source media="${media}" srcset="./assets/${kind}-en-${suffix}.svg">`;
  return `<p align="center"><picture>\n${source('(prefers-color-scheme: dark) and (max-width: 480px)', 'dark-mobile')}\n${source('(prefers-color-scheme: dark) and (max-width: 800px)', 'dark-tablet')}\n${source('(prefers-color-scheme: dark)', 'dark')}\n${source('(max-width: 480px)', 'light-mobile')}\n${source('(max-width: 800px)', 'light-tablet')}\n  <img src="./assets/${kind}-en-light.svg" alt="${escape(alt)}">\n</picture></p>`;
}
export function readme(data) {
  const update = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${data.updatedDate}T12:00:00Z`));
  return `${picture('header', 'Reymundo Tenorio / Software Engineer')}

<p>I build web and mobile products, integrate AI into real workflows, and automate the work around them.</p>

<p><a href="https://reymundotenorio.github.io/en/"><strong>Explore my portfolio ↗</strong></a> &nbsp;&middot;&nbsp; <a href="https://www.linkedin.com/in/reymundotenorio/">LinkedIn</a></p>

<p><code>TypeScript</code> &middot; <code>React</code> &middot; <code>React Native</code> &middot; <code>Node.js</code> &middot; <code>PHP</code> &middot; <code>WordPress</code> &middot; <code>Go</code></p>

${picture('activity', `GitHub activity: ${n(data.lifetime.contributions)} contributions, ${data.lifetime.authoredPullRequests} PRs authored, ${data.lifetime.reviewedPullRequests} PRs reviewed, ${data.lifetime.mergedPullRequests} PRs merged. Personal and organization activity.`)}

${picture('languages', `Repository footprint: ${data.languages.repositories} repos analyzed. ${data.languages.items.slice(0, 5).map(item => `${item.name} ${item.share}%`).join(', ')}. Code bytes, not a skill rating.`)}

<details>
<summary>About these numbers</summary>
<p>All-time PR totals and yearly contribution history include personal and organization activity available to the GitHub API. Reviewed PRs are distinct pull requests reviewed, excluding my own. Contributions are not a commit count.</p>
<p>The language mix measures code bytes in owned non-fork repositories and repositories GitHub identifies as recently contributed to. It is not a measure of skill or personal authorship.</p>
<p>Snapshot: ${update}. Visual direction inspired by <a href="https://github.com/stats-organization/github-stats-extended">GitHub Stats Extended</a>.</p>
</details>
`;
}
