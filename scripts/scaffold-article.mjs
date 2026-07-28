import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portfolio = JSON.parse(await fs.readFile(path.join(root, 'portfolio.config.json'), 'utf8'));
const topicSlugs = JSON.parse(await fs.readFile(path.join(root, 'topic-slugs.config.json'), 'utf8'));
const [siteSlug, articleSlug] = process.argv.slice(2);

if (!siteSlug || !articleSlug) {
  console.error('Usage: npm run scaffold:article -- <site-slug> <article-slug>');
  process.exit(1);
}

const site = portfolio.verticals.find(entry => entry.slug === siteSlug);
if (!site) {
  console.error(`Unknown site: ${siteSlug}`);
  process.exit(1);
}
const index = topicSlugs[siteSlug]?.indexOf(articleSlug) ?? -1;
if (index < 0) {
  console.error(`Unknown article slug for ${siteSlug}: ${articleSlug}`);
  process.exit(1);
}

const topic = site.topics[index];
const target = path.join(root, 'content', 'network', siteSlug, `${articleSlug}.json`);
try {
  await fs.access(target);
  console.error(`Article already exists: ${path.relative(root, target)}`);
  process.exit(1);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const article = {
  site: siteSlug,
  slug: articleSlug,
  title: `${topic}の選び方・比較・検証ガイド`,
  description: `${topic}について、条件、総費用、品質、保証、向く人、注意点を独自検証と一次情報から説明します。`,
  answer: `${topic}を選ぶときは、価格だけでなく利用条件、総費用、品質、保証・解約、運営者、実測または一次体験を同じ条件で確認します。対象読者と検証結果を具体的に追記してください。`,
  sections: [
    { heading: '選ぶ前に確認すること', body: '対象読者、利用目的、予算、利用頻度、設置・利用環境を具体的に記載します。' },
    { heading: '比較・検証結果', body: '検証対象、条件、期間、数値、観測結果、限界を記載します。' }
  ],
  sources: [],
  author: '',
  reviewer: '',
  reviewedAt: '',
  status: 'draft',
  mature: Boolean(site.adult)
};

await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `${JSON.stringify(article, null, 2)}\n`);
console.log(`Created ${path.relative(root, target)}`);

