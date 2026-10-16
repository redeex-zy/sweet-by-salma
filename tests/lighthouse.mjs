import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';
import { createSiteServer } from '../tools/serve.mjs';
import { chromiumPath } from './browser-helpers.mjs';

await mkdir('test-results', { recursive: true });
const server = createSiteServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = await launch({
  chromePath: chromiumPath(),
  chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check'],
});
try {
  const metrics = [];
  for (const [name, url] of [
    ['fr-home', '/fr/'],
    ['ar-home', '/ar/'],
    ['fr-wedding', '/fr/gateaux-mariage/'],
  ]) {
    const result = await lighthouse(`http://127.0.0.1:${server.address().port}${url}`, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      logLevel: 'error',
    });
    await writeFile(`test-results/lighthouse-${name}.json`, result.report);
    const { lhr } = result;
    const row = {
      page: url,
      scores: Object.fromEntries(
        Object.entries(lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
      ),
      lcp: lhr.audits['largest-contentful-paint'].displayValue,
      cls: lhr.audits['cumulative-layout-shift'].displayValue,
      tbt: lhr.audits['total-blocking-time'].displayValue,
      failed: Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 1)
        .map((a) => ({ id: a.id, score: a.score, title: a.title, displayValue: a.displayValue })),
    };
    metrics.push(row);
    console.log(JSON.stringify(row));
  }
  await writeFile('test-results/lighthouse-summary.json', JSON.stringify(metrics, null, 2));
} finally {
  await chrome.kill();
  await new Promise((resolve) => server.close(resolve));
}
