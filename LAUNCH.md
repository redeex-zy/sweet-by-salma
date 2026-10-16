# SEO audit and launch checklist

## Audit of the original repository

The original repository contained one HTML page, one stylesheet, one browser script, a permissive robots file, favicon/manifest files, a social-preview image and 19 WebP cake images. All source files, navigation targets, translations, order validation and image dimensions were inspected before implementation. No existing sitemap or deployment workflow was present.

Issues identified and addressed:

- No canonical or `og:url`, no sitemap, relative social image URLs, and a one-page domain-replacement script that could not maintain multilingual metadata.
- Arabic was available only through a JavaScript button on the French URL. Its content, metadata and gallery names were not independently localized and crawlable.
- The catalogue and category controls were empty in source HTML and generated entirely in JavaScript. Core browsing had no no-JavaScript fallback.
- The homepage offered little specific guidance for different cake occasions. There were no service landing pages, breadcrumbs or contextual service links. No keyword doorway pages or fabricated testimonials were found or added.
- Images were already WebP but loaded full-size files without responsive variants. Source images range from 980 to 1254 pixels wide; one exceeded 420 KiB. Non-gallery images lacked intrinsic dimensions.
- Google Fonts added external render dependencies. The browser downloaded both language dictionaries and rebuilt the entire gallery when changing language.
- Several small-text colors lacked sufficient contrast. Some accessible names did not match visible labels; image and message dialogs lacked full keyboard focus containment and background isolation.
- Bakery JSON-LD contained only basic business information. It lacked stable entity references, locality/country address information, website/page relationships and service/breadcrumb context.
- `robots.txt` already allowed crawling; there was no evidence of a robots block. The problem was missing discovery and multilingual architecture, not a demonstrated Google indexing penalty.

The build now emits ten fully rendered pages, unique metadata, reciprocal hreflang, Bakery/WebSite/WebPage JSON-LD, service and breadcrumb nodes, a final-URL sitemap, real 404s, canonical redirects and preview protections. The production origin is centralized in `site.config.mjs`. Prices, ratings, hours, street address, coordinates, awards and registration details were not invented. City and country alone are included in the address; this does not establish Google LocalBusiness rich-result eligibility.

## Files changed

- Page and interaction source: added `src/home.html`, `src/content.js`, `src/pages.mjs` and `src/client.js`; replaced the old root `index.html` and `script.js` with this generated-site architecture.
- Configuration and assets: added `site.config.mjs`, `netlify.toml`, `package.json` and `package-lock.json`; updated `style.css` and `site.webmanifest`. Original cake images, favicon images and `social-preview.jpg` were not edited.
- Build tools: added `tools/build.mjs` and `tools/serve.mjs`; removed `tools/set-live-domain.py`. Root `_headers` and `robots.txt` are now generated in `dist/`, alongside the new sitemap and redirect rules.
- Verification: added `tests/site.test.mjs`, `tests/browser.mjs`, `tests/browser-helpers.mjs`, `tests/lighthouse.mjs` and `.github/workflows/ci.yml`.
- Maintenance and handoff: updated `README.md` and `.gitignore`; added `.gitattributes` and this `LAUNCH.md` checklist. Generated site files, reports, screenshots and dependencies are ignored by Git.

## Verification performed locally

- Production and preview builds completed. All 13 static/HTTP checks passed in each mode, including canonical/hreflang reciprocity, all internal targets and assets, JSON-LD syntax and business facts, XML sitemap parsing, route normalization and 404s. The temporary Netlify-primary-host guard and default-host redirect were also exercised with simulated build environment variables.
- All 15 browser scenarios passed using installed Chrome: ten localized routes, image decoding, responsive widths of 360/768/1440 pixels, WCAG A/AA automated checks, both-language filters/dialogs/navigation, invalid and valid order requests, Casablanca date boundaries, oversized/inspiration photos and WhatsApp URL/message generation. All ten pages also worked with JavaScript disabled. No WhatsApp message was sent.
- Automated accessibility checks reported zero violations on the tested pages and dialogs. French/Arabic mobile homepages and desktop wedding layouts were also visually inspected. This is not a claim of exhaustive human accessibility certification.
- The final local mobile Lighthouse run scored performance **98** (French homepage), **95** (Arabic homepage) and **99** (French wedding page); accessibility, best practices and SEO scored **100** for all three. LCP was 2.0/2.5/1.9 seconds respectively; CLS was 0 for each. These are lab results on a compressed local server; production CDN, field INP and Search Console data remain unmeasured.
- The 19 original image files total about 2,900 KiB. Their 320-pixel gallery variants total about 317 KiB, an 89% byte reduction for that variant set. Actual downloads depend on viewport and pixel density. Original cake images, favicon and social-preview image remain unchanged. The minified browser script is about 6.1 KiB, compared with about 21.9 KiB originally.
- Production `sitemap.xml` is valid XML and contains exactly ten final, canonical, indexable route URLs; preview sitemaps intentionally contain zero. Both languages are present in source HTML and accessible without JavaScript.

Public HTTPS/DNS/redirect checks, Google's Rich Results Test/Schema.org hosted validation, Search Console ownership/indexing, Google Business Profile verification and GitHub Actions execution were not performed. They require a public deployment, owner access or pushing the changes. No domain was purchased and nothing was deployed publicly.

## Before publishing

1. Buy or confirm ownership of `sweetbysalma.com`; the repository does not imply the domain is available or already registered.
2. Review the French/Arabic copy and confirm actual delivery arrangements with Salma. The site explicitly says delivery terms, any fees, availability, flavours and designs must be confirmed in the WhatsApp conversation.
3. After authorizing deployment, import the GitHub repository into a suitable Netlify account/plan. Use `npm run build` and publish `dist`. This is a normal static build, with no database or form backend. Do not publish the repository root or continue using the previous GitHub Pages root layout.
4. Keep `SITE_PREVIEW=true` while reviewing any temporary public deployment. Preview builds intentionally contain no sitemap entries. Netlify primary URLs that differ from the configured origin are also automatically protected by the build.
5. Add both `sweetbysalma.com` and `www.sweetbysalma.com` in Netlify Domain management. Set **sweetbysalma.com** as primary to match the code. The origin can be changed centrally if you choose a different domain later.
6. Complete DNS and HTTPS, remove the temporary `SITE_PREVIEW=true` setting, and rebuild after the custom domain is primary. Check that the build log says `production: indexable` and that the sitemap contains ten URLs.
7. Inspect all ten public routes, language switches, cake filters, mobile menu and form. Confirm `http` and `www` redirect to HTTPS/non-www while preserving paths. Check `/`, `/fr`, `/ar`, explicit `index.html` URLs and an unknown URL; expect permanent normalization and a real 404 for the unknown URL.
8. Check the production response has no `X-Robots-Tag: noindex`, the pages have self-canonicals, all assets load, and `/robots.txt` advertises the sitemap. Test the final HTTPS URL in Google's [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema.org validator](https://validator.schema.org/). Treat warnings about unprovided business details honestly; never invent a street address to satisfy a test.

Netlify configuration is prepared, not deployed. HTTPS certificates, live redirects, DNS propagation, Google rendering, indexing and field Core Web Vitals require checks after launch. [Netlify domain guidance](https://docs.netlify.com/domains/manage-domains/manage-multiple-domains/) describes primary-domain redirects; the build also includes explicit rules for this site.

## Spaceship DNS for Netlify

Keep Spaceship nameservers if you want to manage DNS there. Open **Advanced DNS**, select `sweetbysalma.com`, then manage its host records. For Netlify's standard network without ALIAS/ANAME support, the current documented records are:

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `75.2.60.5` |
| CNAME | `www` | The exact assigned `<site-name>.netlify.app` hostname |
| TXT | `@` | The exact `google-site-verification=...` value supplied by Search Console |

Use the records shown in **your Netlify domain setup** if they differ, including any additional ownership-verification record. The CNAME target above is a placeholder, not an assigned site name. Use Spaceship's default TTL. Resolve conflicting parking/web A, AAAA or CNAME records only after reviewing them; keep email MX, SPF, DKIM, DMARC and unrelated verification records intact. A CNAME is not a substitute for an apex A/ALIAS record, and DNS does not itself provide the www-to-apex HTTP redirect.

Allow DNS propagation and let Netlify issue HTTPS for both names. A primary apex domain with external DNS uses Netlify's documented load-balancer arrangement; Netlify generally recommends its DNS service for an apex primary. If you instead choose Netlify nameservers, copy all existing records first and manage the Google TXT record at Netlify afterward. Do not mix records at an inactive DNS provider.

These values and steps follow [Netlify's external-DNS instructions](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/). Spaceship explains [Advanced DNS and changing nameservers](https://www.spaceship.com/knowledgebase/connect-domain-custom-nameservers/). No DNS settings were changed during implementation.

## Google Search Console

No authenticated Search Console connection or domain-ownership token was available. The owner must complete these steps:

1. Sign in to [Search Console](https://search.google.com/search-console) with the Google account that should own the site. Add a **Domain property** named `sweetbysalma.com`, without protocol, `www` or paths.
2. Copy Google's unique TXT value. Add it at host `@` in the **active** DNS provider (Spaceship if retaining its nameservers). Keep this TXT record after verification. Return to Search Console and click Verify after propagation. The optional HTML token in `site.config.mjs` supports a URL-prefix property only; it cannot verify a Domain property.
3. After the production website is live and indexable, open Sitemaps and submit `https://sweetbysalma.com/sitemap.xml`.
4. Inspect `/fr/`, `/ar/` and the eight service URLs. Run Test live URL; examine the rendered page, fetch status and robots/canonical signals, then request indexing of essential pages. A request is not confirmation of inclusion.
5. Check Page indexing and Crawl stats for server errors, redirect problems, blocked resources, unexpected exclusions and Google-selected canonicals. Correct the cause and retest. Root redirects, alternate hosts and the 404 should not be submitted as content pages.
6. Monitor Performance for branded and service queries, French/Arabic search terms, Morocco, mobile, landing pages, impressions, clicks and click-through rate. Review Core Web Vitals when enough real-user data exists; compare measured LCP/INP/CLS after deployment.

Google documents [Domain properties and DNS verification](https://support.google.com/webmasters/answer/34592), [ownership verification](https://support.google.com/webmasters/answer/9008080) and [URL Inspection](https://support.google.com/webmasters/answer/9012289/). Neither a sitemap nor a successful live test guarantees indexing or rankings. Multilingual implementation follows [Google's localized-version guidance](https://developers.google.com/search/docs/specialty/international/localized-versions).

## Google Business Profile

1. Search Maps for an existing legitimate listing first; claim it instead of making a duplicate. Create a profile only if Sweet by Salma meets Google's eligibility requirements, including genuine in-person customer contact or delivery to customers.
2. Use **Sweet by Salma** as the business name, exactly as customers know it. Do not add search phrases or city names to the name. Choose the most specific available category that accurately describes the operation, such as Pâtisserie, Cake shop or Bakery where offered; category labels vary by language and region.
3. If this is a home-based delivery business that does not receive customers at a storefront, provide accurate verification information to Google and **hide the residential address from customers**. Define El Kelaa des Sraghna as the actual service area. Do not present an unstaffed home, virtual office or invented address as a walk-in shop.
4. Complete the verification method Google offers. Only the owner can supply the requested genuine evidence. Add the website after it works, the telephone `+212 628-801635`, and genuine operating details that the owner can confirm.
5. If the verified profile offers WhatsApp under Edit profile → Contact → Chat, add `https://wa.me/212628801635`. Availability varies by region/profile; retain the telephone regardless.
6. Add original photographs of actual cakes and genuine business activity. The website's disclosed studio renditions must not be represented as genuine product photographs in the profile.
7. Ask real customers for honest reviews after completed orders using Google's review link. Invite feedback consistently, without incentives, review gating, scripts demanding keywords or fabricated experiences. Respond professionally to feedback.

See Google's [business representation and service-area rules](https://support.google.com/business/answer/3038177), [address-hiding instructions](https://support.google.com/business/answer/2853879), [WhatsApp availability](https://support.google.com/business/answer/15013580) and [review policy](https://support.google.com/business/answer/7400114). No listing or review was created during implementation.
