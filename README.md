Exit code: 0
Wall time: 1.6 seconds
Output:
# SCARLET Content OS

阿部氏の「無双マイスター」のコンテンツ組成思想を、現代の SEO / AIO / LLMO に合わせて再設計した汎用MVPです。

## 原型から継承したもの

提供された3つの `.xlsm` と9つのマニュアルを解析しました。原型は、外部ページソースから素材を抽出し、キーワード・動画/商品・広告・ランキング・内部リンクを部品として組み上げ、完成HTMLをCMSへ渡すExcel/VBAシステムです。

本MVPは、その「複数ソースを一枚の制作画面で組成する」考え方を継承します。一方、ランダムキーワード混成や検索流入だけを目的にした大量生成は、現在の検索品質方針と合わないため採用していません。

## 現代版の制作フロー

1. 主クエリ、検索意図、対象読者を定義
2. 冒頭の直接回答と論点別アウトラインを作成
3. 公式資料・一次情報・独自調査をソース台帳へ登録
4. 一次体験、著者、主要エンティティ、内部リンクを付与
5. 100点満点のライブ品質監査と人間レビュー
6. Article JSON-LD、セマンティックHTMLを出力
7. 公開後はSearch Console / Bing Webmaster Tools等で計測（次フェーズ）

## MVP機能

- E-Sheet型コンテンツエディタ
- 検索意図別の設計案生成（ルールベース、外部送信なし）
- SEO / AIO / LLMO共通の11項目ライブ監査
- 根拠ソース台帳と利用ページの追跡
- ページの制作パイプライン管理
- 読者プレビュー
- 表示内容に対応するArticle JSON-LD
- セマンティックHTML出力
- LocalStorage自動保存、JSONバックアップ/復元
- レスポンシブUI

## 品質監査の考え方

GoogleはAI Overviews / AI Mode向けに特別なスキーマやAI専用ファイルを要求しておらず、通常のSEO基盤と人に役立つコンテンツを推奨しています。本MVPも、直接回答、十分な説明、根拠、一次体験、著者、エンティティ、内部リンク、表示内容と一致する構造化データを評価します。100点は掲載や引用を保証する指標ではなく、公開前チェックリストです。

## 起動

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## 技術構成

Vite + Vanilla JavaScript。MVPでは外部AI APIやサーバーを使わず、入力データはブラウザ内だけに保存します。次段階でCMS連携、クロール、Search Console/Bingデータ、AI引用計測、組織権限を追加できる構造です。

## 参照した現行ガイド

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview

