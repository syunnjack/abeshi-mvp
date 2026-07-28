import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'generated-network');
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');
const server = path.join(dist, 'server');
const hosting = path.join(root, '.openai', 'hosting.json');

await fs.access(path.join(source, 'network-report.json'));
await fs.access(hosting);
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(server, { recursive: true });
await fs.cp(source, client, { recursive: true });
await fs.mkdir(path.join(dist, '.openai'), { recursive: true });
await fs.copyFile(hosting, path.join(dist, '.openai', 'hosting.json'));

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/')) url.pathname += 'index.html';
    const response = await env.ASSETS.fetch(new Request(url, request));
    if (response.status !== 404) return response;
    const fallback = new URL('/index.html', url);
    return env.ASSETS.fetch(new Request(fallback, request));
  }
};
`;
await fs.writeFile(path.join(server, 'index.js'), worker);
console.log('hosting build ready: dist/server/index.js and dist/client');