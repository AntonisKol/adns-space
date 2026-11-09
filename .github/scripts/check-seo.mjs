// Checks the search and link-preview tags on the site's pages, their local links, the shared
// stylesheet and favicon, the forwarding pages, robots.txt, sitemap.xml and CNAME. Run with `node .github/scripts/check-seo.mjs`; exits 1 on a problem.
import { existsSync, readFileSync } from 'node:fs';

const SITE = 'https://adnsaudio.com/';
const PAGES = [
  { file: 'index.html', url: SITE, types: ['Organization', 'WebSite'] },
  { file: 'space/index.html', url: `${SITE}space/`, types: ['SoftwareApplication', 'Organization', 'WebSite'] },
  { file: 'space/how-it-works/index.html', url: `${SITE}space/how-it-works/`, types: ['TechArticle'] },
  { file: 'techno-vinyls/index.html', url: `${SITE}techno-vinyls/`, types: ['WebPage'] },
  { file: 'market-trends/index.html', url: `${SITE}market-trends/`, types: ['WebPage'] },
  { file: 'sample-map/index.html', url: `${SITE}sample-map/`, types: ['WebPage'] },
  { file: 'contact/index.html', url: `${SITE}contact/`, types: ['ContactPage'], eyebrow: false },
  { file: 'privacy/index.html', url: `${SITE}privacy/`, types: ['WebPage'] },
];
// Old or placeholder addresses that forward to a page (issue #178).
const FORWARDS = [
  { file: 'code/index.html', to: `${SITE}space/how-it-works/`, types: [] },
];
const NAVIGATION = ['/', '/space/', '/market-trends/', '/techno-vinyls/', '/sample-map/', '/contact/'];
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
  const path = decodeURI(url.slice(SITE.length).split(/[?#]/)[0]);
  if (!existsSync(path === '' || path.endsWith('/') ? `${path}index.html` : path)) fail(where, `${what} ${url} has no file`);
};
// Every local link and image has its file; other schemes, other hosts and comments are skipped.
const checkLinks = (where, html, base) => {
  for (const [, link] of html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<[^>]+\s(?:href|src)="([^"]+)"/g)) {
    if (/^#/.test(link)) continue;
    const url = new URL(link, base);
    if (url.origin === new URL(SITE).origin) onSite(where, 'link', url.href);
  }
};
const parseLd = (where, html) => {
  const items = [];
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      for (const item of [JSON.parse(json)].flat()) {
        if (item && typeof item === 'object') items.push(item);
        else fail(where, 'structured data holds something that is not an object');
      }
    } catch (e) {
      fail(where, `structured data is not valid JSON: ${e.message}`);
    }
  }
  return items;
};
const meta = (html, attr, name) =>
  tag(html, new RegExp(`<meta ${attr}="${name.replace(/[:.]/g, '\\$&')}" content="([^"]*)"`));

const logos = new Set();
const orgLogos = new Set();
// Width and height of a PNG, read from its header.
const pngSize = (file) => {
  const b = readFileSync(file);
  return b.toString('ascii', 1, 4) === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
};
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

  const items = parseLd(where, html);
  for (const type of page.types) {
    if (!items.some((item) => item['@type'] === type)) fail(where, `no ${type} structured data`);
  }
  for (const item of items) {
    if (item['@context'] !== 'https://schema.org') fail(where, `${item['@type']} needs @context https://schema.org`);
    for (const key of ['image', 'screenshot', 'logo']) if (item[key]) onSite(where, `${item['@type']} ${key}`, item[key]);
    // Google's logo rules: a raster image of at least 112 x 112, and one logo for the publisher everywhere (issue #70).
    if (item['@type'] === 'Organization') {
      orgLogos.add(item.logo);
      const size = item.logo?.endsWith('.png') && existsSync(item.logo.slice(SITE.length)) ? pngSize(item.logo.slice(SITE.length)) : null;
      if (!size || size[0] < 112 || size[1] < 112) fail(where, 'the Organization logo should be a PNG of at least 112 x 112');
    }
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

  checkLinks(where, html, page.url);

  const nav = html.match(/<nav class="nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  if (!nav) fail(where, 'no shared site navigation');
  else {
    for (const href of NAVIGATION) {
      if (!nav.includes(`href="${href}"`)) fail(where, `navigation has no link to ${href}`);
    }
  }

  // The menu button for narrow screens (issue #73): it opens the nav, which nav.js wires up.
  const mast = html.match(/<header class="wrap mast[^"]*">([\s\S]*?)<\/header>/)?.[1] ?? '';
  if (!/<button class="menu-toggle" type="button" aria-controls="site-nav" aria-expanded="false"[^>]* hidden>/.test(mast)) {
    fail(where, 'no hidden menu button for narrow screens in the masthead');
  }
  if (!mast.includes('<nav class="nav" id="site-nav"')) fail(where, 'the nav needs id="site-nav" for the menu button');
  if (!html.includes('<script src="/assets/nav.js" defer></script>')) fail(where, 'does not load /assets/nav.js');

  // One look on every page (issue #25): the shared stylesheet and a favicon. Styles are Tailwind classes
  // built from src/tailwind.css (issue #58), so no page has its own <style> block or style attribute.
  if (!html.includes('<link rel="stylesheet" href="/assets/site.css" />')) fail(where, 'does not use /assets/site.css');
  if (!/<link rel="icon" href="[^"]+"/.test(html)) fail(where, 'no favicon');
  // Each tag outside scripts, read with its quoted values (which may hold a ">"), then blanked values,
  // so only attribute names are left to match.
  const tags = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .match(/<[a-z][\w-]*(?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/gi) ?? [];
  if (tags.some((t) => /^<style\b/i.test(t))) fail(where, 'has a <style> block; style it with Tailwind classes or src/tailwind.css');
  if (tags.some((t) => /\sstyle\s*=/i.test(t.replace(/"[^"]*"|'[^']*'/g, '""')))) fail(where, 'has a style attribute; use Tailwind classes');

  // Content starts at the same point on every page: an eyebrow first in <main>, then the h1.
  const content = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const eyebrowAt = content.search(/class="eyebrow"/);
  const before = content.slice(0, Math.max(eyebrowAt, 0));
  // Contact has no eyebrow (issue #42): its main starts with the h1, and the CSS keeps the h1 at the same height.
  if (page.eyebrow === false) {
    if (eyebrowAt >= 0 || /<(img|figure|p|h[2-6])[\s>]/.test(content.slice(0, Math.max(content.search(/<h1[\s>]/), 0)))) {
      fail(where, 'main should start with the h1');
    }
  } else if (eyebrowAt < 0 || eyebrowAt > content.search(/<h1[\s>]/) || /<(img|figure|p|h[1-6])[\s>]/.test(before)) {
    fail(where, 'main should start with an eyebrow, then the h1');
  }
  const logo = html.match(/<svg class="brand-logo"[\s\S]*?<\/svg>/)?.[0];
  if (!logo) fail(where, 'no ADNS Audio logo in the masthead');
  else if (logos.size && !logos.has(logo)) fail(where, 'the logo differs from the other pages');
  else logos.add(logo);

  const text = html.replace(/<script(?! type="application\/ld\+json")[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  for (const re of BANNED) if (re.test(text)) fail(where, `uses ${re}`);
}

// Apps built elsewhere that render inside a page (issue #26): the page has the
// app's container and loads its files, which must all be here.
const APPS = [{ page: 'techno-vinyls/index.html', container: 'id="techno-vinyls"', files: '/techno-vinyls/app/static/' }];
for (const app of APPS) {
  const html = readFileSync(app.page, 'utf8');
  if (!html.includes(app.container)) fail(app.page, `no ${app.container} for the app`);
  const block = html.match(/<!-- techno-vinyls:app -->([\s\S]*?)<!-- \/techno-vinyls:app -->/)?.[1] ?? '';
  if (!block.includes(`src="${app.files}`)) fail(app.page, `does not load the app from ${app.files}: run npm run publish:site in the app repo`);
}

if (orgLogos.size > 1) fail('structured data', `the Organization logo differs between pages: ${[...orgLogos].join(', ')}`);

// Google shows the homepage's favicon beside every result (issue #70): a square PNG whose size is a
// multiple of 48 px, plus /favicon.ico, which crawlers ask for on their own.
{
  const html = readFileSync('index.html', 'utf8');
  const icons = [...html.matchAll(/<link rel="icon" href="([^"]+)" sizes="(\d+)x(\d+)" type="image\/png" \/>/g)];
  if (!icons.length) fail('index.html', 'no PNG favicon with sizes for Google');
  for (const [, href, w, h] of icons) {
    const size = existsSync(href.slice(1)) ? pngSize(href.slice(1)) : null;
    if (w !== h || Number(w) % 48) fail('index.html', `favicon ${href} should be square and a multiple of 48 px`);
    else if (!size || size[0] !== Number(w) || size[1] !== Number(h)) fail('index.html', `favicon ${href} is not ${w} x ${h}`);
  }
  if (/<link rel="icon"[^>]*\.svg"/.test(html)) fail('index.html', 'an SVG favicon would win over the logo PNGs');
  if (!existsSync('favicon.ico')) fail('favicon.ico', 'missing');
}

if (readFileSync('CNAME', 'utf8').trim() !== new URL(SITE).hostname) fail('CNAME', `should be ${new URL(SITE).hostname}`);
if (!readFileSync('robots.txt', 'utf8').includes(`Sitemap: ${SITE}sitemap.xml`)) fail('robots.txt', 'no Sitemap line');
const sitemap = readFileSync('sitemap.xml', 'utf8');
for (const page of PAGES) {
  if (!sitemap.includes(`<loc>${page.url}</loc>`)) fail('sitemap.xml', `no ${page.url}`);
}
if ((sitemap.match(/<loc>/g) || []).length !== PAGES.length) fail('sitemap.xml', `should list only the ${PAGES.length} pages`);

for (const { file, to, types } of FORWARDS) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes(`<meta http-equiv="refresh" content="0; url=${to}" />`)) fail(file, `should forward to ${to}`);
  if (!html.includes(`location.replace('${to}' + location.hash)`)) fail(file, `should forward to ${to} keeping the #section`);
  if (!html.includes(`<a href="${to}">`)) fail(file, `the fallback link should go to ${to}`);
  if (meta(html, 'property', 'og:url') !== to || !meta(html, 'property', 'og:image')) fail(file, 'needs og:url and og:image for link previews');
  const items = parseLd(file, html);
  for (const type of types) if (!items.some((item) => item['@type'] === type)) fail(file, `no ${type} structured data`);
  checkLinks(file, html, `${SITE}${file.replace(/index\.html$/, '')}`);
  if (tag(html, /<link rel="canonical" href="([^"]*)"/) !== to) fail(file, `canonical should be ${to}`);
  if (!PAGES.some((page) => page.url === to)) fail(file, `forwards to ${to}, which is not a page`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`SEO check passed: ${PAGES.length} pages, ${FORWARDS.length} forwards, robots.txt, sitemap.xml, CNAME.`);
