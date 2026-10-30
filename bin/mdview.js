#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';

const usage = `Usage: mdview [path] [--port <n>] [--no-open]

  path        a markdown file or a directory (default: current directory)
  --port, -p  port to listen on (default: random free port)
  --no-open   don't open the browser`;

const args = process.argv.slice(2);
let target = '.';
let port = 0;
let open = true;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-h' || a === '--help') { console.log(usage); process.exit(0); }
  else if (a === '--no-open') open = false;
  else if (a === '-p' || a === '--port') port = Number(args[++i]);
  else if (a.startsWith('-')) { console.error(`Unknown option: ${a}\n\n${usage}`); process.exit(1); }
  else target = a;
}

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Invalid port.');
  process.exit(1);
}

let real;
try {
  real = fs.realpathSync(path.resolve(target));
} catch {
  console.error(`No such file or directory: ${target}`);
  process.exit(1);
}

const isDir = fs.statSync(real).isDirectory();
const root = isDir ? real : path.dirname(real);
const urlPath = isDir ? '/' : '/' + path.basename(real).split('/').map(encodeURIComponent).join('/');

const server = createServer(root);
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}${urlPath}`;
  console.log(`Serving ${root}\n${url}`);
  if (open) {
    const [cmd, ...cmdArgs] =
      process.platform === 'darwin' ? ['open', url]
      : process.platform === 'win32' ? ['cmd', '/c', 'start', '', url]
      : ['xdg-open', url];
    spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  }
});

process.on('SIGINT', () => process.exit(0));
