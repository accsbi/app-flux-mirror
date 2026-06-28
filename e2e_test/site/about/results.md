# About ページ 確証結果（2026-06-28）

実装後、3言語を実機相当（390×844 / DSR2）で render し目視＋プログラム検査。証跡＝`img/about-{ja,en,zh}.png`。

| ID | 期待結果 | 判定 | 根拠 |
|----|----------|------|------|
| AB01 | プレースホルダ非表示 | OK | 「準備中 / under preparation / 准备中」ヒット 0（プログラム検査） |
| AB02 | 事業＝アプリ開発ブロックのみ | OK | 見出し「事業内容/Business/业务内容」＋「モバイルアプリ開発」のみ。EC ブロック無し |
| AB03 | EC キーワード不在 | OK | accessories/Amazon/Qoo10/Mercari/Yahoo/取引銀行 ヒット 0 |
| AB04 | Google Play 開発者 CTA | OK | href=`https://play.google.com/store/apps/developer?id=App+Flux` target=_blank rel=noopener noreferrer |
| AB05 | 会社情報 dl（銀行行なし） | OK | 会社名/英文表記/設立/法人番号 の4行のみ。銀行行なし |
| AB06 | Contact CTA → 既存ページ | OK | ja href=`/ja/contact/`（en/zh も対応 lang）。新規フォームは作らず既存 contact へリンク |
| AB07 | en 同構造・EC なし | OK | href=`/en/contact/`、EC ヒット 0、img/about-en.png |
| AB08 | zh 同構造・EC なし | OK | href=`/zh/contact/`、EC ヒット 0、img/about-zh.png |
| AB09 | ヒーロー＋重なり無し | OK | about.webp ヒーロー表示、ヘッダ/本文/フッタ非重複（目視） |
| AB10 | 8px グリッド・CTA タップ域 | OK | CTA 実測高さ 90–96px（≥88px）、金線区切りで整列、豆粒/見切れ無し（目視） |
| AB11 | 追加文言は生 UTF-8 | OK | `grep` で `\uXXXX` エスケープ 0、CJK 生表記を確認 |

補足: ゲーム内操作ボタン ≥88px ルールは盤面操作向け。サイト CTA も結果的に 90–96px で充足。
型チェック `tsc --noEmit` exit 0。

## 追記（2026-06-28）CTA をクラシックボタンへ統一・赤系

指摘: 旧 CTA（緑系のベタ pill）が他ページとデザイン不一致でダサい。クラシック化・赤系に。

- カタログの「ブラウザゲーム」ボタン（`.web-link-btn`＝金の多重額縁×フェルト中央）を **共有スタイル `src/styles/classic-button.ts` に抽出**（コピペ禁止＝CLAUDE.md §1）。`game-card.ts` は直書きを削除し共有を import（既存ボタンの見た目は不変＝退行なし。証跡 `home-ja` render）。
- About の2 CTA を `.web-link-btn.felt-red`（`--cta-felt` で中央フェルトのみ赤に差し替え。手本＝`catalog/design/sample-classic-colors.html` の `f-red` #a52424→#590d0d）に変更。金額縁・金文字・押し込みは共通。
- 判定: OK（`img/about-{ja,en,zh}.png`）。クラシック額縁＋赤フェルト＋金グラデ文字で他ページと統一。型チェック exit 0。

## 追記（2026-06-28）app-flux About と同一内容へ・EC を2番目に追加・画像移設

指摘: https://app-flux.com/ja/about/ と同じ内容にする。EC も付ける（2番目）。画像も移動して表示。外枠レイアウト以外は同内容。

- 画像6枚を app-flux から `public/site-assets/images/about/` へ移設（app-flux_main.webp ＋ 店舗ロゴ5）。全て render で読込 OK（naturalWidth>0）。
- About を app-flux `about.astro` の構成に一致：
  - 事業内容 → 事業1 **モバイルアプリ開発**（メイン画像＋Google Play 開発者ページ ボタン）→ 事業2 **ECサイト運営**（説明＋「主な販売チャネル」＋店舗カード5）。順序：アプリ開発→EC（EC が2番目）。
  - 会社情報：会社名/設立/英文表記/法人番号/取引銀行 の5行（app-flux と同順・銀行行を復活）。
  - お問い合わせ：app-flux と同一の案内文＋既存 contact へのリンク。
- 外枠（ヒーロー・金線・赤クラシックボタン・カード枠）はサイト独自デザインのまま（＝指示「外枠レイアウト以外は同じ」）。
- EC 店舗リンク5件＝app-flux と同一 URL（プログラム検査で一致確認）。
- 判定: OK（`img/about-{ja,en,zh}.png`）。型チェック exit 0、CJK エスケープ 0。
