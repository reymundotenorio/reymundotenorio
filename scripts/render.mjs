import { readFileSync } from 'node:fs';
const font = readFileSync(new URL('../sources/geist-mono.woff2', import.meta.url)).toString('base64');
export const palettes = {
  dark: { bg: '#111214', text: '#eeeef2', muted: '#aaaab5', line: '#33353e', mint: '#61ffca', violet: '#a277ff', amber: '#ffd24a' },
  light: { bg: '#ffffff', text: '#202126', muted: '#555965', line: '#dce0e6', mint: '#087456', violet: '#6940b3', amber: '#886300' },
};
const words = {
  en: { activity: 'GitHub activity', allTime: 'All time', contributions: 'Contributions', authored: 'PRs authored', reviewed: 'PRs reviewed', merged: 'PRs merged', scope: 'Personal + organization activity', history: 'Contribution history', public: 'Public', private: 'Private', recent: 'last 12 months', activeDays: 'active days', footprint: 'Repository footprint', analyzed: 'repos analyzed', bytes: 'Code bytes, not a skill rating', other: 'Other' },
  es: { activity: 'Actividad en GitHub', allTime: 'Hasta hoy', contributions: 'Contribuciones', authored: 'PRs creados', reviewed: 'PRs revisados', merged: 'PRs fusionados', scope: 'Actividad personal y de organizaciones', history: 'Historial de contribuciones', public: 'Públicas', private: 'Privadas', recent: 'últimos 12 meses', activeDays: 'días activos', footprint: 'Huella de repositorios', analyzed: 'repos analizados', bytes: 'Bytes de código, no nivel de dominio', other: 'Otros' },
};
export const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const n = (value, lang = 'en') => new Intl.NumberFormat(lang === 'es' ? 'es-NI' : 'en-US').format(value);
const compact = value => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
const text = (x, y, value, size = 14, fill = 'text', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="var(--${fill})" ${extra}>${escape(value)}</text>`;
const css = `@font-face{font-family:ProfileMono;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-style:normal}svg text{font-family:ProfileMono,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.cursor{animation:blink 1.15s steps(1) infinite}.bar{transform-box:fill-box;transform-origin:center bottom;animation:grow .8s cubic-bezier(.2,.8,.2,1) both}@keyframes blink{50%{opacity:.15}}@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;
function shell(width, height, theme, title, description, content, framed = true) {
  const p = palettes[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(description)}</desc><style>svg{${Object.entries(p).map(([key, value]) => `--${key}:${value}`).join(';')};font-family:ui-monospace,SFMono-Regular,Consolas,monospace}text{font-weight:400;letter-spacing:0}${css}</style>${framed ? `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="6" fill="var(--bg)" stroke="var(--line)"/>` : ''}${content}</svg>`;
}
function mark(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><rect class="cursor" x="3" y="3" width="8" height="42" rx="2" fill="var(--mint)"/><path d="M17 7 34 15 17 23" fill="none" stroke="var(--violet)" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="m18 31 10 10" stroke="var(--amber)" stroke-width="8" stroke-linecap="round"/></g>`;
}
export function headerSvg(data, lang, theme, mobile) {
  const width = mobile ? 360 : 900, height = mobile ? 235 : 210;
  let body = text(mobile ? 20 : 28, 26, '~/reymundo', 12, 'mint') + text(mobile ? 110 : 118, 26, '/ profile', 12, 'muted');
  body += mark(mobile ? 20 : 28, mobile ? 64 : 66, mobile ? 1.1 : 1.35);
  if (mobile) {
    body += text(82, 94, 'Reymundo', 31) + text(82, 132, 'Tenorio', 31);
    body += text(82, 162, 'Software Engineer', 14, 'violet');
    body += text(20, 202, lang === 'en' ? `Building on GitHub since ${data.since}` : `En GitHub desde ${data.since}`, 12, 'muted');
  } else {
    body += text(106, 110, 'Reymundo Tenorio', 43) + text(106, 146, 'Software Engineer', 17, 'violet');
    body += text(872, 146, lang === 'en' ? `On GitHub since ${data.since}` : `En GitHub desde ${data.since}`, 12, 'muted', 'text-anchor="end"');
    body += text(28, 186, lang === 'en' ? 'Web & mobile products. Applied AI. Automation.' : 'Productos web y móviles. IA aplicada. Automatización.', 13, 'muted');
  }
  body += `<path d="M${mobile ? 20 : 28} ${height - 1}H${width - (mobile ? 20 : 28)}" stroke="var(--line)"/>`;
  return shell(width, height, theme, 'Reymundo Tenorio / Software Engineer', lang === 'en' ? 'Terminal R identity. Web and mobile products, applied AI and automation.' : 'Identidad Terminal R. Productos web y móviles, IA aplicada y automatización.', body, false);
}
export function statsSvg(data, lang, theme, mobile) {
  const w = words[lang], width = mobile ? 360 : 900, height = mobile ? 602 : 485;
  const pad = mobile ? 20 : 28;
  const range = `${data.years[0].year} - ${data.years.at(-1).year}`;
  let body = text(pad, 35, w.activity, mobile ? 17 : 18);
  body += text(mobile ? pad : width - pad, mobile ? 58 : 35, `${w.allTime} / ${range}`, 12, 'muted', mobile ? '' : 'text-anchor="end"');
  const metrics = [
    [data.lifetime.contributions, w.contributions, 'mint'],
    [data.lifetime.authoredPullRequests, w.authored, 'text'],
    [data.lifetime.reviewedPullRequests, w.reviewed, 'violet'],
    [data.lifetime.mergedPullRequests, w.merged, 'amber'],
  ];
  metrics.forEach(([value, label, color], i) => {
    const x = mobile ? pad + (i % 2) * 167 : pad + i * 214;
    const y = mobile ? 111 + Math.floor(i / 2) * 87 : 102;
    body += text(x, y, n(value, lang), mobile ? 33 : 43, color);
    body += text(x, y + 28, label, 15, 'muted');
  });
  body += text(pad, mobile ? 254 : 163, w.scope, mobile ? 12 : 13, 'muted');
  const lineY = mobile ? 277 : 186, titleY = mobile ? 309 : 224;
  body += `<path d="M${pad} ${lineY}H${width - pad}" stroke="var(--line)"/>`;
  body += text(pad, titleY, w.history, mobile ? 14 : 15);
  const legendY = mobile ? 334 : titleY;
  const legendX = mobile ? pad : 665;
  body += `<circle cx="${legendX + 4}" cy="${legendY - 4}" r="3.5" fill="var(--mint)"/>` + text(legendX + 14, legendY, w.public, 11, 'muted');
  body += `<circle cx="${legendX + 105}" cy="${legendY - 4}" r="3.5" fill="var(--violet)"/>` + text(legendX + 115, legendY, w.private, 11, 'muted');
  const base = mobile ? 483 : 384, graphHeight = mobile ? 121 : 125;
  const step = (width - pad * 2) / data.years.length, barWidth = mobile ? 16 : 38;
  const max = Math.max(...data.years.map(year => year.contributions), 1);
  body += `<path d="M${pad} ${base + .5}H${width - pad}" stroke="var(--line)"/>`;
  data.years.forEach((year, i) => {
    const x = pad + step * i + (step - barWidth) / 2;
    const h = year.contributions / max * graphHeight, privateHeight = year.privateContributions / max * graphHeight;
    const publicHeight = h - privateHeight;
    body += `<g class="bar" style="animation-delay:${i * 24}ms"><title>${year.year}: ${year.contributions} ${escape(w.contributions)}, ${year.privateContributions} ${escape(w.private)}</title><rect x="${x}" y="${base - publicHeight}" width="${barWidth}" height="${publicHeight}" fill="var(--mint)"/><rect x="${x}" y="${base - h}" width="${barWidth}" height="${privateHeight}" fill="var(--violet)" rx="1"/></g>`;
    body += text(x + barWidth / 2, base - h - 9, compact(year.contributions), mobile ? 9 : 11, 'muted', 'text-anchor="middle"');
    body += text(x + barWidth / 2, base + 23, mobile ? String(year.year).slice(-2) : year.year, mobile ? 11 : 12, i === data.years.length - 1 ? 'amber' : 'muted', 'text-anchor="middle"');
  });
  const summaryY = mobile ? 543 : 445;
  body += text(pad, summaryY, `${n(data.activity.contributions, lang)} ${w.contributions.toLowerCase()} / ${w.recent}`, mobile ? 12 : 14);
  body += text(pad, summaryY + 26, `${n(data.activity.activeDays, lang)} ${w.activeDays} / ${n(data.activity.privateContributions, lang)} ${w.private.toLowerCase()}`, 12, 'muted');
  const desc = `${range}. ${metrics.map(([value, label]) => `${label}: ${value}`).join('. ')}. ${w.recent}: ${data.activity.contributions}.`;
  return shell(width, height, theme, `${w.activity} / ${range}`, desc, body);
}
export function languageSvg(data, lang, theme, mobile) {
  const w = words[lang], width = mobile ? 360 : 900, height = mobile ? 294 : 224;
  const colors = ['#a277ff', '#ffd24a', '#61ffca', '#ff8a8a', '#7bb6ff', '#a9abb5'];
  const p = palettes[theme];
  const safeColors = theme === 'dark' ? colors : [p.violet, p.amber, p.mint, '#a53545', '#245da3', p.muted];
  const rows = data.languages.items.slice(0, 5).map(item => ({ ...item }));
  const remainder = Math.round((100 - rows.reduce((sum, row) => sum + row.share, 0)) * 10) / 10;
  if (remainder > 0) rows.push({ name: w.other, share: remainder });
  const pad = mobile ? 20 : 28;
  let body = text(pad, 35, w.footprint, mobile ? 17 : 18);
  body += text(mobile ? pad : width - pad, mobile ? 59 : 35, `${data.languages.repositories} ${w.analyzed}`, 12, 'muted', mobile ? '' : 'text-anchor="end"');
  let x = pad;
  rows.forEach((row, i) => {
    const segment = row.share / 100 * (width - pad * 2);
    body += `<rect x="${x}" y="${mobile ? 81 : 64}" width="${segment}" height="14" fill="${safeColors[i]}"/>`;
    x += segment;
    const colWidth = mobile ? 167 : 285;
    const col = i % (mobile ? 2 : 3), line = Math.floor(i / (mobile ? 2 : 3));
    const start = pad + col * colWidth, y = (mobile ? 130 : 121) + line * 43;
    body += `<circle cx="${start + 4}" cy="${y - 4}" r="3.5" fill="${safeColors[i]}"/>`;
    body += text(start + 14, y, row.name, mobile ? 13 : 14);
    body += text(start + (mobile ? 146 : 249), y, `${row.share.toFixed(1)}%`, mobile ? 11 : 13, 'muted', 'text-anchor="end"');
  });
  body += text(pad, height - 22, w.bytes, mobile ? 11 : 12, 'muted');
  return shell(width, height, theme, w.footprint, `${w.analyzed}: ${data.languages.repositories}. ${w.bytes}. ${rows.map(row => `${row.name}: ${row.share}%`).join(', ')}`, body);
}

function picture(kind, lang, alt) {
  return `<picture>\n  <source media="(prefers-color-scheme: dark) and (max-width: 900px)" srcset="./assets/${kind}-${lang}-dark-mobile.svg">\n  <source media="(prefers-color-scheme: dark)" srcset="./assets/${kind}-${lang}-dark.svg">\n  <source media="(max-width: 900px)" srcset="./assets/${kind}-${lang}-light-mobile.svg">\n  <img src="./assets/${kind}-${lang}-light.svg" width="900" alt="${escape(alt)}">\n</picture>`;
}
export function readme(data, lang) {
  const en = lang === 'en', w = words[lang];
  const update = new Intl.DateTimeFormat(en ? 'en-US' : 'es-NI', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${data.updatedDate}T12:00:00Z`));
  return `<p align="right"><a href="./${en ? 'README.es.md' : 'README.md'}">${en ? 'Español' : 'English'}</a></p>

${picture('header', lang, 'Reymundo Tenorio / Software Engineer')}

<p>${en ? 'I build web and mobile products, integrate AI into real workflows, and automate the work around them.' : 'Desarrollo productos web y móviles, integro IA en flujos reales y automatizo procesos.'}</p>

<p><a href="https://reymundotenorio.github.io/${lang}/"><strong>${en ? 'Explore my portfolio' : 'Explorar mi portfolio'} ↗</strong></a> &nbsp;&middot;&nbsp; <a href="https://www.linkedin.com/in/reymundotenorio/">LinkedIn</a></p>

<p><code>TypeScript</code> &middot; <code>React</code> &middot; <code>React Native</code> &middot; <code>Node.js</code> &middot; <code>PHP</code> &middot; <code>WordPress</code> &middot; <code>Go</code></p>

${picture('activity', lang, `${w.activity}: ${n(data.lifetime.contributions, lang)} ${w.contributions.toLowerCase()}, ${data.lifetime.authoredPullRequests} ${w.authored}, ${data.lifetime.reviewedPullRequests} ${w.reviewed}, ${data.lifetime.mergedPullRequests} ${w.merged}. ${w.scope}.`)}

${picture('languages', lang, `${w.footprint}: ${data.languages.repositories} ${w.analyzed}. ${data.languages.items.slice(0, 5).map(item => `${item.name} ${item.share}%`).join(', ')}. ${w.bytes}.`)}

<details>
<summary>${en ? 'About these numbers' : 'Sobre estas cifras'}</summary>
<p>${en ? 'All-time PR totals and yearly contribution history include personal and organization activity available to the GitHub API. Reviewed PRs are distinct pull requests reviewed, excluding my own. Contributions are not a commit count.' : 'Los totales históricos de PRs y contribuciones incluyen la actividad personal y de organizaciones disponible en la API de GitHub. Los PRs revisados son solicitudes distintas, sin incluir las propias. Las contribuciones no equivalen a commits.'}</p>
<p>${en ? 'The language mix measures code bytes in owned non-fork repositories and repositories GitHub identifies as recently contributed to. It is not a measure of skill or personal authorship.' : 'La mezcla de lenguajes mide bytes de código en repos propios que no son forks y en repos que GitHub identifica con contribuciones recientes. No mide dominio ni autoría personal.'}</p>
<p>${en ? 'Snapshot' : 'Actualizado'}: ${update}. ${en ? 'Visual direction inspired by' : 'Referencia de estadísticas'} <a href="https://github.com/stats-organization/github-stats-extended">GitHub Stats Extended</a>.</p>
</details>
`;
}
