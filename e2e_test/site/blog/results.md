# Blog データ駆動化 結果（2026-06-28）

指摘: ブログが translations.ts に1記事ハードコード。100記事になったら管理不能＝その場限りの独自実装。

## 対応＝ゲームカタログと同じデータ駆動に作り直し（唯一ソース＝MD）

- 記事の唯一ソース: **`catalog/blog/<NNNN>_<slug>.md`**（1記事=1ファイル・3言語・`date:` + `## [lang]` + `### タイトル` + 本文）。記事追加は MD を足すだけ＝コード変更不要。
- ローダ: **`src/data/blog.ts`**（`import.meta.glob` で取り込み、`parseMdByLang` で言語分割、`loadPosts(lang)` 日付降順、`getPost`、`formatPostDate`）。games-catalog.ts と同方針。
- 一覧: `static-page.ts` の `renderBlog` を**データ駆動の記事カード一覧**に（日付/タイトル/抜粋/続きを読む → `/{lang}/blog/{slug}/`）。
- 個別記事: **`ccg-blog-post`**（`src/components/blog-post.ts` + `src/main-blog-post.ts`）。パンくず・日付・タイトル・markdown 本文・戻る。
- HTML 量産: **`scripts/build_blog_pages.mjs`** が全記事×3言語の `{lang}/blog/{slug}/index.html` を生成（削除記事の残骸も掃除）。100記事でも 300 ファイルを機械生成＝破綻しない。
- ハードコード撤去: translations.ts の `blog` 文言ブロック（3言語）を削除。UI ラベルのみ `pages.readMore` を追加。

## 確証

| 項目 | 期待 | 判定 | 根拠 |
|------|------|------|------|
| 一覧がデータ駆動 | catalog/blog の全記事をカード表示 | OK | 3記事カード表示（`img/blog-list-ja.png`） |
| 並び順 | 公開日の新しい順 | OK | 2026-06-28 → 06-20 → 06-10（プログラム検査） |
| 個別ページ | title+本文+戻る、パンくず | OK | `img/blog-post-ja.png` / `blog-post-en.png`、md-p×4 |
| ルーティング | /{lang}/blog/{slug}/ が 200 | OK | ja/en/zh の一覧・記事とも HTTP 200 |
| 多言語 | en/ja/zh で表示 | OK | en 記事・zh 記事ページ確認 |
| 拡張性 | 記事追加=MD追加→スクリプト | OK | `node scripts/build_blog_pages.mjs` → 9ページ生成 |
| ハードコード排除 | translations に記事本文無し | OK | `blog:` 本文ブロック削除済み |
| ビルド | MPA入口に記事ページが入る | OK | `npm run build` exit 0、dist に 9 記事ページ＋main-blog-post バンドル |
| CJK 生UTF-8 | エスケープ無し | OK | catalog/blog/*.md は Python 直書き、grep でエスケープ 0 |

型チェック `tsc --noEmit` exit 0。

## 追記（2026-06-28）デザイン是正・画像対応・ja=会社概要

指摘: ①日本語の About → 会社概要 ②ブログがクラシックに反する(カードが真っ白でダサい) ③記事画像の処理が無い→Unsplash仮画像をサムネと本文内に ④サムネが大きすぎ→基カード大で左に「画像｜テキスト」。

- **ja ナビ**: `nav.about` を「会社概要」に（en=About / zh=关于 は不変）。about ページのタイトル/パンくずも会社概要に追従。
- **クラシック是正**: ブログ記事カードを game-card と同一の額縁に統一（`--surface` 紙グラデ＋`--gold-deep` 枠＋金二重線 inset＋`--shadow-card`）。冷たい白(#fffdf6)を撤去。
- **画像対応（データ駆動の一部）**: MD に `image:`（サムネ/ヒーロー）行＋本文に `![alt](url)`。`src/data/blog.ts` が image を読み、`src/lib/markdown.ts` に画像行レンダリング(`md-img`)を追加、`mdToPlain` は画像を抜粋から除去。仮画像は Unsplash から取得→webp(1024×500)化し `public/site-assets/images/blog/`。サムネ＝一覧カード左、ヒーロー＝記事冒頭、インライン＝本文中（「サムネの箇所と内部」両方を実証）。
- **サムネ寸法/配置**: 一覧カードを `grid-template-columns: clamp(128px,36%,208px) 1fr` の横並び（画像左・テキスト右）。基カード(feat 1024:500)と同アスペクト・金枠。狭幅は 120px。
- 確証: ja/en の一覧（モバイル/デスクトップ）＋記事ページを render 目視＝クラシック統一・サムネ左横並び・画像読込OK（`img/blog-list-ja.png` / `blog-list-en-desktop.png` / `blog-post-ja.png`）。`tsc` exit 0、`npm run build` exit 0（dist に blog 画像同梱）。CJK 生UTF-8。

## 記事の増やし方（運用メモ）
1. `catalog/blog/<連番>_<slug>.md` を追加。先頭に `date: YYYY-MM-DD`、任意で `image: /site-assets/images/blog/<file>.webp`（サムネ兼ヒーロー）。続けて `## [en]/[ja]/[zh]` ＋ 各言語 `### タイトル` ＋ 本文。本文中の図版は `![alt](/site-assets/images/blog/...)`。
2. 画像は `public/site-assets/images/blog/` に webp で置く（1024×500 目安）。
3. `node scripts/build_blog_pages.mjs` を実行（HTMLスタブ生成・削除記事の掃除）。
4. 一覧は自動で新しい順に並ぶ。コード変更は不要。
