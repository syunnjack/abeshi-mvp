# SCARLET Site System MVP

阿部氏の「無双マイスター／無双シート／E-Sheet」の考え方を、現代の静的サイト生成、SEO、AIO、LLMO、収益導線へ再設計した汎用サイトシステムです。

旧システムがExcel/VBAでページ素材、キーワード、広告、ランキング、内部リンクを組み立ててCMSへ貼り付ける方式だったのに対し、本MVPは構造化データを入力として、公開サイト一式を再現可能なビルドで生成します。

## 19サイト・ポートフォリオ

`portfolio.config.json` に、推奨順の19専門サイト、全146サブジャンル、収益モデル、レビュー区分を定義しています。`domains.config.json` には各サイトのドメイン候補を収録しています。

```bash
npm install
npm run build:portfolio
npm run serve:portfolio
```

生成先は `generated-portfolio/` です。19サイトのトップページ、146件の専門ページ設計、ポートフォリオ一覧を含む166 HTMLを生成します。

安全な初期状態として、次の制御を入れています。

- 全ページを人間レビュー完了まで `noindex`
- 事実、出典、広告表記、独自情報、更新日の公開前チェック
- YMYL・プライバシー・成人向けを区分したレビュー要件
- 広告報酬と独立した比較軸、一次情報、向く人・向かない人の設計
- 提携設定まで無効な収益枠
- 成人向けサイトの18歳確認、adult/RTAメタ情報

ドメイン候補は空き状況・商標を保証しません。購入前にレジストラと商標データベースで確認してください。

## 単一サイト版

`content/pages/*.json`、`site.config.json`、`monetization.config.json` から `generated-site/` を生成します。

```bash
npm run build:site
npm run serve:site
```

単一サイト版には、記事・カテゴリ・運営方針ページ、Article / FAQPage / BreadcrumbList / Organization JSON-LD、canonical、OG、sitemap、robots、RSS、llms.txt、サイト内検索、PWA manifest、レスポンシブCSSを含みます。

成人向けページはページJSONで `"mature": true` を指定します。18歳確認、`rating=adult`、RTA、`isFamilyFriendly: false`、PR表示、`rel="sponsored nofollow noopener"` 付きの収益導線を生成します。

## コンテンツ制作スタジオ

ブラウザ上の編集画面では、検索意図、直接回答、本文、FAQ、出典、一次体験、著者、内部リンク、構造化データを管理できます。

```bash
npm run dev
```

## 検証

```bash
npm test
npm run build
```

テストは19サイト・146トピック・全生成ページ、内部リンク、noindex、成人向け保護、ドメイン一覧、単一サイト設定を検証します。

## 技術構成

Vite + Vanilla JavaScript + Node.jsです。ビルド時に外部AI APIやデータベースを要求せず、設定とコンテンツをGitで管理できます。次の段階でCMS、計測、アフィリエイトAPI、Search Console / Bing Webmaster Tools、編集承認フローを追加できる構造です。

