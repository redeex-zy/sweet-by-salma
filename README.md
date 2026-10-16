# Sweet by Salma

French and Arabic website for Sweet by Salma, a custom cake and dessert business in El Kelaa des Sraghna, Morocco. The pink-and-cream design, catalogue, filters, gallery, mobile navigation and WhatsApp enquiry form are preserved.

The configured **planned production origin** is `https://sweetbysalma.com`. This repository does not establish domain ownership, a live deployment, Google indexing or a verified Business Profile.

## Development

Use Node.js 22.19 or newer (including the Lighthouse test runner).

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:3000/fr/` or `/ar/`. Build output is `dist/`; source files must not be uploaded as the public site. Building replaces only that generated directory. Do not open the template directly with `file://`.

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run test:lighthouse
```

Browser tests and Lighthouse use a local server and Chromium. An existing Chrome installation can be used on Windows. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override the browser path. Screenshots and machine-readable reports are kept in ignored `test-results/`. Lighthouse scores are local lab measurements, not live Core Web Vitals or ranking predictions. CI runs static and browser tests; it does not deploy.

## Content and configuration

- `site.config.mjs`: production origin, verified business details and optional URL-prefix Search Console verification token. Change the origin here and rebuild; never replace it with a temporary hosting URL.
- `src/home.html`: shared design and form template. Metadata is generated, not maintained in this template.
- `src/content.js`: shared French/Arabic interface text, gallery models and categories.
- `src/pages.mjs`: distinct service copy, FAQs, localized gallery names, provenance disclosure and URL mapping.
- `src/client.js`: filters, accessible dialogs, mobile menu and WhatsApp message preparation. It does not switch page languages or overwrite SEO metadata.
- `style.css`: visual design, RTL rules, self-hosted font definitions and accessibility improvements.
- `tools/build.mjs`: static HTML, resized images, hashed CSS/JS/fonts, JSON-LD, sitemap, robots and Netlify rules.
- `tools/serve.mjs`: local HTTP server with route normalization, compression and genuine 404 responses.
- `tests/`: route/SEO/schema checks, browser interactions, accessibility and Lighthouse runner.

The build creates these paths under **both** `/fr/` and `/ar/`:

| Suffix | Intent |
| --- | --- |
| `/` | Local homepage and complete catalogue |
| `gateaux-anniversaire/` | Birthday cake planning |
| `gateaux-mariage/` | Wedding design and reception logistics |
| `gateaux-fiancailles/` | Engagement cake planning and inscriptions |
| `gateaux-personnalises/` | Custom design, inspiration photos and enquiry process |

Shared Latin service slugs keep URLs stable; Arabic titles, body text, labels, gallery names and layout are localized. Each pair has reciprocal `fr-MA`, `ar-MA` and French `x-default` annotations and its own canonical. `/` permanently redirects to `/fr/`; users can select Arabic through ordinary links. No browser-language or IP redirect hides either language.

## Images and ordering

Original WebP photos remain unchanged in `assets/cakes/`. The build generates 320, 640 and 960 pixel-wide versions without cropping or changing decorations. The hero is eager/high-priority; other photos are responsive and lazy-loaded. Favicon and social-preview originals are retained. Font binaries are copied from pinned Fontsource dependencies with their licenses.

**Photo provenance:** some gallery visuals are edited or illustrative studio renditions inspired by the presented creations. This disclosure remains visible in both languages. These images do not promise an identical delivered design or confirm flavour availability. Use original, genuine business photos for Google Business Profile.

The form prepares a reviewable message for `https://wa.me/212628801635`; it does not send an order automatically. It validates the minimum four-day notice using `Africa/Casablanca`, telephone and serving inputs, required fields and the 10 MiB attachment limit. Inspiration files must be attached manually in WhatsApp and are not stored by the website. Without JavaScript, users can still browse the entire catalogue, switch languages and contact WhatsApp directly.

## Hosting and launch

Netlify is configured in `netlify.toml` (`npm run build`, publish `dist`, Node 22). The generated `_redirects` and `_headers` are for Netlify; a different commercial host must implement equivalent redirect, cache, noindex and 404 behavior. There is deliberately no single-page-app rewrite.

Deploy previews, branch deploys and `SITE_PREVIEW=true` builds are marked `noindex, nofollow`, have a matching HTTP header and publish an empty sitemap. A Netlify build is also treated as a preview when its primary `URL` does not match the configured production origin. After connecting the final primary domain, rebuild so production pages become indexable. When `SITE_NAME` is available, a production build redirects the default Netlify hostname to the canonical domain.

See [LAUNCH.md](LAUNCH.md) for the audit, Spaceship DNS, Search Console and Google Business Profile checklist. Public deployment, DNS edits and purchases require the owner's authorization. The old GitHub Pages preview is not this build's deployment target; coordinate hosting migration before merging or publishing these changes.

## Contact

[Instagram](https://www.instagram.com/sweet._.by_salma/) · [WhatsApp](https://wa.me/212628801635) · +212 628-801635

Originally developed by [redeex-zy](https://github.com/redeex-zy).
