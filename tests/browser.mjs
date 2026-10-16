import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createSiteServer } from '../tools/serve.mjs';
import { services, route } from '../src/pages.mjs';
import { chromiumPath } from './browser-helpers.mjs';

await mkdir('test-results', { recursive: true });
const server = createSiteServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
const failures = [],
  summary = [];
async function check(name, fn) {
  try {
    await fn();
    summary.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    summary.push({ name, passed: false, error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  for (const lang of ['fr', 'ar'])
    for (const service of [null, ...services])
      await check(`route, images and accessibility ${route(lang, service)}`, async () => {
        errors.length = 0;
        const response = await page.goto(base + route(lang, service));
        assert.equal(response.status(), 200);
        await expect(page.locator('html')).toHaveClass('js');
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() =>
          Promise.all(
            [...document.querySelectorAll('img[src]')].map((img) => {
              img.loading = 'eager';
              return img.decode();
            }),
          ),
        );
        assert.deepEqual(errors, []);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        await writeFile(
          `test-results/axe-${lang}-${service?.id || 'home'}.json`,
          JSON.stringify(results.violations, null, 2),
        );
        assert.equal(
          results.violations.length,
          0,
          JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes
                .slice(0, 5)
                .map((n) => ({ target: n.target, summary: n.failureSummary })),
            })),
            null,
            2,
          ),
        );
        for (const width of [360, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `horizontal overflow at ${width}px`,
          );
        }
        if (!service) {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.screenshot({ path: `test-results/home-${lang}-mobile.png`, fullPage: true });
        }
        if (service?.id === 'wedding') {
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.screenshot({
            path: `test-results/wedding-${lang}-desktop.png`,
            fullPage: true,
          });
        }
      });
  for (const lang of ['fr', 'ar'])
    await check(`filters, gallery, keyboard and language switch ${lang}`, async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base + route(lang));
      await page.locator('#menuToggle').click();
      await expect(page.locator('#menuToggle')).toHaveAttribute('aria-expanded', 'true');
      await page.locator('#mainNav a').nth(1).click();
      await expect(page.locator('#menuToggle')).toHaveAttribute('aria-expanded', 'false');
      for (const button of await page.locator('[data-filter]').all()) {
        await button.click();
        const category = await button.getAttribute('data-filter');
        const cards = page.locator('.cake-card:visible');
        assert.ok((await cards.count()) > 0);
        if (category !== 'all')
          for (const card of await cards.all())
            assert.equal(await card.getAttribute('data-category'), category);
        await expect(button).toHaveAttribute('aria-pressed', 'true');
      }
      await page.locator('[data-filter=all]').click();
      assert.equal(await page.locator('.cake-card:visible').count(), 19);
      const trigger = page.locator('.cake-photo').first();
      await trigger.click();
      await expect(page.locator('#imageModal')).toBeVisible();
      await page.locator('#modalImage').evaluate((img) => img.decode());
      const first = await page.locator('#modalImage').getAttribute('src');
      await page.locator('#nextImage').click();
      assert.notEqual(await page.locator('#modalImage').getAttribute('src'), first);
      await page.locator('#prevImage').click();
      assert.equal(await page.locator('#modalImage').getAttribute('src'), first);
      await page.locator('#closeImage').focus();
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('#modalOrder')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#closeImage')).toBeFocused();
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      assert.equal(axe.violations.length, 0, axe.violations.map((v) => v.id).join(','));
      await page.keyboard.press('Escape');
      await expect(page.locator('#imageModal')).toBeHidden();
      await expect(trigger).toBeFocused();
      await page.goto(base + route(lang, services[1]));
      await page.locator('#langSwitch').click();
      assert.equal(new URL(page.url()).pathname, route(lang === 'fr' ? 'ar' : 'fr', services[1]));
    });
  for (const lang of ['fr', 'ar'])
    await check(`order validation, Casablanca deadline, photo and WhatsApp ${lang}`, async () => {
      await page.goto(base + route(lang));
      await page.clock.install({ time: new Date('2026-06-01T23:30:00Z') });
      await page.reload();
      assert.equal(await page.locator('input[name=date]').getAttribute('min'), '2026-06-06');
      const submit = page.locator('#orderForm button[type=submit]');
      await submit.click();
      await expect(page.locator('input[name=name]')).toBeFocused();
      await expect(page.locator('#formError')).not.toBeEmpty();
      await page.locator('input[name=name]').fill(lang === 'fr' ? 'Cliente test' : 'زبونة للتجربة');
      await page.locator('input[name=phone]').fill('abc');
      await page.locator('select[name=occasion]').selectOption('birthday');
      await page.locator('input[name=date]').fill('2026-06-06');
      await page
        .locator('textarea[name=design]')
        .fill(
          lang === 'fr'
            ? 'Décor rose, texte « Joyeux anniversaire »'
            : 'زينة وردية وعبارة عيد ميلاد سعيد',
        );
      await submit.click();
      await expect(page.locator('input[name=phone]')).toHaveAttribute('aria-invalid', 'true');
      await page.locator('input[name=phone]').fill('+212 628 801635');
      await page.locator('input[name=date]').fill('2026-06-05');
      await submit.click();
      await expect(page.locator('input[name=date]')).toHaveAttribute('aria-invalid', 'true');
      await page.locator('input[name=date]').fill('2026-06-06');
      await page.locator('input[name=servings]').fill('1.5');
      await submit.click();
      await expect(page.locator('input[name=servings]')).toHaveAttribute('aria-invalid', 'true');
      await page.locator('input[name=servings]').fill('12');
      await page
        .locator('#referenceFile')
        .setInputFiles({
          name: 'large.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(11 * 1024 * 1024),
        });
      await submit.click();
      await expect(page.locator('#referenceFile')).toHaveAttribute('aria-invalid', 'true');
      await page
        .locator('#referenceFile')
        .setInputFiles({
          name: 'inspiration.png',
          mimeType: 'image/png',
          buffer: await readFile('favicon-32.png'),
        });
      await page.locator('input[name=newDesign]').check();
      await submit.click();
      await expect(page.locator('#reviewModal')).toBeVisible();
      await expect(page.locator('#photoReminder')).toBeVisible();
      const href = new URL(await page.locator('#confirmWhatsApp').getAttribute('href'));
      assert.equal(href.origin, 'https://wa.me');
      assert.equal(href.pathname, '/212628801635');
      const message = href.searchParams.get('text');
      assert.ok(message.includes('06/06/2026'));
      assert.ok(message.includes('12'));
      assert.ok(message.includes(lang === 'fr' ? 'Cliente test' : 'زبونة للتجربة'));
      assert.equal(await page.locator('#reviewText').textContent(), message);
      assert.ok(!message.includes('inspiration.png'), 'attachment is not automatically sent');
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      assert.equal(axe.violations.length, 0, axe.violations.map((v) => v.id).join(','));
      await page.locator('#closeReview').click();
      await expect(page.locator('#reviewModal')).toBeHidden();
      await expect(submit).toBeFocused();
    });
  await context.close();
  await check('all ten pages and language links work without JavaScript', async () => {
    const nojs = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 360, height: 800 },
    });
    const tab = await nojs.newPage();
    for (const lang of ['fr', 'ar'])
      for (const service of [null, ...services]) {
        await tab.goto(base + route(lang, service));
        await expect(tab.locator('h1')).toBeVisible();
        assert.ok((await tab.locator('.cake-card').count()) >= 2);
        await expect(tab.locator('#orderForm')).toBeHidden();
        await expect(tab.locator('.nojs-order')).toBeVisible();
        assert.ok(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await tab.locator('#langSwitch').click();
        assert.equal(new URL(tab.url()).pathname, route(lang === 'fr' ? 'ar' : 'fr', service));
      }
    await nojs.close();
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await writeFile('test-results/browser-summary.json', JSON.stringify(summary, null, 2));
}
console.log(`${summary.length - failures.length}/${summary.length} browser checks passed`);
if (failures.length) process.exitCode = 1;
