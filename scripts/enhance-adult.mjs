
import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'generated-site');
const money=JSON.parse(await fs.readFile(path.join(root,'monetization.config.json'),'utf8'));
const pageFiles=(await fs.readdir(path.join(root,'content/pages'))).filter(x=>x.endsWith('.json'));
const pages=await Promise.all(pageFiles.map(async f=>JSON.parse(await fs.readFile(path.join(root,'content/pages',f),'utf8'))));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function offer(id){
  const o=money.offers[id];
  if(!o)return'';
  return `<aside class="offer" data-offer="${esc(id)}"><span>${esc(o.badge)}</span><h3>${esc(o.title)}</h3><p>${esc(o.description)}</p><a href="${esc(o.url)}" rel="sponsored nofollow noopener" target="_blank" data-offer-link="${esc(id)}">${esc(o.cta)} <b>→</b></a><small>広告主: ${esc(o.merchant)}</small></aside>`;
}

function gate(){return `<dialog id="ageGate" class="age-gate"><form method="dialog"><span class="age-mark">18+</span><h2>成人向けページです</h2><p>この先には成人を対象とした情報が含まれます。18歳未満の方は閲覧できません。</p><div><a href="/">退出する</a><button value="adult" id="ageConfirm">18歳以上です</button></div><small>確認結果はこのブラウザ内にのみ保存されます。</small></form></dialog>`}

const errors=[];
for(const p of pages.filter(x=>x.mature)){
  if(!Array.isArray(p.offers)||!p.offers.length)errors.push(`${p.slug}: offersがありません`);
  for(const id of p.offers||[]){
    if(!money.offers[id])errors.push(`${p.slug}: 未定義offer ${id}`);
    if(money.offers[id]?.url.includes('YOUR_AFFILIATE_ID'))errors.push(`${id}: アフィリエイトIDが未設定です`);
  }
}
if(process.argv.includes('--check')){
  const fatal=errors.filter(x=>!x.includes('未設定'));
  if(fatal.length){console.error(fatal.join('\n'));process.exit(1)}
  console.log(`adult check passed: ${pages.filter(x=>x.mature).length} mature pages`);
  if(errors.length)console.warn(errors.filter(x=>x.includes('未設定')).join('\n'));
  process.exit(0);
}

for(const p of pages.filter(x=>x.mature)){
  const file=path.join(out,p.slug,'index.html');
  let html=await fs.readFile(file,'utf8');
  const offers=(p.offers||[]).map(offer).join('');
  const disclosure=`<aside class="ad-disclosure"><b>広告について</b><p>${esc(money.disclosure)}</p></aside>`;
  const adultSchema=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:p.title,isFamilyFriendly:false,contentRating:'18+'}).replace(/</g,'\\u003c')}</script>`;
  html=html.replace('<meta name="description"',`<meta name="rating" content="adult"><meta name="rating" content="RTA-5042-1996-1400-1577-RTA"><meta name="description"`);
  html=html.replace('</head>',`${adultSchema}</head>`).replace('<body>','<body data-mature="true">');
  html=html.replace('<aside class="method">',`${offers}${disclosure}<aside class="method">`);
  html=html.replace('<aside class="toc">',`<aside class="toc"><span class="adult-side-label">18+ / 成人向け</span>${(p.offers||[]).map(offer).join('')}`);
  html=html.replace('<footer>',`${gate()}<footer>`);
  await fs.writeFile(file,html);
}

const cssFile=path.join(out,'assets/site.css');
await fs.appendFile(cssFile,`.adult-label{position:absolute;z-index:2;background:#a52525;color:#fff;padding:7px 10px;font-size:9px;font-weight:800}.mature-card{position:relative}.offer{background:#fff7ee;border:1px solid #e9c9a7;padding:20px;margin:18px 0}.offer>span,.adult-side-label{display:inline-block;background:#a52525;color:#fff;padding:4px 7px;font-size:8px;font-weight:800;letter-spacing:.08em}.offer h3{font-size:16px;margin:10px 0 5px}.offer p{font-size:11px!important;color:#68736f}.offer a{display:block;background:#172522;color:#fff;text-align:center;text-decoration:none;padding:12px;margin:12px 0;font-size:11px;font-weight:800}.offer small{font-size:8px;color:#7c8582}.ad-disclosure{font-size:10px;background:#eeeee9;padding:14px;margin:18px 0}.ad-disclosure p{font-size:9px!important;margin:5px 0}.toc .offer{padding:12px}.toc .offer h3{font-size:12px}.age-gate{border:0;width:min(520px,92vw);padding:0;background:transparent}.age-gate::backdrop{background:rgba(8,17,14,.92);backdrop-filter:blur(8px)}.age-gate form{background:#fff;padding:36px;text-align:center;border-top:6px solid #a52525}.age-mark{display:grid;place-items:center;margin:auto;width:75px;height:75px;border-radius:50%;background:#a52525;color:#fff;font:700 25px Georgia}.age-gate h2{font-size:24px}.age-gate p{font-size:12px;line-height:1.8;color:#68736f}.age-gate form>div{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:22px 0}.age-gate a,.age-gate button{padding:13px;border:0;text-decoration:none;font-size:11px;font-weight:800}.age-gate a{background:#e9ebe8;color:#172522}.age-gate button{background:#a52525;color:#fff}.age-gate small{font-size:8px;color:#89918e}@media(max-width:800px){.toc .offer{display:none}}`);
const jsFile=path.join(out,'assets/site.js');
await fs.appendFile(jsFile,`\nconst gate=document.querySelector('#ageGate');if(gate&&sessionStorage.getItem('adultConfirmed')!=='yes')gate.showModal();document.querySelector('#ageConfirm')?.addEventListener('click',()=>sessionStorage.setItem('adultConfirmed','yes'));document.querySelectorAll('[data-offer-link]').forEach(a=>a.addEventListener('click',()=>{window.dataLayer?.push({event:'affiliate_click',offer_id:a.dataset.offerLink,page:location.pathname})}));`);
console.log(`adult enhancement complete: ${pages.filter(x=>x.mature).length} pages`);

