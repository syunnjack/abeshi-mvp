import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'generated-portfolio');
const portfolio = JSON.parse(await fs.readFile(path.join(root, 'portfolio.config.json'), 'utf8'));
const domains = JSON.parse(await fs.readFile(path.join(root, 'domains.config.json'), 'utf8'));
const pad = value => String(value).padStart(2, '0');
const siteDirectory = site => `${pad(site.rank)}-${site.slug}`;

async function htmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(target) : entry.name.endsWith('.html') ? [target] : [];
  }));
  return nested.flat();
}

test('portfolio contains all 19 sites and 146 topic blueprints', () => {
  assert.equal(portfolio.verticals.length, 19);
  assert.equal(portfolio.verticals.reduce((sum, site) => sum + site.topics.length, 0), 146);
  assert.equal(Object.keys(domains).length, 19);
  for (const site of portfolio.verticals) assert.equal(typeof domains[site.slug], 'string');
});

test('generated portfolio has every expected page and all pages stay noindex', async () => {
  const files = await htmlFiles(output);
  assert.equal(files.length, 166, '165 site pages plus the portfolio index');
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    assert.match(html, /<meta name="robots" content="noindex(?:,follow)?">/, file);
    assert.match(html, /<meta charset="utf-8">/, file);
  }
  for (const site of portfolio.verticals) {
    const directory = siteDirectory(site);
    await fs.access(path.join(output, directory, 'index.html'));
    for (let index = 0; index < site.topics.length; index += 1) {
      await fs.access(path.join(output, directory, 'guides', pad(index + 1), 'index.html'));
    }
  }
});

test('all generated internal links resolve to an HTML page', async () => {
  const files = await htmlFiles(output);
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map(match => match[1].split('#')[0]);
    for (const href of hrefs) {
      if (href === '/assets/portfolio.css') {
        await fs.access(path.join(output, 'assets', 'portfolio.css'));
        continue;
      }
      const target = href === '/' ? path.join(output, 'index.html') : path.join(output, href, 'index.html');
      await assert.doesNotReject(fs.access(target), `${file}: ${href}`);
    }
  }
});

test('adult site and guides include age-gate and adult metadata', async () => {
  const adult = portfolio.verticals.find(site => site.adult);
  assert.ok(adult);
  const directory = path.join(output, siteDirectory(adult));
  const files = await htmlFiles(directory);
  assert.equal(files.length, adult.topics.length + 1);
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    assert.match(html, /<meta name="rating" content="adult">/);
    assert.match(html, /<dialog id="ageGate">/);
    assert.match(html, /18歳未満の方は閲覧できません/);
  }
});

test('domain CSV contains one row for every site', async () => {
  const rows = (await fs.readFile(path.join(output, 'domains.csv'), 'utf8')).trim().split(/\r?\n/);
  assert.equal(rows.length, 20);
  assert.equal(rows[0], 'rank,site,brand,domain');
});

