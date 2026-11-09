# ADNS SPACE downloads

Downloads of **ADNS SPACE**, a one-shot sampler for Mac you play on an X-Y pad. This repository holds only the app's [releases](https://github.com/AntonisKol/adns-space-releases/releases). The source code is private.

**Download page:** [adnsaudio.com/space](https://adnsaudio.com/space/). It has the button for the newest version and the changelog of each version. It works on any Mac with macOS 13 (Ventura) or later.

## How it fits together

| Repository | What it holds |
| --- | --- |
| `adns-space-releases` (this one) | ADNS SPACE downloads only |
| [`adns-audio`](https://github.com/AntonisKol/adns-audio) | The website, adnsaudio.com |

- Each release is published by the release workflow in the app's private source repository: a signed and notarized `ADNS-SPACE-<version>-mac.dmg` and `.zip`.
- Installed copies of ADNS SPACE check these releases for updates and only accept downloads from this repository.
- Until November 2026 this repository was called `adns-space` and also held the website. GitHub forwards the old name here, which is how older installed copies still find their updates. **Never create a new repository named `adns-space`:** that would end the forwarding.
