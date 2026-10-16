import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};
export function createSiteServer() {
  return createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const url = new URL(req.url, 'http://localhost');
      const requested = decodeURIComponent(url.pathname);
      const target = path.resolve(output, '.' + requested);
      if (target !== output && !target.startsWith(output + path.sep)) {
        res.writeHead(400);
        res.end();
        return;
      }
      let redirect;
      if (requested === '/' || requested === '/index.html') redirect = '/fr/';
      else if (requested.endsWith('/index.html')) redirect = requested.slice(0, -10);
      else if ((await stat(target).catch(() => null))?.isDirectory() && !requested.endsWith('/'))
        redirect = requested + '/';
      if (redirect) {
        res.writeHead(301, { Location: redirect + url.search });
        res.end();
        return;
      }
      let file = target;
      if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
      let bytes = await readFile(file).catch(() => null),
        status = 200;
      if (!bytes) {
        bytes = await readFile(path.join(output, '404.html'));
        file = '404.html';
        status = 404;
      }
      const headers = {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control':
          requested.startsWith('/assets/site.') || requested.startsWith('/assets/fonts/')
            ? 'public, max-age=31536000, immutable'
            : requested.startsWith('/assets/')
              ? 'public, max-age=86400'
              : 'public, max-age=0, must-revalidate',
      };
      // Mirror the preview policy during local tests; production rules live in dist/_headers.
      const policy = await readFile(path.join(output, '_headers'), 'utf8');
      if (policy.includes('X-Robots-Tag: noindex')) headers['X-Robots-Tag'] = 'noindex, nofollow';
      if (/text\/|application\/(xml|json|manifest)/.test(headers['Content-Type'])) {
        headers.Vary = 'Accept-Encoding';
        if (req.headers['accept-encoding']?.includes('gzip')) {
          bytes = gzipSync(bytes);
          headers['Content-Encoding'] = 'gzip';
        }
      }
      res.writeHead(status, headers);
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.writeHead(500);
      res.end('Build the site with npm run build before serving.');
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createSiteServer().listen(port, '127.0.0.1', () =>
    console.log(`Sweet by Salma: http://127.0.0.1:${port}`),
  );
}
