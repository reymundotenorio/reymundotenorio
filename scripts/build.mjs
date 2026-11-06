import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { headerSvg, statsSvg, languageSvg, readme } from './render.mjs';
import { validateSnapshot, validatePublication } from './validate.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = validateSnapshot(JSON.parse(await readFile(`${root}metrics.json`, 'utf8')));
await mkdir(`${root}assets`, { recursive: true });
let count = 0;
for (const theme of ['dark', 'light']) for (const size of ['desktop', 'tablet', 'mobile']) {
  for (const [name, render] of [['header', headerSvg], ['activity', statsSvg], ['languages', languageSvg]]) {
    await writeFile(`${root}assets/${name}-en-${theme}${size === 'desktop' ? '' : `-${size}`}.svg`, render(data, theme, size));
    count++;
  }
}
await writeFile(`${root}README.md`, readme(data));
for (const name of await readdir(`${root}assets`)) {
  if (/^(header|activity|languages)-es-(dark|light)(-mobile)?\.svg$/.test(name)) await rm(`${root}assets/${name}`);
}
await rm(`${root}README.es.md`, { force: true });
await validatePublication(root);
console.log(JSON.stringify({ generated: count, locale: 'en', updatedDate: data.updatedDate }));
