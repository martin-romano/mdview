import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, page, escapeHtml } from './render.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

const isMarkdown = (p) => /\.(md|markdown|mdown)$/i.test(p);
const IGNORED = /(^|[\\/])(node_modules|\.git)([\\/]|$)/;

// Resolve a URL path to a real path inside root, or null if it escapes.
function resolveInside(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const target = path.join(root, decoded);
  let real;
  try {
    real = fs.realpathSync(target);
  } catch {
    return null;
  }
  const rel = path.relative(root, real);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return real;
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function notFound(res) {
  send(res, 404, 'text/html; charset=utf-8', page({ title: 'Not found', body: '<h1>404</h1><p>Not found.</p>', live: false }));
}

function directoryListing(root, dir, urlPath) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
    .filter((e) => e.isDirectory() || isMarkdown(e.name))
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
  const base = urlPath.endsWith('/') ? urlPath : urlPath + '/';
  const items = entries.map((e) => {
    const href = base + encodeURIComponent(e.name) + (e.isDirectory() ? '/' : '');
    return `<li class="${e.isDirectory() ? 'dir' : 'file'}"><a href="${href}">${escapeHtml(e.name)}${e.isDirectory() ? '/' : ''}</a></li>`;
  });
  if (dir !== root) items.unshift(`<li class="dir"><a href="${base}../">../</a></li>`);
  const shown = '/' + path.relative(root, dir).split(path.sep).filter(Boolean).join('/');
  return page({
    title: shown,
    body: `<h1>Index of ${escapeHtml(shown)}</h1><ul class="index">${items.join('') || '<li><em>No markdown files</em></li>'}</ul>`,
  });
}

export function createServer(root) {
  const clients = new Set();

  try {
    const watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
      if (!filename || IGNORED.test(filename)) return;
      for (const c of clients) c.write(`data: ${JSON.stringify(filename)}\n\n`);
    });
    watcher.on('error', () => {});
  } catch {
    // Recursive watch unsupported here; live reload is disabled.
  }

  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Method not allowed');

    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/__mdview/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (url.pathname === '/__mdview/style.css' || url.pathname === '/__mdview/client.js') {
      const file = path.join(publicDir, path.basename(url.pathname));
      return send(res, 200, MIME[path.extname(file)], fs.readFileSync(file));
    }

    const real = resolveInside(root, url.pathname);
    if (!real) return notFound(res);

    const stat = fs.statSync(real);
    if (stat.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' });
        return res.end();
      }
      return send(res, 200, 'text/html; charset=utf-8', directoryListing(root, real, url.pathname));
    }

    if (isMarkdown(real)) {
      const source = fs.readFileSync(real, 'utf8');
      return send(res, 200, 'text/html; charset=utf-8', page({ title: path.basename(real), body: renderMarkdown(source) }));
    }

    const type = MIME[path.extname(real).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(real).pipe(res);
  });

  return server;
}
