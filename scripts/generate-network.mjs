import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'generated-network');
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const [portfolio, domains, domainAssets, network, themes, topicSlugs] = await Promise.all([
  readJson('portfolio.config.json'),
  readJson('domains.config.json'),
  readJson('domain-assets.config.json'),
  readJson('network.config.json'),
  readJson('site-themes.config.json'),
  readJson('topic-slugs.config.json')
]);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const isoDate = new Date().toISOString();
const publishedDate = isoDate.slice(0, 10);
const operatorReady = Boolean(network.operator.name && network.operator.contactEmail);
const registered = new Set(domainAssets.domains.map(entry => entry.domain));
const primaryAsset = slug => domainAssets.domains.find(entry => entry.vertical === slug && entry.role === 'primary');
const aliases = slug => domainAssets.domains.filter(entry => entry.vertical === slug && entry.role === 'redirect').map(entry => entry.domain);

async function listJsonFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? listJsonFiles(target) : entry.name.endsWith('.json') ? [target] : [];
    }))).flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const articleFiles = await listJsonFiles(path.join(root, 'content', 'network'));
const articleRecords = await Promise.all(articleFiles.map(async file => JSON.parse(await fs.readFile(file, 'utf8'))));
const articlesByKey = new Map(articleRecords.map(record => [`${record.site}:${record.slug}`, record]));
const requiredFields = network.publishing.requiredArticleFields;
const isPublishable = record => Boolean(
  operatorReady &&
  record?.status === 'published' &&
  requiredFields.every(field => {
    const value = record[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  })
);

const policyRoutes = [
  ['about', 'このサイトについて'],
  ['editorial-policy', '編集方針'],
  ['advertising-policy', '広告について'],
  ['privacy', 'プライバシーポリシー'],
  ['contact', 'お問い合わせ'],
  ['search', 'サイト内検索']
];

const readerSafetyCopy = {
  standard: '条件と違いを分かりやすく整理しています。',
  review: '価格・契約条件・安全面もあわせてご確認ください。',
  ymyl: '健康・金融・安全の情報は、公的資料や専門家の案内もあわせてご確認ください。',
  sensitive: '本人確認、プライバシー保護、退会方法までご確認ください。',
  adult: '18歳以上の方を対象に、同意・権利・決済・プライバシーの注意点をご案内します。'
};

const readerSiteCopy = {
  'tech-stack': 'PC、スマホ、AIツール、SaaSなどを、性能・料金・使いやすさから比べられます。',
  'business-ops': '店舗設備、POS、決済端末、法人向けサービスを、導入費用と使い勝手から選べます。',
  'work-career': '転職、副業、フリーランス、仕事に役立つサービスを、自分の働き方に合わせて比べられます。',
  learning: '資格、語学、オンライン講座、教材を、目標・学習期間・費用から選べます。',
  'home-appliance': 'テレビ、掃除機、エアコンなどの家電を、性能・電気代・使いやすさから比べられます。',
  travel: 'ホテル、交通、レンタカー、旅行用品を、予算と旅の目的に合わせて選べます。',
  'home-living': '家具、寝具、収納、住宅設備を、暮らし方・費用・使い続けやすさから比べられます。',
  outdoor: 'キャンプ、登山、釣り、自転車用品を、経験や利用シーンに合わせて選べます。',
  beauty: 'コスメ、スキンケア、サロンなどを、目的・成分・費用・注意点から確かめられます。',
  mobility: '自動車、バイク、カー用品、カーシェアを、総費用・安全性・使い方から比べられます。',
  food: '飲料、食品、宅配食、調理器具を、味・価格・続けやすさから選べます。',
  'hobby-entertainment': 'ゲーム、配信、電子書籍、音楽、模型などを、楽しみ方と予算に合わせて探せます。',
  'pet-life': 'ペットフード、用品、保険、見守りサービスを、健康と暮らしやすさから比べられます。',
  'local-guide': '飲食店、サウナ、映画館、駐車場など、地域で役立つ場所やサービスを探せます。',
  'health-fitness': '運動、睡眠、宅配食、健康管理サービスを、目的と安全面から比べられます。',
  matching: '婚活や交流サービスを、料金・本人確認・プライバシー・使いやすさから選べます。',
  parenting: 'ベビー用品、知育玩具、学習用品、家族向け施設を、年齢と暮らし方に合わせて探せます。',
  'finance-tools': '家計管理、決済、ポイント、法人カードなどを、費用・機能・安全性から比べられます。',
  adult: '成人向けサービスや商品を、料金・プライバシー・安全性・解約条件から慎重に選べます。'
};

const siteDescription = site => readerSiteCopy[site.slug] || `${site.name}の選び方を分かりやすくご案内します。`;

function themeStyle(site) {
  const theme = themes[site.slug];
  return `--accent:${theme.accent};--surface:${theme.surface};--ink:${theme.ink}`;
}

function localLinks(prefix) {
  return {
    home: prefix || './',
    search: `${prefix}search/`,
    about: `${prefix}about/`,
    editorial: `${prefix}editorial-policy/`,
    advertising: `${prefix}advertising-policy/`,
    privacy: `${prefix}privacy/`,
    contact: `${prefix}contact/`,
    assets: `${prefix}assets/`
  };
}

function ageGate() {
  return `<dialog id="ageGate" class="age-gate"><form method="dialog"><strong>18+</strong><h2>成人向けサイトです</h2><p>18歳未満の方は閲覧できません。年齢条件を満たす場合のみ先へ進んでください。</p><div><a href="https://www.google.com/">退出</a><button id="ageConfirm" value="confirm">18歳以上です</button></div></form></dialog>`;
}

function organizationSchema(site, domain) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.brand,
    legalName: network.operator.legalName || undefined,
    url: `https://${domain}/`,
    email: network.operator.contactEmail || undefined
  };
}

function websiteSchema(site, domain) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.brand,
    url: `https://${domain}/`,
    inLanguage: network.language,
    potentialAction: {
      '@type': 'SearchAction',
      target: `https://${domain}/search/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

function layout(site, {
  title,
  description,
  canonicalPath = '/',
  prefix = '',
  body,
  schemas = [],
  indexable = false,
  pageType = 'website',
  searchPage = false
}) {
  const domain = domains[site.slug];
  const links = localLinks(prefix);
  const robots = indexable ? 'index,follow,max-image-preview:large,max-snippet:-1' : 'noindex,follow';
  const adultMeta = site.adult ? '<meta name="rating" content="adult"><meta name="rating" content="RTA-5042-1996-1400-1577-RTA">' : '';
  return `<!doctype html><html lang="ja" style="${themeStyle(site)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${robots}"><title>${escapeHtml(title)} | ${escapeHtml(site.brand)}</title><meta name="description" content="${escapeHtml(description)}">${adultMeta}<link rel="canonical" href="https://${domain}${canonicalPath}"><meta property="og:type" content="${pageType}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="https://${domain}${canonicalPath}"><meta property="og:site_name" content="${escapeHtml(site.brand)}"><meta name="twitter:card" content="summary"><link rel="manifest" href="${links.assets}manifest.webmanifest"><link rel="alternate" type="application/rss+xml" href="${prefix}feed.xml" title="${escapeHtml(site.brand)}"><link rel="stylesheet" href="${links.assets}site.css">${schemas.map(schema => `<script type="application/ld+json">${safeJson(schema)}</script>`).join('')}</head><body${site.adult ? ' data-adult="true"' : ''}><header class="site-header"><a class="brand" href="${links.home}"><span>${escapeHtml(site.brand.slice(0, 1))}</span><b>${escapeHtml(site.brand)}</b></a><button class="nav-toggle" aria-expanded="false" aria-controls="siteNav">メニュー</button><nav id="siteNav"><a href="${links.home}#guides">ガイド</a><a href="${links.search}">検索</a><a href="${links.editorial}">選び方の方針</a><a href="${links.about}">このサイトについて</a></nav></header>${body}<footer><div><b>${escapeHtml(site.brand)}</b><p>${escapeHtml(siteDescription(site))}</p></div><nav><a href="${links.advertising}">広告について</a><a href="${links.privacy}">プライバシー</a><a href="${links.contact}">お問い合わせ</a></nav><small>© ${new Date().getFullYear()} ${escapeHtml(site.brand)}</small></footer>${site.adult ? ageGate() : ''}${searchPage ? `<script>window.SCARLET_SEARCH_INDEX='../search-index.json'</script>` : ''}<script src="${links.assets}site.js" defer></script></body></html>`;
}

function homePage(site) {
  const domain = domains[site.slug];
  const slugs = topicSlugs[site.slug];
  const cards = site.topics.map((topic, index) => `<a class="guide-card" href="guides/${slugs[index]}/"><small>GUIDE ${String(index + 1).padStart(2, '0')}</small><h2>${escapeHtml(topic)}の選び方・比較・検証</h2><p>条件、一次情報、向く人、注意点から判断できるページです。</p><span>ガイドを見る →</span></a>`).join('');
  const body = `<main><section class="hero"><div><p class="eyebrow">INDEPENDENT DECISION GUIDE</p><h1>${escapeHtml(site.name)}を、<br><em>根拠から選ぶ。</em></h1><p>${escapeHtml(siteDescription(site))}</p><div class="hero-actions"><a href="#guides">${site.topics.length}ガイドを見る</a><a class="subtle" href="editorial-policy/">選び方の基準を見る</a></div></div><aside><span>QUICK OVERVIEW</span><strong>${site.topics.length}</strong><p>選べる専門テーマ</p><dl><div><dt>比較</dt><dd>料金・条件・違いを整理</dd></div><div><dt>安心</dt><dd>${escapeHtml(readerSafetyCopy[site.risk])}</dd></div></dl></aside></section><section class="principles"><article><b>01</b><h2>結論がわかる</h2><p>大切なポイントを先に、条件や例外も簡潔に説明します。</p></article><article><b>02</b><h2>根拠を確かめる</h2><p>実測、試用、取材、公式情報を分けてお伝えします。</p></article><article><b>03</b><h2>広告に左右されない</h2><p>広告報酬の大きさでおすすめ順位を変えません。</p></article></section><section id="guides" class="guide-section"><div class="section-title"><div><p class="eyebrow">GUIDE LIBRARY</p><h2>${escapeHtml(site.name)}の専門ガイド</h2></div><p>料金・条件・向いている人・注意点を整理し、自分に合う選択肢を見つけやすくしています。</p></div><div class="guide-grid">${cards}</div></section></main>`;
  return layout(site, {
    title: `${site.name}の比較・選び方・検証`,
    description: siteDescription(site),
    body,
    schemas: [organizationSchema(site, domain), websiteSchema(site, domain)],
    indexable: operatorReady,
    pageType: 'website'
  });
}

function comparisonRows(site) {
  const rows = [
    ['料金・総費用', '初期費用、継続費用、追加費用', '同じ利用条件で総額を計算'],
    ['品質・性能', '仕様値と実使用の差', '条件を固定して複数回確認'],
    ['契約・保証', '解約、返品、保証、問い合わせ', '公式規約と実際の手順を確認'],
    ['向く人・向かない人', '利用目的、頻度、環境の違い', '複数の利用シナリオで比較']
  ];
  if (site.risk === 'ymyl') rows.push(['専門性・安全性', '資格、根拠、禁忌、個人差', '専門家レビューと公的資料']);
  if (site.risk === 'sensitive') rows.push(['安全・プライバシー', '本人確認、通報、データ管理', '規約、窓口、退会手順を確認']);
  if (site.adult) rows.push(['成人・同意確認', '年齢、同意、削除申請、決済表示', '提供会社の方針と申請窓口を確認']);
  return rows;
}

function guidePage(site, topic, slug) {
  const domain = domains[site.slug];
  const record = articlesByKey.get(`${site.slug}:${slug}`);
  const published = isPublishable(record);
  const title = record?.title || `${topic}の選び方・比較・検証ガイド`;
  const description = record?.description || `${topic}について、価格だけでなく条件・根拠・向いている人・注意点から判断するためのガイドです。`;
  const answer = record?.answer || `${topic}は、価格だけでなく利用条件、総費用、保証・解約、提供会社、実測結果や利用者の体験も確認して選びましょう。公式情報で最新条件を確かめ、自分の目的に合う選択肢を比べることが大切です。`;
  const sections = record?.sections?.map(section => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`).join('') || '';
  const sources = record?.sources?.length ? `<section class="sources"><h2>根拠・参照資料</h2><ol>${record.sources.map(source => `<li><a href="${escapeHtml(source.url)}" rel="noopener">${escapeHtml(source.label)}</a><small>確認 ${escapeHtml(source.checkedAt)}</small></li>`).join('')}</ol></section>` : '<section class="sources pending"><h2>根拠・参照資料</h2><p>参考資料と確認方法を順次追加しています。重要な判断をする際は、公式サイトの最新情報もあわせてご確認ください。</p></section>';
  const rows = comparisonRows(site).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  const disclosure = network.monetization.disclosure;
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': published ? 'Article' : 'WebPage',
    headline: title,
    description,
    url: `https://${domain}/guides/${slug}/`,
    inLanguage: 'ja',
    isFamilyFriendly: !site.adult,
    author: record?.author ? { '@type': 'Person', name: record.author } : undefined,
    dateModified: record?.reviewedAt || undefined,
    about: topic
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `https://${domain}/` },
      { '@type': 'ListItem', position: 2, name: topic, item: `https://${domain}/guides/${slug}/` }
    ]
  };
  const body = `<main class="article"><nav class="breadcrumb"><a href="../../">${escapeHtml(site.name)}</a><span>/</span><span>${escapeHtml(topic)}</span></nav><header class="article-head"><p class="eyebrow">CHOICE GUIDE</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><div><span>比較ポイント</span><span>注意事項</span><span>${escapeHtml(readerSafetyCopy[site.risk])}</span></div></header><article><aside class="answer"><b>まず確認したいこと</b><p>${escapeHtml(answer)}</p></aside>${sections}<section><h2>比較する項目</h2><div class="table-wrap"><table><thead><tr><th>比較軸</th><th>確認する情報</th><th>確かめ方</th></tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>納得して選ぶ3ステップ</h2><div class="steps"><article><b>01</b><h3>使う条件を決める</h3><p>目的、予算、利用頻度、使う環境を先に整理します。</p></article><article><b>02</b><h3>同じ条件で比べる</h3><p>料金、使いやすさ、保証、解約条件をそろえて比較します。</p></article><article><b>03</b><h3>気になる点を確認する</h3><p>個人差、追加費用、向かない条件を申し込み前に確かめます。</p></article></div></section><aside class="disclosure"><b>広告について</b><p>${escapeHtml(disclosure)}</p></aside>${sources}<section class="review"><h2>安心してご利用いただくために</h2><p>料金・仕様・契約条件は変更される場合があります。購入や申し込みの前に、公式サイトで最新情報をご確認ください。</p><p>${published ? `情報確認日: ${escapeHtml(record.reviewedAt)}` : '内容は順次確認・更新しています。'}</p></section></article></main>`;
  return layout(site, {
    title,
    description,
    canonicalPath: `/guides/${slug}/`,
    prefix: '../../',
    body,
    schemas: [pageSchema, breadcrumbs],
    indexable: published,
    pageType: 'article'
  });
}

function policyBody(site, route) {
  const operator = network.operator.name;
  const email = network.operator.contactEmail;
  const formUrl = network.contact.formUrl;
  const publisherDetails = operatorReady ? `<dl><div><dt>サイト名</dt><dd>${escapeHtml(site.brand)}</dd></div><div><dt>発行者</dt><dd>${escapeHtml(operator)}</dd></div><div><dt>連絡先</dt><dd>${escapeHtml(email)}</dd></div></dl>` : '<aside class="pending"><b>詳しいご案内について</b><p>このサイトに関する詳しい情報と連絡先は、準備が整い次第こちらでご案内します。</p></aside>';
  const bodies = {
    about: `<h1>このサイトについて</h1><p>${escapeHtml(site.brand)}は、${escapeHtml(site.name)}を選ぶときに役立つ条件・根拠・注意点を、分かりやすく整理する専門ガイドです。</p><h2>お届けする情報</h2><p>料金や仕様だけでなく、向いている人、契約条件、保証、安全面まで比べられる情報を目指しています。</p>${publisherDetails}`,
    'editorial-policy': `<h1>選び方の方針</h1><p>ご自身の条件に合うものを判断できるよう、比較の基準を分かりやすくお伝えします。</p><h2>情報の確かめ方</h2><p>実測、試用、取材、公式資料を区別し、確認日と条件を明らかにします。</p><h2>ランキング</h2><p>評価軸を明らかにし、広告報酬の大きさで順位を変更しません。</p><h2>訂正と更新</h2><p>誤りが見つかった場合は訂正し、仕様・制度・価格の変更も確認します。</p><h2>大切な注意点</h2><p>${escapeHtml(readerSafetyCopy[site.risk])}</p>`,
    'advertising-policy': `<h1>広告について</h1><p>${escapeHtml(network.monetization.disclosure)}</p><h2>広告の表示</h2><p>広告、PR、アフィリエイトリンクは、広告であることが分かるように表示します。</p><h2>評価との関係</h2><p>提携の有無や広告報酬の大きさで、評価やおすすめ順位を変更しません。</p><h2>外部サイトへの移動</h2><p>広告リンクを開くと外部サイトへ移動します。料金や契約条件はリンク先でご確認ください。</p>`,
    privacy: `<h1…690 tokens truncated…rit}.site-header{height:72px;padding:0 max(20px,calc((100vw - 1120px)/2));display:flex;align-items:center;border-bottom:1px solid var(--line);background:rgba(245,243,237,.92);position:sticky;top:0;z-index:10;backdrop-filter:blur(12px)}.brand{display:flex;align-items:center;gap:9px;text-decoration:none}.brand span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;font:700 18px Georgia}.site-header nav{display:flex;gap:24px;margin-left:auto}.site-header nav a{font-size:11px;text-decoration:none}.nav-toggle{display:none}.hero{max-width:1120px;min-height:520px;margin:auto;display:grid;grid-template-columns:1.45fr .65fr;align-items:center;gap:80px}.eyebrow{color:var(--accent);font-size:9px;font-weight:800;letter-spacing:.16em}.hero h1{font-size:58px;line-height:1.14;letter-spacing:-.06em;margin:16px 0}.hero h1 em{font-family:Georgia,"Noto Serif JP",serif;font-weight:400}.hero>div>p:not(.eyebrow){max-width:620px;color:var(--muted);line-height:1.9}.hero-actions{display:flex;gap:10px;margin-top:28px}.hero-actions a,.contact-button,.not-found>a{background:var(--accent);color:#fff;padding:13px 18px;text-decoration:none;font-size:10px;font-weight:800}.hero-actions .subtle{background:transparent;color:var(--ink);border:1px solid var(--line)}.hero aside{background:var(--ink);color:#fff;padding:30px}.hero aside>span{font-size:8px;color:#aeb9b5}.hero aside>strong{display:block;font:68px Georgia;color:var(--accent);margin-top:14px}.hero aside>p{font-size:10px}.hero dl{margin-top:25px}.hero dl div{border-top:1px solid #ffffff22;padding:13px 0}.hero dt{font-size:7px;color:#aeb9b5}.hero dd{font-size:10px;margin:5px 0 0;line-height:1.6}.principles{max-width:1120px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.principles article{padding:42px;border-right:1px solid var(--line)}.principles article:last-child{border:0}.principles b{font:28px Georgia;color:var(--accent)}.principles h2{font-size:17px}.principles p{font-size:10px;line-height:1.7;color:var(--muted)}.guide-section{max-width:1120px;margin:80px auto}.section-title{display:grid;grid-template-columns:1fr 1fr;align-items:end;margin-bottom:28px}.section-title h2{font-size:30px}.section-title>p{font-size:11px;line-height:1.8;color:var(--muted)}.guide-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.guide-card{background:#fff;border:1px solid var(--line);padding:22px;text-decoration:none;min-height:190px}.guide-card small{font-size:8px;color:var(--accent)}.guide-card h2{font-size:17px;line-height:1.45}.guide-card p{font-size:10px;line-height:1.7;color:var(--muted)}.guide-card span{font-size:9px;font-weight:800}.article{max-width:920px;margin:auto}.breadcrumb{display:flex;gap:8px;padding:25px 0;font-size:9px}.article-head{padding:50px 0}.article-head h1{font-size:43px;line-height:1.35;letter-spacing:-.035em}.article-head>p:not(.eyebrow){color:var(--muted);line-height:1.8}.article-head>div span{display:inline-block;font-size:8px;background:#68736f;color:#fff;padding:5px 7px;margin:3px}.article-head>div span:first-child{background:var(--accent)}.article article>section{margin-top:58px}.article h2{font-size:25px}.article section>p{font-size:13px;line-height:2}.answer{background:#fff;border-left:5px solid var(--accent);padding:25px}.answer b{font-size:9px;color:var(--accent)}.answer p{font-size:15px;line-height:1.9}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;background:#fff;font-size:11px}th,td{text-align:left;padding:14px;border-bottom:1px solid var(--line)}th{background:var(--ink);color:#fff}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.steps article{background:#fff;padding:20px}.steps b{font:25px Georgia;color:var(--accent)}.steps h3{font-size:13px}.steps p{font-size:10px;line-height:1.7;color:var(--muted)}.disclosure,.pending{background:var(--surface);border:1px solid color-mix(in srgb,var(--accent) 25%,#ddd);padding:22px;margin-top:55px}.disclosure b{font-size:10px;color:var(--accent)}.disclosure p,.pending p{font-size:10px;line-height:1.7}.disclosure button{width:100%;border:0;background:#d7dbd7;color:#77817d;padding:11px}.sources ol{padding-left:20px}.sources li{margin:12px 0;font-size:11px}.sources small{display:block;color:var(--muted);font-size:8px}.review{background:#e7e9e3;padding:24px}.review label{display:block;margin:10px;font-size:11px}.review p{font-size:9px}.policy{max-width:800px;min-height:70vh;margin:70px auto}.policy h1{font-size:42px}.policy h2{margin-top:42px;font-size:22px}.policy p,.policy dd{font-size:12px;line-height:2;color:var(--muted)}.policy dl{background:#fff;padding:25px}.policy dl div{display:grid;grid-template-columns:150px 1fr;padding:12px;border-bottom:1px solid var(--line)}.policy dt{font-size:10px;font-weight:800}.policy dd{margin:0}.site-search label{display:block;font-size:10px;font-weight:800}.site-search>div{display:flex;margin-top:10px}.site-search input{flex:1;padding:15px;border:1px solid var(--line);font:inherit}.site-search button{width:100px;border:0;background:var(--accent);color:#fff;font-weight:800}.search-results{margin-top:24px}.search-result{display:block;background:#fff;border:1px solid var(--line);padding:18px;margin-top:8px;text-decoration:none}.search-result h2{font-size:15px;margin:4px 0}.search-result p{font-size:10px;margin:0}.search-result small{font-size:8px;color:var(--accent)}footer{margin-top:80px;background:var(--ink);color:#fff;padding:45px max(20px,calc((100vw - 1120px)/2));display:grid;grid-template-columns:1fr auto;gap:20px}footer p,footer small{font-size:9px;color:#a9b5b1}footer nav{display:flex;gap:16px}footer nav a{font-size:9px}footer small{grid-column:1/-1}.age-gate{border:0;width:min(520px,92vw);padding:35px;text-align:center}.age-gate::backdrop{background:rgba(7,12,11,.94)}.age-gate strong{display:grid;place-items:center;margin:auto;width:74px;height:74px;border-radius:50%;background:#a32936;color:#fff;font-size:22px}.age-gate div{display:grid;grid-template-columns:1fr 1fr;gap:8px}.age-gate a,.age-gate button{padding:12px;border:0;text-decoration:none;background:#ddd;color:#222}.age-gate button{background:#a32936;color:#fff}.not-found{min-height:70vh;display:grid;place-content:center;text-align:center}.not-found>strong{font:100px Georgia;color:var(--accent)}@media(max-width:780px){.site-header{padding:0 15px}.nav-toggle{display:block;margin-left:auto}.site-header nav{display:none;position:absolute;top:72px;left:0;right:0;background:var(--paper);padding:18px;flex-direction:column}.site-header nav.open{display:flex}.hero{display:block;min-height:auto;padding:60px 18px}.hero h1{font-size:39px}.hero aside{margin-top:35px}.principles,.guide-grid,.section-title,.steps{grid-template-columns:1fr}.principles article{border-right:0;border-bottom:1px solid var(--line)}.guide-section,.article,.policy{margin:50px 16px}.article-head h1,.policy h1{font-size:31px}.policy dl div{grid-template-columns:1fr}footer{grid-template-columns:1fr}footer nav{flex-wrap:wrap}}`;

const clientJs = `document.querySelector('.nav-toggle')?.addEventListener('click',event=>{const nav=document.querySelector('#siteNav');const open=nav.classList.toggle('open');event.currentTarget.setAttribute('aria-expanded',String(open))});const gate=document.querySelector('#ageGate');if(gate&&sessionStorage.getItem('scarletAdultConfirmed')!=='yes')gate.showModal();document.querySelector('#ageConfirm')?.addEventListener('click',()=>sessionStorage.setItem('scarletAdultConfirmed','yes'));const searchForm=document.querySelector('.site-search');if(searchForm){const input=document.querySelector('#siteSearch'),results=document.querySelector('#searchResults'),params=new URLSearchParams(location.search);input.value=params.get('q')||'';const run=async()=>{const query=input.value.trim().toLowerCase();if(!query){results.innerHTML='<p>検索語を入力してください。</p>';return}const items=await fetch(window.SCARLET_SEARCH_INDEX).then(response=>response.json());const matches=items.filter(item=>(item.title+' '+item.description+' '+item.topic).toLowerCase().includes(query));const root=new URL('../',location.href);results.innerHTML=matches.length?matches.map(item=>'<a class="search-result" href="'+new URL(item.path,root).href+'"><small>'+item.topic+'</small><h2>'+item.title+'</h2><p>'+item.description+'</p></a>').join(''):'<p>該当するガイドがありません。</p>'};searchForm.addEventListener('submit',event=>{event.preventDefault();history.replaceState(null,'','?q='+encodeURIComponent(input.value));run()});if(input.value)run()}document.querySelectorAll('[data-affiliate]').forEach(link=>link.addEventListener('click',()=>window.dataLayer?.push({event:'affiliate_click',offer_id:link.dataset.affiliate,page:location.pathname})));`;

function contentRegistry(site) {
  return site.topics.map((topic, index) => {
    const slug = topicSlugs[site.slug][index];
    const record = articlesByKey.get(`${site.slug}:${slug}`);
    return {
      site: site.slug,
      domain: domains[site.slug],
      topic,
      slug,
      path: `/guides/${slug}/`,
      status: record?.status || network.publishing.defaultStatus,
      publishable: isPublishable(record),
      missingFields: requiredFields.filter(field => {
        const value = record?.[field];
        return !(Array.isArray(value) ? value.length : value);
      }),
      risk: site.risk
    };
  });
}

function feed(site, publishedItems) {
  const domain = domains[site.slug];
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeHtml(site.brand)}</title><link>https://${domain}/</link><description>${escapeHtml(siteDescription(site))}</description><language>ja</language>${publishedItems.map(item => `<item><title>${escapeHtml(item.title)}</title><link>https://${domain}${item.path}</link><guid>https://${domain}${item.path}</guid><pubDate>${new Date(item.reviewedAt).toUTCString()}</pubDate><description>${escapeHtml(item.description)}</description></item>`).join('')}</channel></rss>`;
}

async function write(targetRoot, relativePath, data) {
  const target = path.join(targetRoot, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

function validateConfig() {
  const errors = [];
  if (portfolio.verticals.length !== 19) errors.push('portfolio must contain 19 sites');
  for (const site of portfolio.verticals) {
    const slugs = topicSlugs[site.slug];
    if (!domains[site.slug]) errors.push(`${site.slug}: domain missing`);
    if (!themes[site.slug]) errors.push(`${site.slug}: theme missing`);
    if (!Array.isArray(slugs) || slugs.length !== site.topics.length) errors.push(`${site.slug}: topic slug count mismatch`);
    if (slugs && new Set(slugs).size !== slugs.length) errors.push(`${site.slug}: duplicate topic slug`);
    if (slugs?.some(slug => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) errors.push(`${site.slug}: invalid topic slug`);
    if (!registered.has(domains[site.slug])) errors.push(`${site.slug}: primary domain is not registered`);
    if (primaryAsset(site.slug)?.domain !== domains[site.slug]) errors.push(`${site.slug}: primary domain ledger mismatch`);
  }
  for (const record of articleRecords) {
    const site = portfolio.verticals.find(entry => entry.slug === record.site);
    if (!site) errors.push(`${record.site}:${record.slug}: unknown site`);
    if (site && !topicSlugs[site.slug].includes(record.slug)) errors.push(`${record.site}:${record.slug}: unknown topic slug`);
  }
  return errors;
}

const configErrors = validateConfig();
if (process.argv.includes('--check')) {
  if (configErrors.length) {
    console.error(configErrors.join('\n'));
    process.exit(1);
  }
  console.log(`network check passed: 19 sites, 146 topics, ${articleRecords.length} authored articles`);
  process.exit(0);
}
if (configErrors.length) throw new Error(configErrors.join('\n'));

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
const deploymentManifest = [];

for (const site of portfolio.verticals) {
  const domain = domains[site.slug];
  const siteOutput = path.join(output, domain);
  const registry = contentRegistry(site);
  const authored = registry.filter(item => item.publishable).map(item => ({
    ...item,
    ...articlesByKey.get(`${site.slug}:${item.slug}`)
  }));
  await write(siteOutput, 'assets/site.css', css);
  await write(siteOutput, 'assets/site.js', clientJs);
  await write(siteOutput, 'assets/manifest.webmanifest', JSON.stringify({
    name: site.brand,
    short_name: site.brand,
    start_url: '/',
    display: 'standalone',
    background_color: themes[site.slug].surface,
    theme_color: themes[site.slug].accent,
    lang: 'ja'
  }, null, 2));
  await write(siteOutput, 'index.html', homePage(site));
  for (let index = 0; index < site.topics.length; index += 1) {
    await write(siteOutput, `guides/${topicSlugs[site.slug][index]}/index.html`, guidePage(site, site.topics[index], topicSlugs[site.slug][index]));
  }
  for (const [route, label] of policyRoutes) await write(siteOutput, `${route}/index.html`, policyPage(site, route, label));
  await write(siteOutput, '404.html', notFoundPage(site));
  await write(siteOutput, 'content-registry.json', JSON.stringify(registry, null, 2));
  await write(siteOutput, 'search-index.json', JSON.stringify(registry.map(item => ({
    title: `${item.topic}の選び方・比較・検証ガイド`,
    description: `${item.topic}の条件、比較軸、一次情報、注意点を整理します。`,
    topic: item.topic,
    path: item.path,
    status: item.status
  })), null, 2));
  const publicPaths = operatorReady ? ['/', ...policyRoutes.map(([route]) => `/${route}/`)] : [];
  publicPaths.push(...authored.map(item => item.path));
  await write(siteOutput, 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map(item => `<url><loc>https://${domain}${item}</loc><lastmod>${publishedDate}</lastmod></url>`).join('')}</urlset>`);
  await write(siteOutput, 'robots.txt', `User-agent: *\nAllow: /\nSitemap: https://${domain}/sitemap.xml\n`);
  await write(siteOutput, 'feed.xml', feed(site, authored));
  await write(siteOutput, 'llms.txt', `# ${site.brand}\n\n> ${siteDescription(site)}\n\nSite: https://${domain}/\nLanguage: Japanese\nHow we compare: https://${domain}/editorial-policy/\nAdvertising information: https://${domain}/advertising-policy/\n\n## Guides\n${authored.length ? authored.map(item => `- [${item.title}](https://${domain}${item.path})`).join('\n') : '- ガイド情報を順次追加しています。'}\n`);
  await write(siteOutput, 'ads.txt', '# Advertising providers are not configured.\n');
  await write(siteOutput, '_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: SAMEORIGIN\n`);
  const redirectLines = [
    `https://www.${domain}/* https://${domain}/:splat 301`,
    ...aliases(site.slug).map(alias => `https://${alias}/* https://${domain}/:splat 301`),
    ...aliases(site.slug).map(alias => `https://www.${alias}/* https://${domain}/:splat 301`)
  ];
  await write(siteOutput, '_redirects', `${redirectLines.join('\n')}\n`);
  const siteReport = {
    site: site.slug,
    brand: site.brand,
    primaryDomain: domain,
    aliases: aliases(site.slug),
    registered: Boolean(primaryAsset(site.slug)),
    pages: registry.length + policyRoutes.length + 2,
    guides: registry.length,
    publishedGuides: authored.length,
    drafts: registry.length - authored.length,
    operatorReady,
    monetizationEnabled: network.monetization.enabled,
    blockers: [
      ...(!network.operator.name ? ['operator.name'] : []),
      ...(!network.operator.contactEmail ? ['operator.contactEmail'] : []),
      ...(network.monetization.enabled ? [] : ['monetization.disabled']),
      ...(authored.length ? [] : ['no.published.guides'])
    ]
  };
  await write(siteOutput, 'site-report.json', JSON.stringify(siteReport, null, 2));
  deploymentManifest.push(siteReport);
}

const cards = portfolio.verticals.map(site => {
  return `<a href="${domains[site.slug]}/"><b>${String(site.rank).padStart(2, '0')}</b><div><span>${escapeHtml(site.name)}</span><h2>${escapeHtml(site.brand)}</h2><p>${escapeHtml(siteDescription(site))}</p><small>${site.topics.length}の専門テーマから探す →</small></div></a>`;
}).join('');
await write(output, 'index.html', `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SCARLET GUIDE NETWORK</title><meta name="description" content="暮らし、仕事、趣味、健康など、19の専門分野から自分に合う選び方を探せるガイドネットワークです。"><style>body{margin:0;background:#f2f1ed;color:#15221e;font-family:Arial,"Noto Sans JP",sans-serif}.wrap{max-width:1120px;margin:auto;padding:70px 20px}.eyebrow{font-size:9px;color:#d94a35;letter-spacing:.16em;font-weight:800}h1{max-width:760px;font-size:52px;letter-spacing:-.05em;margin:12px 0}.summary{max-width:720px;color:#66726e;line-height:1.8}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:35px 0}.metrics div{background:#15221e;color:#fff;padding:22px}.metrics strong{display:block;font-size:30px;color:#e8513b}.metrics small{font-size:9px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid a{display:grid;grid-template-columns:58px 1fr;background:#fff;padding:20px;text-decoration:none;color:inherit}.grid>a>b{font:31px Georgia;color:#e8513b}.grid span,.grid small{font-size:9px;color:#66726e}.grid h2{font-size:17px;margin:4px 0}.grid p{font-size:10px;line-height:1.65}.grid small{color:#d94a35;font-weight:700}@media(max-width:700px){h1{font-size:36px}.metrics{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}}</style></head><body><main class="wrap"><p class="eyebrow">SCARLET GUIDE NETWORK</p><h1>迷わず選べる、19の専門ガイド</h1><p class="summary">テクノロジー、暮らし、仕事、学び、旅行、趣味など。気になる分野から、料金・条件・向いている人・注意点を比べて、自分に合う選択肢を見つけられます。</p><section class="metrics"><div><strong>19</strong><small>専門分野</small></div><div><strong>146</strong><small>選べるテーマ</small></div><div><strong>3</strong><small>料金・条件・安心を比較</small></div><div><strong>1</strong><small>自分に合う答えへ</small></div></section><section class="grid">${cards}</section></main></body></html>`);
await write(output, 'deployment-manifest.json', JSON.stringify({ generatedAt: isoDate, sites: deploymentManifest }, null, 2));
await write(output, 'redirects.csv', `source,target,status\n${domainAssets.domains.filter(entry => entry.role === 'redirect').map(entry => `${entry.domain},${domains[entry.vertical]},301`).join('\n')}\n`);
await write(output, 'network-report.json', JSON.stringify({
  generatedAt: isoDate,
  sites: deploymentManifest.length,
  guides: deploymentManifest.reduce((sum, site) => sum + site.guides, 0),
  publishedGuides: deploymentManifest.reduce((sum, site) => sum + site.publishedGuides, 0),
  draftGuides: deploymentManifest.reduce((sum, site) => sum + site.drafts, 0),
  primaryDomainsReady: deploymentManifest.filter(site => site.registered).length,
  redirects: domainAssets.domains.filter(entry => entry.role === 'redirect').length,
  operatorReady,
  monetizationEnabled: network.monetization.enabled
}, null, 2));
console.log(`generated network: ${deploymentManifest.length} sites, ${deploymentManifest.reduce((sum, site) => sum + site.pages, 0)} pages, ${deploymentManifest.reduce((sum, site) => sum + site.guides, 0)} guides`);