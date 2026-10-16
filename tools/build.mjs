import { readFile, writeFile, mkdir, cp, readdir, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import sharp from 'sharp';
import { transform } from 'esbuild';
import config from '../site.config.mjs';
import { messages, categories } from '../src/content.js';
import { services, ui, localizedCakes, route, pageMeta } from '../src/pages.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const out = path.join(root, 'dist');
const origin = new URL(config.origin);
const preview =
  Boolean(process.env.CONTEXT && process.env.CONTEXT !== 'production') ||
  process.env.SITE_PREVIEW === 'true' ||
  Boolean(
    process.env.NETLIFY && process.env.URL && new URL(process.env.URL).origin !== origin.origin,
  );
if (
  origin.protocol !== 'https:' ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password
)
  throw new Error('site.config.mjs origin must be a clean HTTPS origin');
const absolute = (p) => new URL(p, origin).href;
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const emit = async (file, data) => {
  const target = path.join(out, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
};
const hash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 12);

if (path.dirname(out) !== root || path.basename(out) !== 'dist')
  throw new Error('Unexpected build output directory');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const template = await readFile(path.join(root, 'src/home.html'), 'utf8');
const imageInfo = {};
const widths = [320, 640, 960];
for (const file of await readdir(path.join(root, 'assets/cakes'))) {
  if (!file.endsWith('.webp')) continue;
  const source = path.join(root, 'assets/cakes', file);
  const { width, height } = await sharp(source).metadata();
  const id = path.basename(file, '.webp');
  imageInfo[id] = { width, height };
  await Promise.all(
    widths.map(async (size) => {
      // Resize and recompress only: preserve the full image and original cake design.
      const image = await sharp(source)
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toBuffer();
      await emit(`assets/cakes/${id}-${size}.webp`, image);
    }),
  );
}
const fontAssets = new Map();
for (const [pkg, files] of [
  ['@fontsource-variable/dm-sans', ['dm-sans-latin-wght-normal.woff2']],
  ['@fontsource-variable/playfair-display', ['playfair-display-latin-wght-normal.woff2']],
  [
    '@fontsource/ibm-plex-sans-arabic',
    [400, 500, 600, 700].map((w) => `ibm-plex-sans-arabic-arabic-${w}-normal.woff2`),
  ],
]) {
  for (const file of files) {
    const bytes = await readFile(path.join(root, 'node_modules', pkg, 'files', file));
    const asset = `/assets/fonts/${file.replace('.woff2', `.${hash(bytes)}.woff2`)}`;
    fontAssets.set(file, asset);
    await emit(asset.slice(1), bytes);
  }
  await emit(
    `assets/fonts/${pkg.split('/').at(-1)}-LICENSE.txt`,
    await readFile(path.join(root, 'node_modules', pkg, 'LICENSE')),
  );
}
let cssSource = await readFile(path.join(root, 'style.css'), 'utf8');
for (const [file, asset] of fontAssets)
  cssSource = cssSource.replaceAll(`/assets/fonts/${file}`, asset);
const css = await transform(cssSource, { loader: 'css', minify: true });
const js = await transform(await readFile(path.join(root, 'src/client.js'), 'utf8'), {
  minify: true,
  target: 'es2020',
});
const cssPath = `/assets/site.${hash(css.code)}.css`,
  jsPath = `/assets/site.${hash(js.code)}.js`;
await emit(cssPath.slice(1), css.code);
await emit(jsPath.slice(1), js.code);
await emit(
  'assets/brand-icon.webp',
  await sharp(path.join(root, 'favicon-192.png')).resize(84, 84).webp({ quality: 85 }).toBuffer(),
);
for (const file of [
  'favicon.ico',
  'favicon.png',
  'favicon-16.png',
  'favicon-32.png',
  'favicon-192.png',
  'favicon-512.png',
  'apple-touch-icon.png',
  'social-preview.jpg',
  'site.webmanifest',
])
  await cp(path.join(root, file), path.join(out, file));

function image(
  id,
  lang,
  { hero = false, sizes = '(max-width: 610px) 44vw, (max-width: 880px) 30vw, 24vw', alt } = {},
) {
  const info = imageInfo[id];
  return `<img src="/assets/cakes/${id}-640.webp" srcset="${widths.map((w) => `/assets/cakes/${id}-${w}.webp ${w}w`).join(', ')}" sizes="${sizes}" width="${info.width}" height="${info.height}" alt="${esc(alt || localizedCakes(lang).find((c) => c.id === id).title)}" ${hero ? 'fetchpriority="high" loading="eager"' : 'loading="lazy" decoding="async"'}>`;
}
function gallery(lang, page) {
  return localizedCakes(lang)
    .filter((c) => !page || page.id === 'custom' || c.category === page.id)
    .map(
      (c) =>
        `<article class="cake-card" data-category="${c.category}"><a class="cake-photo" href="/assets/cakes/${c.id}-960.webp" aria-label="${esc(ui[lang].zoom + c.title)}" data-title="${esc(c.title)}">${image(c.id, lang, { alt: ui[lang].inspiration + c.title })}<span class="cake-view" aria-hidden="true">+</span></a><p class="cake-label">${esc(messages[lang][c.category])}</p><h3>${esc(c.title)}</h3><a href="https://wa.me/${config.phoneDigits}?text=${encodeURIComponent(lang === 'fr' ? `Bonjour Sweet by Salma ! Je souhaite un gâteau inspiré du modèle « ${c.title} ». Pouvez-vous confirmer les possibilités et le prix ?` : `السلام عليكم Sweet by Salma! أرغب في كيك مستوحى من تصميم «${c.title}». هل يمكن تأكيد الإمكانيات والثمن؟`)}" target="_blank" rel="noopener noreferrer">${esc(messages[lang].cakeDetails)}</a></article>`,
    )
    .join('');
}
function serviceLinks(lang, page) {
  const list = page ? page.related.map((id) => services.find((s) => s.id === id)) : services;
  return `<nav class="service-links" aria-label="${esc(page ? ui[lang].related : ui[lang].services)}">${list.map((s) => `<a href="${route(lang, s)}"><h3>${esc(s[lang].label)}</h3><p>${esc(s[lang].summary)}</p><span aria-hidden="true">→</span></a>`).join('')}</nav>`;
}
function editorial(lang, page) {
  const copy = ui[lang];
  const sections = page ? page[lang].sections : [[copy.localTitle, copy.localIntro]];
  return `<section class="section local-content"><div class="container editorial-grid">${sections.map(([title, text]) => `<article><h2>${esc(title)}</h2><p>${esc(text)}</p></article>`).join('')}<article><h2>${copy.deliveryTitle}</h2><p>${copy.delivery}</p></article></div><div class="container"><h2 class="related-title">${page ? copy.related : copy.services}</h2>${serviceLinks(lang, page)}<a class="button button-primary editorial-order" href="#commande">${copy.order} →</a></div></section>`;
}
function faq(lang, page) {
  return `<section class="section faq-section"><div class="container"><h2>${ui[lang].faq}</h2>${(page ? page[lang].questions : ui[lang].faqItems).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;
}
function structuredData(lang, page) {
  const canonical = absolute(route(lang, page));
  const meta = pageMeta(lang, page);
  const business = {
    '@type': 'Bakery',
    '@id': absolute('/#business'),
    name: config.name,
    url: absolute('/'),
    telephone: `+${config.phoneDigits}`,
    image: absolute('/social-preview.jpg'),
    address: {
      '@type': 'PostalAddress',
      addressLocality: config.locality,
      addressCountry: config.country,
    },
    areaServed: { '@type': 'City', name: config.locality },
    sameAs: [config.instagram],
    description: messages[lang].heroDesc,
  };
  const nodes = [
    business,
    {
      '@type': 'WebSite',
      '@id': absolute('/#website'),
      name: config.name,
      url: absolute('/'),
      inLanguage: ['fr-MA', 'ar-MA'],
      publisher: { '@id': business['@id'] },
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: `${lang}-MA`,
      isPartOf: { '@id': absolute('/#website') },
      about: { '@id': business['@id'] },
    },
  ];
  if (page) {
    nodes.push({
      '@type': 'Service',
      '@id': `${canonical}#service`,
      name: page[lang].label,
      description: page[lang].intro,
      serviceType: page[lang].label,
      provider: { '@id': business['@id'] },
      areaServed: business.areaServed,
      url: canonical,
    });
    nodes.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: ui[lang].home, item: absolute(route(lang)) },
        { '@type': 'ListItem', position: 2, name: page[lang].label, item: canonical },
      ],
    });
  }
  return { '@context': 'https://schema.org', '@graph': nodes };
}
function head(lang, page) {
  const meta = pageMeta(lang, page),
    canonical = absolute(route(lang, page));
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#fcf6f1">
<title>${esc(meta.title)}</title><meta name="description" content="${esc(meta.description)}"><meta name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
<script>document.documentElement.classList.replace('no-js','js');</script>
<link rel="canonical" href="${canonical}">${['fr', 'ar'].map((l) => `<link rel="alternate" hreflang="${l}-MA" href="${absolute(route(l, page))}">`).join('')}<link rel="alternate" hreflang="x-default" href="${absolute(route('fr', page))}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${config.name}"><meta property="og:locale" content="${lang}_MA"><meta property="og:locale:alternate" content="${lang === 'fr' ? 'ar' : 'fr'}_MA"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(meta.title)}"><meta property="og:description" content="${esc(meta.description)}"><meta property="og:image" content="${absolute('/social-preview.jpg')}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(messages[lang].heroNote)} — ${config.name}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(meta.title)}"><meta name="twitter:description" content="${esc(meta.description)}"><meta name="twitter:image" content="${absolute('/social-preview.jpg')}"><meta name="twitter:image:alt" content="${esc(messages[lang].heroNote)} — ${config.name}">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"><link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
${(lang === 'fr' ? ['dm-sans-latin-wght-normal.woff2', 'playfair-display-latin-wght-normal.woff2'] : ['ibm-plex-sans-arabic-arabic-400-normal.woff2']).map((file) => `<link rel="preload" href="${fontAssets.get(file)}" as="font" type="font/woff2" crossorigin>`).join('')}<link rel="stylesheet" href="${cssPath}">
${config.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">` : ''}
<script defer src="${jsPath}"></script><script type="application/ld+json">${json(structuredData(lang, page))}</script>`;
}

const urls = [];
for (const lang of ['fr', 'ar'])
  for (const page of [null, ...services]) {
    const $ = load(template),
      copy = ui[lang];
    $('html').attr({ lang, dir: lang === 'ar' ? 'rtl' : 'ltr' });
    $('head').html(head(lang, page));
    $('[data-i18n]').each((_, el) => $(el).text(messages[lang][$(el).attr('data-i18n')]));
    $('[data-i18n-html]').each((_, el) => $(el).html(messages[lang][$(el).attr('data-i18n-html')]));
    $('[data-placeholder-fr]').each((_, el) =>
      $(el).attr('placeholder', $(el).attr(`data-placeholder-${lang}`)),
    );
    $('[data-i18n],[data-i18n-html],[data-placeholder-fr]').removeAttr(
      'data-i18n data-i18n-html data-placeholder-fr data-placeholder-ar',
    );
    $('body').prepend(`<a class="skip-link" href="#main">${copy.skip}</a>`);
    $('main').attr({ id: 'main', tabindex: '-1' });
    $('.brand')
      .attr({ href: route(lang), dir: 'ltr' })
      .removeAttr('aria-label');
    $('.brand-icon').attr('src', '/assets/brand-icon.webp');
    $('#mainNav').attr('aria-label', copy.nav);
    $('#mainNav a, .footer a[href^="#"]').each((_, el) =>
      $(el).attr('href', route(lang) + $(el).attr('href')),
    );
    $('#langSwitch').replaceWith(
      `<a id="langSwitch" class="lang-switch" href="${route(lang === 'fr' ? 'ar' : 'fr', page)}" lang="${lang === 'fr' ? 'ar' : 'fr'}" hreflang="${lang === 'fr' ? 'ar-MA' : 'fr-MA'}">${lang === 'fr' ? 'العربية' : 'Français'}</a>`,
    );
    $('#menuToggle').attr('aria-label', copy.menu);
    $('#filterBar')
      .attr('aria-label', copy.filter)
      .html(
        categories
          .map(
            (c) =>
              `<button class="filter-button${c === 'all' ? ' active' : ''}" type="button" data-filter="${c}" aria-pressed="${c === 'all'}">${esc(messages[lang][c])}</button>`,
          )
          .join(''),
      );
    $('#cakeGrid').html(gallery(lang, page));
    $('img[src^="assets/cakes/"]').each((_, el) => {
      const id = path.basename($(el).attr('src'), '.webp'),
        className = $(el).attr('class');
      const replacement = $(
        image(id, lang, {
          hero: $(el).closest('.hero').length > 0,
          sizes: $(el).closest('.hero').length
            ? '(max-width: 610px) 76vw, 36vw'
            : '(max-width: 610px) 85vw, 40vw',
        }),
      );
      if (className) replacement.attr('class', className);
      $(el).replaceWith(replacement);
    });
    $('.hero-image-frame img').attr(
      'alt',
      copy.inspiration + localizedCakes(lang).find((c) => c.id === 'gateau-fiancailles').title,
    );
    $('.contact-details span:last-child').html(
      `<a href="tel:+${config.phoneDigits}"><bdi>${config.phone}</bdi></a>`,
    );
    if (lang === 'ar') {
      $('.contact-details span:first-child').text('قلعة السراغنة، المغرب');
      $('.footer-main > div:last-child > span:last-child').text('قلعة السراغنة');
      $('.footer-logo,.brand-word,.vertical-note').attr({ lang: 'en', dir: 'ltr' });
    }
    $('.floating-whatsapp').attr('aria-label', copy.whatsapp);
    $('#imageModal .image-modal').attr('aria-label', copy.preview);
    $('.modal-close').attr('aria-label', copy.close);
    $('#prevImage').attr('aria-label', copy.previous);
    $('#nextImage').attr('aria-label', copy.next);
    $('#modalImage').removeAttr('src');
    $('#reviewText').attr({
      tabindex: '0',
      role: 'region',
      'aria-label': lang === 'fr' ? 'Votre message WhatsApp' : 'رسالة واتساب',
    });
    $(
      '.hero-blush,.hero-decoration,.tiny-star,.three-points b,.quote-flower,.image-corner-mark,.step-icon,.upload-symbol,.order-feature>span,.advance-note>span:first-child',
    ).attr('aria-hidden', 'true');
    $('#modalOrder,#confirmWhatsApp').attr('href', `https://wa.me/${config.phoneDigits}`);
    $('#copyrightYear').text(new Date().getFullYear());
    $('input[name=phone]').attr({ dir: 'ltr', maxlength: 25, 'aria-describedby': 'formError' });
    $('input[name=servings]').attr('step', '1');
    $('input[name=flavor]').attr(
      'placeholder',
      lang === 'fr' ? 'Préférence à confirmer' : 'تفضيل يتم تأكيده',
    );
    $('input[name=servings]').attr('placeholder', lang === 'fr' ? 'Ex. 12' : 'مثلاً: 12');
    $('#orderForm').before(
      `<noscript><p class="nojs-order">${copy.nojs} <a href="https://wa.me/${config.phoneDigits}">WhatsApp</a></p></noscript>`,
    );
    if (page) {
      $('.hero-copy h1').html(page[lang].heading);
      $('.hero-copy > p').text(page[lang].intro);
      $('.hero-image-frame').html(
        image(page.image, lang, {
          hero: true,
          sizes: '(max-width: 610px) 76vw, 36vw',
          alt: copy.inspiration + localizedCakes(lang).find((c) => c.id === page.image).title,
        }),
      );
      $('.hero-copy .eyebrow > span:last-child').text(page[lang].label);
      $('.hero-buttons a:first-child').attr('href', '#commande');
      $('.hero-copy').prepend(
        `<nav class="breadcrumbs" aria-label="${lang === 'fr' ? 'Fil d’Ariane' : 'مسار التنقل'}"><ol><li><a href="${route(lang)}">${copy.home}</a></li><li aria-current="page">${page[lang].label}</li></ol></nav>`,
      );
      $('.intro-strip,.bespoke-section,.quote-section,.how-section,.about-section').remove();
      $('.creations-section .section-heading-row h2').text(copy.gallery);
      $('.creations-section .section-heading-row > p').text(copy.galleryText);
      if (page.id !== 'custom') $('#filterBar').remove();
      $('.hero').after(editorial(lang, page));
      $('a[href="#sur-mesure"]').attr(
        'href',
        route(
          lang,
          services.find((s) => s.id === 'custom'),
        ),
      );
      $('#orderForm select[name=occasion]').val(
        ['birthday', 'wedding', 'engagement'].includes(page.id) ? page.id : 'other',
      );
    } else {
      $('.intro-strip').after(editorial(lang, null));
    }
    $('.order-section').after(faq(lang, page));
    const clientKeys = ['menu', 'closeMenu'];
    const formKeys = [
      'invalidRequired',
      'invalidPhone',
      'invalidDate',
      'invalidServings',
      'photoTooLarge',
      'messageIntro',
      'nameLabel',
      'phoneLabel',
      'occasionLabel',
      'dateLabel',
      'servingsLabel',
      'flavorLabel',
      'designLabel',
      'originalLabel',
      'yes',
      'photoLabel',
      'photoValue',
      'messageOutro',
      'occasionBirthday',
      'occasionWedding',
      'occasionEngagement',
      'occasionRomance',
      'occasionOther',
      'uploadText',
    ];
    $('body').append(
      `<script type="application/json" id="siteData">${json({ lang, phone: config.phoneDigits, ui: Object.fromEntries(clientKeys.map((k) => [k, copy[k]])), messages: Object.fromEntries(formKeys.map((k) => [k, messages[lang][k]])) })}</script>`,
    );
    const url = route(lang, page);
    urls.push({ url, page });
    await emit(`${url.slice(1)}index.html`, $.html());
  }
// No client routing fallback: unknown pages must return a real HTTP 404.
await emit(
  '404.html',
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page introuvable | Sweet by Salma</title><link rel="stylesheet" href="${cssPath}"></head><body><main class="container section"><h1>Page introuvable</h1><p>${ui.fr.notFound}</p><a class="button button-primary" href="/fr/">Accueil</a><div lang="ar" dir="rtl"><h2>${ui.ar.unavailable}</h2><p>${ui.ar.notFound}</p><a href="/ar/">الرئيسية</a></div></main></body></html>`,
);
// Root fallback is only for hosts ignoring _redirects; Netlify serves a 301 instead.
await emit(
  'index.html',
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/fr/"><meta name="robots" content="noindex"><link rel="canonical" href="${absolute('/fr/')}"><title>Sweet by Salma</title></head><body><a href="/fr/">Français</a> · <a href="/ar/" lang="ar">العربية</a></body></html>`,
);
await emit(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${preview ? '' : urls.map(({ url, page }) => `\n<url><loc>${absolute(url)}</loc>${['fr', 'ar'].map((l) => `<xhtml:link rel="alternate" hreflang="${l}-MA" href="${absolute(route(l, page))}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${absolute(route('fr', page))}"/></url>`).join('')}\n</urlset>\n`,
);
await emit(
  'robots.txt',
  `User-agent: *\nAllow: /\n${preview ? '' : `Sitemap: ${absolute('/sitemap.xml')}\n`}`,
);
const host = origin.hostname;
await emit(
  '_redirects',
  `https://www.${host}/* ${origin.origin}/:splat 301!\nhttp://www.${host}/* ${origin.origin}/:splat 301!\nhttp://${host}/* ${origin.origin}/:splat 301!\n${!preview && process.env.SITE_NAME ? `https://${process.env.SITE_NAME}.netlify.app/* ${origin.origin}/:splat 301!\n` : ''}/ /fr/ 301!\n/index.html /fr/ 301!\n${urls.map(({ url }) => `${url}index.html ${url} 301!\n${url.slice(0, -1)} ${url} 301!`).join('\n')}\n`,
);
await emit(
  '_headers',
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cache-Control: public, max-age=0, must-revalidate\n${preview ? '  X-Robots-Tag: noindex, nofollow\n' : ''}/assets/*\n  Cache-Control: public, max-age=86400\n/assets/site.*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
);
const imageBytes = (
  await Promise.all(
    (await readdir(path.join(out, 'assets/cakes')))
      .filter((f) => f.endsWith('-320.webp'))
      .map(async (f) => (await stat(path.join(out, 'assets/cakes', f))).size),
  )
).reduce((a, b) => a + b, 0);
console.log(
  `Built ${urls.length} localized pages (${preview ? 'preview: noindex, empty sitemap' : 'production: indexable'}). 19 gallery thumbnails: ${(imageBytes / 1024).toFixed(0)} KiB. Output: dist/`,
);
