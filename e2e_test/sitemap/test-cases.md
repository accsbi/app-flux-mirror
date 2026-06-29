# sitemap.xml 生成 — テストケース（①ケース→②実装→③確証）

対象: `scripts/node/build_sitemap.mjs` → `public/sitemap.xml`（vite build で `dist/sitemap.xml` 直下へ）。
唯一ソース: ルートの `en/ ja/ zh/` 配下に実在する `index.html`（＝ビルドが入口にする実ページ）。
本番ドメイン: `https://app-flux.com`。言語: en / ja / zh（zh-TW/zh-HK はストア説明専用＝対象外）。

| ID | 対象 | 前提 | 操作 | 期待結果 | 判定 |
|----|------|------|------|----------|------|
| SM01 | 生成実行 | en/ja/zh に index.html が存在 | `node scripts/node/build_sitemap.mjs` | `public/sitemap.xml` が生成され、終了コード0 | |
| SM02 | XML 妥当性 | SM01 後 | XML パース | well-formed・ルートは `<urlset xmlns=...sitemap/0.9>`・`xmlns:xhtml` 宣言あり | |
| SM03 | URL 件数 | 実ページ45（15×3言語） | `<url>` を数える | ちょうど **45** 件 | |
| SM04 | 正規ドメイン | — | 全 `<loc>` 検査 | すべて `https://app-flux.com/` 始まり・末尾スラッシュ付き | |
| SM05 | SPA 除外 | /web-games はSPA成果物 | loc 検査 | `web-games` を含む URL が **0件** | |
| SM06 | 言語ルート | en/ja/zh のトップ | loc 検査 | `https://app-flux.com/en/` `/ja/` `/zh/` が含まれる（`/en/index.html` ではない） | |
| SM07 | 詳細ページ | games-list.csv の6ゲーム | loc 検査 | `/{lang}/games-apps/{old-maid,poker,blackjack,casino-war,high-low,memory-battle}/` が各言語に存在 | |
| SM08 | ブログ記事 | catalog/blog の3記事 | loc 検査 | `/{lang}/blog/{welcome,now-on-google-play,browser-versions-coming}/` が各言語に存在 | |
| SM09 | hreflang | 各ページ3言語 | 各 `<url>` 検査 | `<xhtml:link rel="alternate" hreflang>` が en/ja/zh + x-default を持つ | |
| SM10 | レガシー除外 | _redirects で301する旧URL | loc 検査 | `games-apps/privacy-policy` 等の301対象が **0件** | |
| SM11 | ビルド反映 | `npm run build` | dist 検査 | `dist/sitemap.xml` が root 直下に存在し SM02〜SM09 を満たす | |
| SM12 | 自己保守 | 新ゲーム/記事追加時 | （設計確認） | URLをハードコードせず実ページ走査＝追加でビルドすれば自動で増える | |

## 確証結果（2026-06-29）

実装: `scripts/node/build_sitemap.mjs`（en/ja/zh 実ページ走査・URLハードコードなし）→ `public/sitemap.xml`。
`package.json` の `build` に `build:sitemap` を前段追加（ビルドのたび再生成）。

- SM01 OK: `node scripts/node/build_sitemap.mjs` → `45 URL / 15 ページ × en,ja,zh`、終了コード0。
- SM02 OK: ET でパース成功。root=`urlset`、`xmlns:xhtml` 宣言あり。
- SM03 OK: `<url>` = 45。
- SM04 OK: 全 loc が `https://app-flux.com/` 始まり・末尾スラッシュ。
- SM05 OK: `web-games` を含む URL 0件。
- SM06 OK: `/en/` `/ja/` `/zh/` を含む（`/en/index.html` ではない）。
- SM07 OK: 6ゲーム × 3言語すべて存在。
- SM08 OK: blog 3記事 × 3言語すべて存在。
- SM09 OK: 全 url が hreflang en/ja/zh + x-default を保持。
- SM10 OK: 旧 `games-apps/privacy-policy` 等の301対象 0件。
- SM11 OK: `npm run build` 後 `dist/sitemap.xml`（root 直下・21KB・loc 45）。
- SM12 OK（設計）: ゲーム/記事の追加は games-list.csv / catalog/blog → html 生成 → 走査で自動反映。

判定: 全 OK。デプロイ後 `https://app-flux.com/sitemap.xml` が XML を返す（従来は実体無しで SPA フォールバックHTMLが返っていた）。
