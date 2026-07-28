import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'generated-network');
const portfolio = JSON.parse(await fs.readFile(path.join(root, 'portfolio.config.json'), 'utf8'));
const domains = JSON.parse(await fs.readFile(path.join(root, 'domains.config.json'), 'utf8'));
const domainAssets = JSON.parse(await fs.readFile(path.join(root, 'domain-assets.config.json'), 'utf8'));
const topicSlugs = JSON.parse(await fs.readFile(path.join(root, 'topic-slugs.config.json'), 'utf8'));
const officialStarterPack = JSON.parse(await fs.readFile(path.join(root, 'content', 'network', 'official-starter-pack.json'), 'utf8'));
const officialProductCatalog = JSON.parse(await fs.readFile(path.join(root, 'content', 'products', 'official-starter-catalog.json'), 'utf8'));
const policyRoutes = ['about', 'editorial-policy', 'advertising-policy', 'privacy', 'contact', 'search'];

async function htmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(target) : entry.name.endsWith('.html') ? [target] : [];
  }));
  return nested.flat();
}

test('network generator creates 19 independent host-ready sites', async () => {
  const report = JSON.parse(await fs.readFile(path.join(output, 'network-report.json'), 'utf8'));
  assert.equal(report.sites, 19);
  assert.equal(report.guides, 146);
  assert.equal(report.publishedGuides, 0);
  assert.equal(report.draftGuides, 146);
  assert.equal(report.primaryDomainsReady, 19);
  assert.equal(report.redirects, 9);
  assert.equal(report.operatorReady, false);
  assert.equal(report.monetizationEnabled, false);

  const allHtml = await htmlFiles(output);
  assert.equal(allHtml.length, 299, '298 site pages plus one network control page');
});

test('every site contains guides, policies, search and deployment artifacts', async () => {
  for (const site of portfolio.verticals) {
    const domain = domains[site.slug];
    const siteRoot = path.join(output, domain);
    const registry = JSON.parse(await fs.readFile(path.join(siteRoot, 'content-registry.json'), 'utf8'));
    const search = JSON.parse(await fs.readFile(path.join(siteRoot, 'search-index.json'), 'utf8'));
    const report = JSON.parse(await fs.readFile(path.join(siteRoot, 'site-report.json'), 'utf8'));
    assert.equal(registry.length, site.topics.length);
    assert.equal(search.length, site.topics.length);
    assert.equal(report.guides, site.topics.length);
    assert.equal(report.pages, site.topics.length + 8);
    assert.equal(report.primaryDomain, domain);
    assert.equal(report.registered, true);
    assert.equal(report.publishedGuides, 0);
    assert.equal(report.drafts, site.topics.length);
    assert.deepEqual(registry.map(item => item.slug), topicSlugs[site.slug]);
    assert.ok(registry.every(item => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)));

    for (const file of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'feed.xml', 'llms.txt', 'ads.txt', '_headers', '_redirects']) {
      await fs.access(path.join(siteRoot, file));
    }
    for (const route of policyRoutes) await fs.access(path.join(siteRoot, route, 'index.html'));
    for (const slug of topicSlugs[site.slug]) await fs.access(path.join(siteRoot, 'guides', slug, 'index.html'));
  }
});

test('all network pages remain noindex until operator and article review are complete', async () => {
  for (const site of portfolio.verticals) {
    const domain = domains[site.slug];
    const siteRoot = path.join(output, domain);
    for (const file of await htmlFiles(siteRoot)) {
      const html = await fs.readFile(file, 'utf8');
      assert.match(html, /<meta name="robots" content="noindex,follow">/, file);
      assert.match(html, new RegExp(`<link rel="canonical" href="https://${domain.replaceAll('.', '\\.')}`), file);
    }
    const sitemap = await fs.readFile(path.join(siteRoot, 'sitemap.xml'), 'utf8');
    assert.doesNotMatch(sitemap, /<url>/, `${domain} must not advertise draft pages`);
  }
});

test('every local HTML, asset and feed link resolves inside its site pack', async () => {
  for (const site of portfolio.verticals) {
    const domain = domains[site.slug];
    const siteRoot = path.join(output, domain);
    for (const file of await htmlFiles(siteRoot)) {
      const html = await fs.readFile(file, 'utf8');
      const relativeFile = path.relative(output, file).replaceAll('\\', '/');
      const base = new URL(relativeFile, 'https://preview.invalid/');
      const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1]);
      for (const href of hrefs) {
        if (/^(?:https?:|mailto:|tel:|#)/.test(href)) continue;
        const resolved = new URL(href, base);
        let target = path.join(output, decodeURIComponent(resolved.pathname));
        if (resolved.pathname.endsWith('/')) target = path.join(target, 'index.html');
        await assert.doesNotReject(fs.access(target), `${relativeFile}: ${href}`);
      }
    }
  }
});

test('adult site protects every page and declares adult metadata', async () => {
  const site = portfolio.verticals.find(entry => entry.adult);
  const files = await htmlFiles(path.join(output, domains[site.slug]));
  assert.equal(files.length, site.topics.length + 8);
  for (const file of files) {
    const html = await fs.readFile(file, 'utf8');
    assert.match(html, /<meta name="rating" content="adult">/);
    assert.match(html, /<dialog id="ageGate"/);
    assert.match(html, /18歳未満の方は閲覧できません/);
  }
});

test('all defensive domains have a 301 redirect to their primary .jp site', async () => {
  const redirectAssets = domainAssets.domains.filter(entry => entry.role === 'redirect');
  const rows = (await fs.readFile(path.join(output, 'redirects.csv'), 'utf8')).trim().split(/\r?\n/);
  assert.equal(rows.length, redirectAssets.length + 1);
  for (const redirect of redirectAssets) {
    const target = domains[redirect.vertical];
    assert.ok(rows.includes(`${redirect.domain},${target},301`));
    const rules = await fs.readFile(path.join(output, target, '_redirects'), 'utf8');
    assert.match(rules, new RegExp(`https://${redirect.domain.replaceAll('.', '\\.')}\/\\* https:\/\/${target.replaceAll('.', '\\.')}\/:splat 301`));
  }
});

test('KADEN SCOPE is generated as the acquired home appliance system site', async () => {
  const siteRoot = path.join(output, 'kaden-scope.jp');
  const home = await fs.readFile(path.join(siteRoot, 'index.html'), 'utf8');
  assert.match(home, /KADEN SCOPE/);
  assert.match(home, /https:\/\/kaden-scope\.jp\//);
  assert.match(home, /10ガイドを見る/);
  const rules = await fs.readFile(path.join(siteRoot, '_redirects'), 'utf8');
  assert.match(rules, /https:\/\/kaden-scope\.com\/\* https:\/\/kaden-scope\.jp\/:splat 301/);
});

test('visible copy speaks to visitors instead of exposing operator workflow', async () => {
  const internalWording = /運用管制|公開承認|公開前ドラフト|人間レビュー|CONTENT BLUEPRINT|DRAFT|NOINDEX|Primary domain|DOMAIN COST|published ·|drafts|高単価|継続報酬|収益性/;
  for (const file of await htmlFiles(output)) {
    const html = await fs.readFile(file, 'utf8');
    assert.doesNotMatch(html, internalWording, file);
  }

  const portal = await fs.readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(portal, /迷わず選べる、19の専門ガイド/);
  assert.match(portal, /自分に合う選択肢を見つけられます/);

  const kadenHome = await fs.readFile(path.join(output, 'kaden-scope.jp', 'index.html'), 'utf8');
  assert.match(kadenHome, /選び方の基準を見る/);
  assert.match(kadenHome, /広告に左右されない/);
});

test('official starter pack adds one source-backed article to every site', async () => {
  assert.equal(officialStarterPack.length, 19);
  assert.equal(new Set(officialStarterPack.map(article => article.site)).size, 19);

  for (const article of officialStarterPack) {
    assert.ok(topicSlugs[article.site]?.includes(article.slug), `${article.site}:${article.slug}`);
    assert.equal(article.status, 'review');
    assert.equal(article.reviewedAt, '2026-07-29');
    assert.ok(article.answer.length >= 80);
    assert.ok(article.sections.length >= 2);
    assert.ok(article.sources.length >= 2);
    assert.ok(article.sources.every(source => source.url.startsWith('https://')));
    assert.ok(article.sources.every(source => source.checkedAt === '2026-07-29'));

    const domain = domains[article.site];
    const html = await fs.readFile(path.join(output, domain, 'guides', article.slug, 'index.html'), 'utf8');
    assert.match(html, new RegExp(article.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /SCARLETリサーチ/);
  }
});

test('every guide includes the private automatic choice simulator', async () => {
  for (const site of portfolio.verticals) {
    const siteRoot = path.join(output, domains[site.slug]);
    await fs.access(path.join(siteRoot, 'assets', 'decision-engine.js'));
    const client = await fs.readFile(path.join(siteRoot, 'assets', 'site.js'), 'utf8');
    assert.match(client, /evaluateDecision/);

    for (const slug of topicSlugs[site.slug]) {
      const html = await fs.readFile(path.join(siteRoot, 'guides', slug, 'index.html'), 'utf8');
      assert.match(html, /class="decision-tool"/);
      assert.match(html, /入力内容はこの端末内だけで計算され、送信・保存されません/);
      assert.match(html, /月額・維持費の上限/);
      assert.match(html, /<script type="module"/);
    }
  }
});

test('source-backed guides match diagnosis routes to 57 concrete official candidates', async () => {
  assert.equal(officialProductCatalog.length, 19);
  assert.equal(new Set(officialProductCatalog.map(catalog => `${catalog.site}:${catalog.slug}`)).size, 19);
  assert.equal(officialProductCatalog.reduce((total, catalog) => total + catalog.candidates.length, 0), 57);

  for (const catalog of officialProductCatalog) {
    assert.equal(catalog.checkedAt, '2026-07-29');
    assert.deepEqual(new Set(catalog.candidates.map(candidate => candidate.fit)), new Set(['cost', 'balance', 'assurance']));
    assert.ok(catalog.candidates.every(candidate => /^https:\/\//.test(candidate.url)));
    assert.ok(catalog.candidates.every(candidate => candidate.name && candidate.reason && candidate.caution && candidate.price));

    const html = await fs.readFile(path.join(output, domains[catalog.site], 'guides', catalog.slug, 'index.html'), 'utf8');
    assert.match(html, /条件に合いやすい具体候補/);
    assert.equal([...html.matchAll(/data-candidate(?:\s|>)/g)].length, 3);
    for (const candidate of catalog.candidates) assert.match(html, new RegExp(candidate.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

