import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { headerSvg, statsSvg, languageSvg, readme } from './render.mjs';
import { validateSnapshot, validatePublication } from './validate.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = validateSnapshot(JSON.parse(await readFile(`${root}metrics.json`, 'utf8')));
await mkdir(`${root}assets`, { recursive: true });
let count = 0;
for (const lang of ['en', 'es']) {
  for (const theme of ['dark', 'light']) for (const mobile of [false, true]) {
    for (const [name, render] of [['header', headerSvg], ['activity', statsSvg], ['languages', languageSvg]]) {
      await writeFile(`${root}assets/${name}-${lang}-${theme}${mobile ? '-mobile' : ''}.svg`, render(data, lang, theme, mobile));
      count++;
    }
  }
  await writeFile(`${root}${lang === 'en' ? 'README.md' : 'README.es.md'}`, readme(data, lang));
}
await validatePublication(root);
console.log(JSON.stringify({ generated: count, locales: ['en', 'es'], updatedDate: data.updatedDate }));
