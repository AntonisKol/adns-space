// Collects the class names in the site's pages (their class="…" attributes) into src/page-classes.txt,
// the only file Tailwind reads for class names (src/tailwind.css). Reading the pages themselves would
// also turn words in their text into utilities ("locks ring out" made .ring), so a changelog entry
// written by the ADNS SPACE release would change the CSS without anyone rebuilding it (issue #58).
// The pages are the HTML files git tracks or would add, without the Techno Vinyls app's build.
// Run by `npm run build:css`.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const pages = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.html'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && !file.startsWith('techno-vinyls/app/'));

const classes = new Set();
for (const page of pages) {
  for (const [, list] of readFileSync(page, 'utf8').matchAll(/\sclass="([^"]*)"/g)) {
    for (const name of list.split(/\s+/)) if (name) classes.add(name);
  }
}

writeFileSync('src/page-classes.txt', `${[...classes].sort().join('\n')}\n`);
console.log(`${classes.size} class names from ${pages.length} pages → src/page-classes.txt`);
