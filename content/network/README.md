# Network content

19サイトの本文データを保存するディレクトリです。

```bash
npm run scaffold:article -- home-appliance televisions
```

生成されたJSONへ、独自検証、出典、著者、レビュー日を入力します。`status` を `published` にしても、`network.config.json` の運営者名と連絡先、および必須記事項目が揃わない限り、生成ページは `noindex` のままです。

利用できるサイトと記事スラッグは `portfolio.config.json` と `topic-slugs.config.json` で確認できます。データ形式は `content/article.schema.json` に定義しています。

