# Androidアプリ内モーダル（別のカードゲーム / お知らせ・更新）運用ガイド

## 何のための機能か
メニューの「別のカードゲーム」「お知らせ・更新」は、外部サイトへ遷移すると Android(WebView) で
戻れず**離脱**してしまう。これを避けるため**アプリ内モーダル**で表示する。
データは**すべてアプリ内バンドル（内部ファイル）**で、iframe もクロスオリジン fetch も使わない。
**唯一の外部は GOOGLE PLAY ボタン**（明示的にストアへ。Flutter が外部ブラウザで開き WebView は遷移しない）。

## 呼び出し元（コールフロー）
1. `web-games/src/shared/ui/menu/standalone-game-menu.ts` のボタン →
   `menu-other-games` / `menu-news` イベントを emit（`<a target=_blank>` ではない＝遷移しない）。
2. `web-games/src/shared/ui/standalone-card-game-app.ts` が受信 → `isOtherGamesOpen` / `isNewsOpen` を true →
   `modal-shell` 内にモーダル描画。`handleSystemBack()` がこの2つを最優先で閉じる（Android 戻る対応）。
3. お知らせ＝`panels/guide-overview-panel.ts`（流用）、別のカードゲーム＝`panels/other-games-modal-panel.ts`。
   - News は **Android=モーダル / WEB=詳細ページ遷移（従来どおり・同一オリジンで離脱でない）** に分岐（`onNews()`）。

## データの所在（内部 / 外部の別）★ここが質問の核心
| 表示物 | 種別 | 実ファイル（内部・バンドル） | 解決関数 |
|---|---|---|---|
| 別のカードゲーム 一覧 | **内部** | `public/web-games/game-assets/configs/card-games-list.json` | `fetch(buildGameAssetUrl('configs/card-games-list.json'))` |
| 各ゲームの feat 画像（サムネ） | **内部** | `public/site-assets/images/games-apps/<slug>/<slug>-feat.webp` | `buildFeatureImageUrl(slug)` → `./site-assets/...`（Android は appassets。**外部URLではない**） |
| お知らせ・更新 本文 | **内部** | config `overview_info.news_content`（言語別） | `getLocalizedString(overview, 'news_content')` |
| GOOGLE PLAY リンク | **外部** | 遷移先 `google_play_store_url`（games-list.csv） | Flutter `url_launcher` が外部ブラウザ/Play で開く（WebView は残る＝戻れる） |

→ **一覧・画像・本文は内部ファイル**（appassets から読む）。`card-games-list.json` や feat 画像が無いと
モーダルが空/画像欠けになる（過去バグ：sync の剪定で消えていた→保持するよう修正済）。

## 更新方法（唯一のソースを直す）
- **別のカードゲーム一覧**：`catalog/games-list.csv` を編集 → `python3 scripts/build_content.py` →
  `card-games-list.json` 再生成。一覧は `store_published=true` のみ表示・現在のゲームは自動除外。
- **お知らせ・更新 本文**：`catalog/base_markdown/<id>_<slug>_base.md` の
  `### [ News ] {news_app}`（ja / en / zh）を編集 → `python3 scripts/build_content.py <slug>` →
  config `overview_info.news_content` 再生成。
- どちらも **CSV / base_markdown が唯一のソース**。コードに直書きしない。

## Android へ反映（運用手順）
```
WSL:  npm run sync:android <slug>      # build:android → android/app/src/main/assets/ 直下へコピー＋剪定（www 廃止）
Win:  cd <id>_<slug> && flutter build apk   （または flutter run）
```
- **対象ゲームはハードコードしない**：`games-list.csv` に在り、かつ Win に Flutter プロジェクト
  (`pubspec.yaml`) が在るゲームだけ sync 可。移行未着手（空フォルダ）は弾く。ゲーム増減は CSV を直すだけ。
- 剪定方針：他ゲームのゲーム asset は全削除。site-assets は**一覧サムネ用に `<slug>-feat.webp` だけ残す**
  （icon / info1-6 等は削除して APK を軽く保つ）。`configs` は当該ゲーム＋`card-games-list.json`＋`remove_ads_ui.json` を残す。

## Flutter 側（離脱防止の本体）
`<id>_<slug>/lib/main.dart`：
- `shouldOverrideUrlLoading` … トップフレームが `appassets.androidplatform.net` 以外の http(s) へ行こうとしたら
  `url_launcher` で外部に開き、WebView 内遷移は CANCEL。
- `onCreateWindow` … `target=_blank`（GOOGLE PLAY 等）も新ウィンドウを作らず外部で開く。
- → どの外部リンクを踏んでもアプリは前面に残り、戻れば元の画面に復帰する。

## 検証
- WEB：`npm run dev` → `http://127.0.0.1:5190/web-games/android/old-maid.html`。両モーダルが開く・
  **トップフレーム遷移 0（離脱なし）**・pageerror 0。証跡 `screenshots_log/old-maid/modal-*.png`。
- Android（エミュ/実機）：モーダル開閉／システム戻るで閉じる（アプリ終了しない）／一覧の feat 画像表示／
  GOOGLE PLAY で外部ブラウザ→戻ると復帰。証跡 `screenshots_log/old-maid/emu-modal-*.png`。
