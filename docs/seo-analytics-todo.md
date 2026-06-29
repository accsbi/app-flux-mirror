# SEO / Search Console / Analytics — やることリスト

作成: 2026-06-29 / 対象: app-flux.com（Lit+Vite MPA、Cloudflare Pages デプロイ元 `accsbi/app-flux-mirror`）

このドキュメントは「次にやるべきこと」の単一参照。実装時は CLAUDE.md（§0 テスト先行 / §1 共通化・コピペ禁止 / §1c フォールバック禁止 / §3 OLD バックアップ）に従う。

---

## 0. 最優先：未 push のコミットがある（デプロイ復旧）

- ローカル `main` が `origin/main` より **1 コミット先行**：`8f030e1 fix(build): drop scripts/ dependency from build`。
- 背景：`build` に `npm run build:sitemap` を入れたら Cloudflare で `Cannot find module .../build_sitemap.mjs` で失敗した。原因＝`.gitignore` 25行目 `scripts/` で **scripts/ 全体が git 管理外＝deploy 先に存在しない**。修正済み（`build` = `tsc && vite build` に戻した）。
- **やること**：`git push origin main` → Cloudflare 再ビルド → デプロイ成功を確認。
- push 後の確認：
  - `https://app-flux.com/sitemap.xml` が XML（45 URL）を返す（従来は実体なしで HTML が返っていた）。
  - 各ページソースに gtag（`G-VWEYBN8B5T`）が入っている。

---

## 現状サマリ（コード実測 2026-06-29）

| 項目 | 状態 | 場所 |
|------|------|------|
| Google Analytics (gtag.js `G-VWEYBN8B5T`) | ✅ 全サイトHTMLにビルド時注入（Android除外） | `vite.config.ts` の `gtagPlugin()` |
| sitemap.xml（45 URL・hreflang付き） | ✅ 生成＆コミット済（push待ち） | `scripts/node/build_sitemap.mjs` → `public/sitemap.xml` |
| noindex タグ | ✅ コード・本番ライブともに皆無（GSC報告は旧サイト残骸） | — |
| robots.txt | Cloudflare 管理・Google 許可（`search=yes`）・`Sitemap:` 行なし | （リポジトリに実体なし） |
| **meta description** | ⚠️ **45ページ中3ページのみ**（`/en/ /ja/ /zh/` ホーム）。42ページ欠落 | 各 `*/index.html` |
| **canonical** | ❌ 全ページ未実装 | — |
| **hreflang（head内）** | ❌ 未実装（sitemap にはある） | — |
| **OGP / Twitter card** | ❌ 未実装 | — |
| **JSON-LD 構造化データ** | ❌ 未実装 | — |
| 本文レンダリング | ⚠️ Lit のクライアントレンダリング（静的HTMLは `<title>` のみ） | `ccg-catalog-page` / `ccg-detail-page` / `ccg-blog-post` |

ページ構成：en/ja/zh × 15（home / about / blog / blog記事3 / contact / games-apps 6ゲーム / privacy-policy / item_terms_of_use）＝45。

---

## A. Search Console でやること

1. **サイトマップ送信**（push 後）：`https://app-flux.com/sitemap.xml` を登録。実体のない古い sitemap を登録済みなら削除。
2. **noindex「修正を検証」**：旧サイト残骸なので該当一覧で検証を実行 → 再クロールで解消。
3. **URL 検査でレンダリング確認（最重要・client-render 対策）**：ホーム・各ゲーム詳細・ブログを「公開URLをテスト」→ **レンダリング結果に本文テキストが出るか**確認。出れば JS インデックス OK。出なければ下の C を優先。確認後「インデックス登録をリクエスト」。
4. **プロパティはドメイン型**（`app-flux.com`）推奨＝en/ja/zh 全サブパスを一括カバー。
5. **`app-flux-mirror.pages.dev` ミラーは無視 or noindex**（本番と重複させない）。

## B. Analytics でやること

1. **受信確認**（push 後）：GA4「リアルタイム」で `G-VWEYBN8B5T` にヒットが来るか。
2. **GA4 ↔ Search Console 連携**：GA4 管理 → サービス間リンク設定 → Search Console。
3. **設定**：データ保持 14 か月 / Google シグナル / 自分の IP を内部トラフィック除外。
4. **外部クリック計測**：Play ストアボタン・YouTube リンクのクリック（拡張計測で自動取得。明示したければボタンに `data-` 付与）。
5. **同意/プライバシー**：EU 配信があれば同意モード。`privacy-policy` ページに GA 利用の記載があるか確認（無ければ追記）。
6. **アプリ計測**：Android は web GA 対象外（正しい）。必要なら Firebase 別途。

## C. コード起点の SEO 改善（優先度順）

> 全て「生成元の単一ソース」で実装（§1）。手書き HTML 42 枚にコピペ禁止。
> 実装系統は2つ：
> - **blog**：`scripts/node/build_blog_pages.mjs` を拡張（既に lang 別 title を生成済み → description/canonical/og を足す）。
> - **detail/静的ページ**：手書き HTML なので `vite.config.ts` の `transformIndexHtml`（GA と同じ仕組み）で、パス→config/データから title/description/canonical/hreflang/og を注入するのが最も単一ソース。

| 優先 | 項目 | 内容 |
|------|------|------|
| **高** | C-1 meta description 全ページ | detail＝config の `overview_intro` 等、blog＝`src/data/blog.ts` の概要を単一ソースに注入 |
| **高** | C-2 canonical 全ページ | `<link rel="canonical" href="https://app-flux.com/{lang}/.../">`。末尾スラッシュ・重複対策 |
| **高** | C-3 title/description/canonical を静的HTML化 | 今は本文・description が client-render 頼み。最低限この3つを静的HTMLへ（取りこぼし防止） |
| 中 | C-4 hreflang を head にも | sitemap に加え二重化（en/ja/zh + x-default） |
| 中 | C-5 OGP / Twitter card | `og:title/description/image/url` ＋ feature 画像流用。SNS 共有プレビュー |
| 中 | C-6 JSON-LD | detail＝`VideoGame`/`SoftwareApplication`、blog＝`BlogPosting`、共通＝`BreadcrumbList` |
| 低 | C-7 root index.html の meta-refresh | サーバリダイレクト推奨だが優先度低。最低限 canonical を `/en/` に |

### 推奨着手順
1. push（§0）→ A-1〜A-3・B-1/B-2 で土台を確定。
2. C-1〜C-4 をテストケース先行（§0）でまとめて実装（description + canonical + hreflang、静的HTML化）。
3. 余力で C-5（OGP）→ C-6（JSON-LD）。

---

## 関連メモ / 参照
- sitemap 生成・noindex 調査結論・**scripts/ は deploy 非存在の落とし穴**：メモリ `sitemap-and-noindex`。
- GA 注入の所在（HTML を grep しても出ない＝ビルド時注入）：メモリ `google-analytics-gtag`。
- sitemap テストケース＆確証：`e2e_test/sitemap/test-cases.md`（SM01-12 全 OK）。
- URL 構造・リダイレクト：メモリ `url-routing-redirects`、`vite.config.ts` / `public/_redirects`。
