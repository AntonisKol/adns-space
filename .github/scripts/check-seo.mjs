// Checks the search and link-preview tags on the site's pages, plus robots.txt,
// sitemap.xml and CNAME. Run with `node .github/scripts/check-seo.mjs`; exits 1 on a problem.
import { existsSync, readFileSync } from 'node:fs';

const SITE = 'https://adnsaudio.com/';
const PAGES = [
  { file: 'index.html', url: SITE, types: ['SoftwareApplication', 'Organization', 'WebSite'] },
  { file: 'code/index.html', url: `${SITE}code/`, types: ['TechArticle'] },
];
// Wording the site must never use (see issue #166).
const BANNED = [/\bVST\b/i, /\bAU\b/, /Audio Unit/i];

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

// Text as a browser shows it, so lengths count `&amp;` as one character.
const decode = (s) => s?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const tag = (html, re) => decode(html.match(re)?.[1]);
// A URL on the site must be a file in this repository.
const onSite = (where, what, url) => {
  if (!url?.startsWith(SITE)) return fail(where, `${what} should be on ${SITE}`);
  if (!existsSync(url.slice(SITE.length))) fail(where, `${what} ${url} has no file`);
};
const meta = (html, attr, name) =>
  tag(html, new RegExp(`<meta ${attr}="${name.replace(/[:.]/g, '\\$&')}" content="([^"]*)"`));

for (const page of PAGES) {
  const html = readFileSync(page.file, 'utf8');
  const where = page.file;

  const title = tag(html, /<title>([^<]*)<\/title>/);
  if (!title) fail(where, 'no <title>');
  else if (title.length > 70) fail(where, `title is ${title.length} characters (max 70)`);

  const description = meta(html, 'name', 'description');
  if (!description) fail(where, 'no meta description');
  else if (description.length > 170) fail(where, `description is ${description.length} characters (max 170)`);

  const canonical = tag(html, /<link rel="canonical" href="([^"]*)"/);
  if (canonical !== page.url) fail(where, `canonical is ${canonical}, expected ${page.url}`);
  if (meta(html, 'property', 'og:url') !== page.url) fail(where, `og:url should be ${page.url}`);

  for (const name of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:image', 'og:image:alt']) {
    if (!meta(html, 'property', name)) fail(where, `no ${name}`);
  }
  onSite(where, 'og:image', meta(html, 'property', 'og:image'));
  if (meta(html, 'name', 'twitter:card') !== 'summary_large_image') fail(where, 'twitter:card should be summary_large_image');

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const items = [];
  for (const [, json] of blocks) {
    try {
      for (const item of [JSON.parse(json)].flat()) {
        if (item && typeof item === 'object') items.push(item);
        else fail(where, 'structured data holds something that is not an object');
      }
    } catch (e) {
      fail(where, `structured data is not valid JSON: ${e.message}`);
    }
  }
  for (const type of page.types) {
    if (!items.some((item) => item['@type'] === type)) fail(where, `no ${type} structured data`);
  }
  for (const item of items) {
    if (item['@context'] !== 'https://schema.org') fail(where, `${item['@type']} needs @context https://schema.org`);
    for (const key of ['image', 'screenshot', 'logo']) if (item[key]) onSite(where, `${item['@type']} ${key}`, item[key]);
    const main = item['@type'] === 'SoftwareApplication' || item['@type'] === 'TechArticle';
    if (main && item.description !== description) fail(where, `${item['@type']} description should match the meta description`);
  }
  const app = items.find((item) => item['@type'] === 'SoftwareApplication');
  if (app) {
    for (const key of ['name', 'operatingSystem', 'applicationCategory', 'softwareVersion', 'screenshot', 'offers']) {
      if (!app[key]) fail(where, `SoftwareApplication has no ${key}`);
    }
    if (app.offers && (app.offers.price === undefined || !app.offers.priceCurrency)) {
      fail(where, 'the offer needs a price and a priceCurrency');
    }
    // The newest changelog entry is the released version; bump softwareVersion with it.
    const newest = html.match(/id="notes"[\s\S]*?<h3 class="mono">([^<]+)<\/h3>/)?.[1];
    if (newest && app.softwareVersion !== newest) {
      fail(where, `softwareVersion is ${app.softwareVersion}, the changelog's newest version is ${newest}`);
    }
  }

  const text = html.replace(/<script(?! type="application\/ld\+json")[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  for (const re of BANNED) if (re.test(text)) fail(where, `uses ${re}`);
}

if (readFileSync('CNAME', 'utf8').trim() !== new URL(SITE).hostname) fail('CNAME', `should be ${new URL(SITE).hostname}`);
if (!readFileSync('robots.txt', 'utf8').includes(`Sitemap: ${SITE}sitemap.xml`)) fail('robots.txt', 'no Sitemap line');
const sitemap = readFileSync('sitemap.xml', 'utf8');
for (const page of PAGES) {
  if (!sitemap.includes(`<loc>${page.url}</loc>`)) fail('sitemap.xml', `no ${page.url}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`SEO check passed: ${PAGES.length} pages, robots.txt, sitemap.xml, CNAME.`);
