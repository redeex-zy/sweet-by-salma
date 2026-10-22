import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import config from '../site.config.mjs';
import { services, route, pageMeta } from '../src/pages.mjs';
import { createSiteServer } from '../tools/serve.mjs';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const origin = config.origin;
const pages = await Promise.all(
  ['fr', 'ar'].flatMap((lang) =>
    [null, ...services].map(async (page) => ({
      lang,
      page,
      url: route(lang, page),
      $: load(await readFile(path.join(out, route(lang, page), 'index.html'), 'utf8')),
    })),
  ),
);
const preview = pages[0].$('meta[name=robots]').attr('content').startsWith('noindex');
const pageMap = new Map(pages.map((p) => [p.url, p.$]));
const titles = new Set(),
  descriptions = new Set();

for (const { lang, page, url, $ } of pages)
  test(`${url}: HTML, metadata, language, links, images and schema`, async () => {
    assert.equal($('html').attr('lang'), lang);
    assert.equal($('html').attr('dir'), lang === 'ar' ? 'rtl' : 'ltr');
    assert.equal($('h1').length, 1);
    assert.ok($('main').text().length > 1400);
    assert.equal($('title').text(), pageMeta(lang, page).title);
    assert.ok(!titles.has($('title').text()));
    titles.add($('title').text());
    const description = $('meta[name=description]').attr('content');
    assert.ok(!descriptions.has(description));
    descriptions.add(description);
    assert.equal($('link[rel=canonical]').length, 1);
    assert.equal($('link[rel=canonical]').attr('href'), origin + url);
    assert.equal($('meta[property="og:url"]').attr('content'), origin + url);
    for (const prefix of ['meta[property="og:', 'meta[name="twitter:'])
      for (const prop of ['title', 'description', 'image'])
        assert.ok($(prefix + prop + '"]').attr('content'));
    assert.equal($('meta[property="og:locale"]').attr('content'), lang + '_MA');
    assert.equal($('meta[property="og:image"]').attr('content'), origin + '/social-preview.jpg');
    assert.equal($('meta[name="twitter:card"]').attr('content'), 'summary_large_image');
    const alternate = $('link[hreflang]');
    assert.equal(alternate.length, 3);
    for (const l of ['fr', 'ar']) {
      const href = $(`link[hreflang="${l}-MA"]`).attr('href');
      assert.equal(href, origin + route(l, page));
      assert.equal(
        pageMap.get(route(l, page))(`link[hreflang="${lang}-MA"]`).attr('href'),
        origin + url,
      );
    }
    assert.equal($('link[hreflang=x-default]').attr('href'), origin + route('fr', page));
    assert.equal($('#langSwitch').prop('tagName'), 'A');
    assert.equal($('#langSwitch').attr('href'), route(lang === 'fr' ? 'ar' : 'fr', page));
    const ids = $('[id]')
      .map((_, e) => $(e).attr('id'))
      .get();
    assert.equal(ids.length, new Set(ids).size, 'duplicate IDs');
    for (const el of $('a[href],link[href],script[src],img[src]').toArray()) {
      const attr = $(el).attr('href') || $(el).attr('src');
      assert.ok(attr && attr !== '#', 'empty or placeholder link');
      const parsed = new URL(attr, origin + url);
      if (parsed.origin !== origin) {
        if (parsed.hostname === 'wa.me') assert.equal(parsed.pathname, '/' + config.phoneDigits);
        if (parsed.protocol === 'tel:') assert.equal(parsed.pathname, '+' + config.phoneDigits);
        continue;
      }
      if (parsed.hash) {
        const target = pageMap.get(parsed.pathname) || $;
        assert.equal(target(`[id="${parsed.hash.slice(1)}"]`).length, 1, attr);
      }
      if (parsed.pathname === url) continue;
      const target = path.join(
        out,
        parsed.pathname,
        parsed.pathname.endsWith('/') ? 'index.html' : '',
      );
      assert.ok((await stat(target)).isFile(), attr);
    }
    for (const el of $('img').toArray()) {
      assert.ok($(el).attr('alt') !== undefined);
      if ($(el).attr('id') === 'modalImage') continue;
      assert.ok(
        Number($(el).attr('width')) > 0 && Number($(el).attr('height')) > 0,
        'image dimensions',
      );
      if ($(el).attr('src').includes('/cakes/')) {
        assert.ok($(el).attr('srcset'));
        assert.ok($(el).attr('sizes'));
        assert.equal($(el).attr('loading'), $(el).closest('.hero').length ? 'eager' : 'lazy');
        for (const item of $(el).attr('srcset').split(','))
          assert.ok((await stat(path.join(out, item.trim().split(' ')[0]))).isFile());
      }
    }
    assert.equal($('.hero img').attr('fetchpriority'), 'high');
    assert.ok($('#cakeGrid .cake-card').length >= 2, 'gallery exists without JavaScript');
    assert.ok(
      $('.collection-end')
        .text()
        .includes(lang === 'fr' ? 'illustratifs' : 'توضيحية'),
      'photo provenance retained',
    );
    const schema = JSON.parse($('script[type="application/ld+json"]').text());
    assert.equal(schema['@context'], 'https://schema.org');
    const nodes = schema['@graph'],
      business = nodes.find((n) => n['@type'] === 'Bakery');
    assert.equal(business.name, config.name);
    assert.equal(business.telephone, '+' + config.phoneDigits);
    assert.deepEqual(business.sameAs, [config.instagram]);
    assert.equal(business.address.addressLocality, config.locality);
    assert.equal(business.address.addressCountry, 'MA');
    assert.equal(
      new Set(nodes.map((n) => n['@id']).filter(Boolean)).size,
      nodes.filter((n) => n['@id']).length,
    );
    for (const prohibited of [
      'aggregateRating',
      'review',
      'openingHours',
      'openingHoursSpecification',
      'priceRange',
      'geo',
      'streetAddress',
      'postalCode',
      'award',
    ])
      assert.ok(!JSON.stringify(schema).includes('"' + prohibited + '"'));
    if (page) {
      assert.ok(nodes.find((n) => n['@type'] === 'Service'));
      assert.ok(nodes.find((n) => n['@type'] === 'BreadcrumbList'));
      assert.equal($('.breadcrumbs li').length, 2);
    }
    assert.equal($('#orderForm input[name=phone]').length, 1);
    assert.equal($('#referenceFile').attr('accept'), 'image/*');
  });

test('sitemap is well-formed, canonical-only and complete; robots allows assets', async () => {
  const xml = await readFile(path.join(out, 'sitemap.xml'), 'utf8');
  assert.equal(XMLValidator.validate(xml), true);
  const sitemap = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const entries = sitemap.urlset.url || [];
  assert.equal(entries.length, preview ? 0 : 10);
  if (!preview) {
    assert.deepEqual(entries.map((e) => e.loc).sort(), pages.map((p) => origin + p.url).sort());
    for (const e of entries) {
      assert.equal(e['xhtml:link'].length, 3);
      assert.ok(!e.loc.includes('github.io'));
    }
  }
  const robots = await readFile(path.join(out, 'robots.txt'), 'utf8');
  assert.ok(robots.includes('Allow: /'));
  assert.ok(!robots.includes('Disallow:'));
  assert.equal(robots.includes('Sitemap: ' + origin + '/sitemap.xml'), !preview);
});
test('host policies cover www and root without conflicting Netlify redirects; previews cannot be indexed', async () => {
  const redirects = await readFile(path.join(out, '_redirects'), 'utf8');
  assert.ok(redirects.includes(`https://www.${new URL(origin).hostname}/* ${origin}/:splat 301!`));
  assert.ok(redirects.includes('/ /fr/ 301!'));
  for (const p of pages) {
    // Netlify pretty URLs normalize index.html and trailing slashes natively.
    // Explicit rules here previously caused redirect loops in production.
    assert.ok(!redirects.includes(`${p.url}index.html ${p.url} 301!`));
    assert.ok(!redirects.includes(`${p.url.slice(0, -1)} ${p.url} 301!`));
  }
  assert.equal(
    (await readFile(path.join(out, '_headers'), 'utf8')).includes('X-Robots-Tag: noindex'),
    preview,
  );
});
test('HTTP routes return actual HTML, permanent normalization and genuine 404', async () => {
  const server = createSiteServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const p of pages) {
      const r = await fetch(base + p.url);
      assert.equal(r.status, 200);
      assert.ok((await r.text()).includes(p.$('title').text()));
    }
    for (const [from, to] of [
      ['/', '/fr/'],
      ['/index.html', '/fr/'],
      ['/ar', '/ar/'],
      ['/fr/gateaux-mariage/index.html', '/fr/gateaux-mariage/'],
    ]) {
      const r = await fetch(base + from, { redirect: 'manual' });
      assert.equal(r.status, 301);
      assert.equal(r.headers.get('location'), to);
    }
    assert.equal((await fetch(base + '/unknown-page/')).status, 404);
    assert.equal((await fetch(base + '/assets/missing.webp')).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
