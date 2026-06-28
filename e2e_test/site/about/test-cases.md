# About ページ テストケース（実装前に作成）

対象＝SITE の About ページ（`/{lang}/about/`、`ccg-static-page page="about"`）。
要件: app-flux の About 内容を移植するが **EC サイトについては一切書かない**。**事業内容はアプリ開発のみ**。**問い合わせは既存 CONTACT ページへリンク**。

| ID | 対象画面 | 前提 | 操作 | 期待結果 | 判定 | 証跡 |
|----|----------|------|------|----------|------|------|
| AB01 | /ja/about/ | dev/build 表示 | ページ表示 | 「準備中」プレースホルダが消えている（`pages.preparing` を出さない） | | |
| AB02 | /ja/about/ | 同上 | 事業内容セクション確認 | 見出し「事業内容」＋「モバイルアプリ開発」ブロックのみ。EC 事業ブロックは無い | | |
| AB03 | /ja/about/ | 同上 | EC キーワード検査 | accessories / Amazon / Qoo10 / Mercari / Yahoo / EC / ECサイト / 取引銀行 のいずれも本文に存在しない | | |
| AB04 | /ja/about/ | 同上 | Google Play リンク確認 | 「Google Play 開発者ページ」CTA があり href が developer ページURL。target=_blank rel=noopener | | |
| AB05 | /ja/about/ | 同上 | 会社情報セクション確認 | 「会社情報」＋会社名/英文表記/設立/法人番号の dl。銀行行は無い | | |
| AB06 | /ja/about/ | 同上 | Contact セクション確認 | 案内文＋「お問い合わせ」CTA、href=`/ja/contact/`（既存ページ） | | |
| AB07 | /en/about/ | 同上 | ページ表示 | 同構造の英語表示。EC 記述なし。CTA href=`/en/contact/` | | |
| AB08 | /zh/about/ | 同上 | ページ表示 | 同構造の中国語表示。EC 記述なし。CTA href=`/zh/contact/` | | |
| AB09 | /ja/about/ | 同上 | ヒーロー確認 | about.webp ヒーロー＋タイトル表示。モーダル/ヘッダ/フッタと重ならない | | |
| AB10 | 全lang | 同上 | レイアウト目視 | 8px グリッド、CTA ボタン縦幅 ≥88px 相当、豆粒/見切れ無し。AI が render を目視で OK/NG | | |
| AB11 | translations.ts | grep | CJK 検査 | 追加文言は生 UTF-8（`\uXXXX` エスケープ無し） | | |

判定は実装後に results に記録。ミスを OK と書かない。
