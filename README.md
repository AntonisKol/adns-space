# adnsaudio.com

The website of ADNS Audio: audio software and music discovery tools for techno. **Live at [adnsaudio.com](https://adnsaudio.com/).**

Everything in this repository is the site itself. GitHub Pages serves the `main` branch at adnsaudio.com, so each file here is a page or an asset people can open.

**Why it's called `adns-space`.** The repository started as ADNS SPACE's download page, and it still holds the app's releases. Installed copies of ADNS SPACE look for updates at `AntonisKol/adns-space` and only accept downloads from `github.com/AntonisKol/adns-space/releases/download/`. Renamed, the repository would hand out links under the new name, and installed copies would silently stop finding updates. So the name stays.

## What's on the site

| Page | Address | What it is | Made in |
| --- | --- | --- | --- |
| Home | [`/`](https://adnsaudio.com/) | The three apps, with links | This repository |
| ADNS SPACE | [`/space/`](https://adnsaudio.com/space/), [`/space/how-it-works/`](https://adnsaudio.com/space/how-it-works/) | A sampler for Mac you play on an X-Y pad (see [below](#adns-space-for-mac)). The download page, the changelog of each version, and a guide | The page here; the app in a private source repository, whose releases are published here |
| Market Trends | [`/market-trends/`](https://adnsaudio.com/market-trends/) | Ask in plain English about prices and demand for vinyl on the techno labels it tracks, answered by Claude from nightly Discogs data | The page here; the question box and its API in [music-catalogue-market-trends-wip](https://github.com/AntonisKol/music-catalogue-market-trends-wip) |
| Techno Vinyls | [`/techno-vinyls/`](https://adnsaudio.com/techno-vinyls/) | Browse techno vinyl releases from Discogs, search by artist, compare release details and the lowest listed price | [techno-vinyls](https://github.com/AntonisKol/techno-vinyls), built into `techno-vinyls/` |
| Contact, Privacy | [`/contact/`](https://adnsaudio.com/contact/), [`/privacy/`](https://adnsaudio.com/privacy/) | How to get in touch, and what the site stores | This repository |

## How it works

- **Plain HTML pages.** Each page is an `index.html` in its own folder, so its address has no `.html`. Nothing is generated on a server.
- **One stylesheet, built with Tailwind CSS.** `src/tailwind.css` holds the design; `npm run build:css` writes `assets/site.css`, and only that built file is published. `scripts/page-classes.mjs` collects the class names the pages use, so text on a page can never turn into a style by accident.
- **Fonts served from the site.** Chakra Petch and Share Tech Mono are in `assets/fonts` with their licences, so no font request goes to another company.
- **A menu for small screens.** `assets/nav.js` opens the links as a list on narrow screens. Without JavaScript, the links show as they are.
- **Search and link previews.** Each page has its description, link-preview image and structured data; `sitemap.xml` and `robots.txt` list what search engines may read. `code/` is an old address that forwards to the SPACE guide.
- **The domain.** `CNAME` tells GitHub Pages to serve the site at adnsaudio.com; `.nojekyll` serves the files as they are.

## How changes arrive

`main` only takes pull requests whose checks pass. The **Check pages** workflow (`.github/workflows/check.yml`) runs on each one:

- `node .github/scripts/check-seo.mjs` checks every page's search and link-preview tags, its local links, the menu, the forwarding pages, `robots.txt`, `sitemap.xml` and `CNAME`, and the words the site must never use.
- `npm run build:css` must reproduce the committed `assets/site.css`, so a page never uses a style that wasn't built.

The apps publish their own parts:

- **Market Trends:** `deploy/deploy.sh page` in its repository opens a pull request here that copies only `ask.js` and `ask.css` into `market-trends/`. Merging it publishes the new question box.
- **Techno Vinyls:** its CI copies each new build into `techno-vinyls/` after its tests pass, and a nightly job at 03:30 UTC refreshes `techno-vinyls/data/releases.json`. Both push with a deploy key that can write to this repository only.
- **ADNS SPACE:** the release workflow in the app's source repository signs and notarizes the app, publishes it as a [release of this repository](https://github.com/AntonisKol/adns-space/releases), and adds the version's changelog to the download page. Installed copies look for updates in these releases.

## Work on it locally

```bash
npm ci                                  # Tailwind's build tools
npm run build:css                       # rebuild assets/site.css after changing pages or src/tailwind.css
node .github/scripts/check-seo.mjs      # the same page checks as the pull request
python3 -m http.server 8000             # then open http://localhost:8000
```

Commit `assets/site.css` together with the pages that need it. Never commit an `.env` file or anything secret: every file here is published.

## ADNS SPACE for Mac

ADNS SPACE is a one-shot sampler you play on an X-Y pad. Load a short sound, then click and drag on the pad. Left to right picks the note in your chosen key and scale, bottom to top picks the speed, and the built-in arpeggiator plays your sound in time.

Shape it with ten effects you can drag into any order: filter, two EQs, shifter, phaser-flanger, grain delay, reverb, auto pan, Corpus resonators and a filter delay, with a saturator always last. Six LFOs can move any knob, or the pad itself, and two envelopes move knobs on every note or pad touch. A 64-step sequencer plays its own melodies, with parameter locks: any effect knob or switch can have its own setting on each step. Record everything you play and export it as a WAV file for your DAW. It's a standalone Mac app, made for deep, hypnotic techno.

### Download

**[Download ADNS SPACE for Mac](https://adnsaudio.com/space/)**: the download page has the button for the newest version, and the changelog for each version.

It works on any Mac with **macOS 13 (Ventura) or later**.

### Install

1. Open the downloaded `.dmg` file.
2. Drag **ADNS SPACE** onto the **Applications** folder.
3. Open **ADNS SPACE** from your Applications folder.

ADNS SPACE is signed and notarized by Apple, so it opens like any other app. The first time, your Mac asks whether you want to open an app downloaded from the internet: click **Open**.

Versions up to 2.0.0 weren't notarized, so macOS asked you to allow them under **System Settings → Privacy & Security → Open Anyway**. From 2.0.1 on, that's gone.

### Updating

Versions 1.2 and later tell you when a new version is out and can install it: click **Update**, then **Restart now**. Your saved takes are kept.

On older versions, download the newest `.dmg` from the link above and drag it into Applications, choosing **Replace**. Your saved takes are kept either way.

### Troubleshooting

- **"ADNS SPACE is damaged and can't be opened."** The download was probably interrupted. Delete the app and the `.dmg` and download it again.
- **No sound.** Check your Mac's output device and volume, and **VOL** in the app's top bar (next to the level meter), then load a sample and touch the pad.
- **Something else?** Email support[at]adnsaudio.com.
