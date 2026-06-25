# 反省点：ゲーム一覧をハードコードして再発させた件（二度としない）

対象: `tools/sync-android.mjs`。指摘: `const ALLOW = ['old-maid','memory-battle','high-low']` /
`const ALL_GAMES = ['blackjack','poker','casino-war','old-maid','memory-battle','high-low']` をハードコードしていた。

## 何が悪いか
- **ゲームが増減したら破綻する。** CSV にゲームを足しても、この配列を手で直さないと sync の剪定対象から漏れる／対象判定が狂う。＝その場しのぎで後で必ず壊れる。
- **唯一のソース(games-list.csv)を無視した。** CLAUDE.md §1・memory `consolidation-no-copypaste` で「ゲーム一覧をコードに列挙しない／CSV を唯一のソースにする」と決まっているのに違反した。同 script の id 取得は CSV から引いていたのに、ゲーム一覧だけ配列直書きにした＝中途半端。

## なぜ再発したか（根本）
- **新規に書くファイルにルールを適用していない。** 既存コードの共通化は気にするのに、自分が新しく作る script/tool では「とりあえず配列で」と楽をして直書きする。これが毎回の再発原因。
- **「動けばいい」で書き、唯一ソース由来かを自問していない。** 配列を書く前に「これは CSV/config から引けるか？」を必ず問うべきだった。

## ルール（二度としない・全ファイル共通）
- **ゲーム一覧・カタログ由来の値をコード/script/tool に列挙しない。** 必ず `catalog/games-list.csv`（file_name=slug, id, *_published）から実行時に読む。**新規ファイルでも例外なし。**
- 「対象かどうか」も配列で持たない。**派生条件で判定する**（例: Android 対象＝Win に `pubspec.yaml` が在るゲーム）。
- 配列リテラルでゲーム名/slug を書こうとしたら、その時点で「CSV から引けないか」を必ず止まって確認する。
- 直したコード: ALL_GAMES＝CSV から導出、ALLOW 廃止＝`pubspec.yaml` 存在判定。ハードコード0件。

## 関連
- 既存ルール: CLAUDE.md §1 / memory `consolidation-no-copypaste` / `no-silent-fallback`。
- 同種の過去反省: `REFLECTION-android-menu.md`（証拠より仮説を優先した件）。共通の根本＝「新規/自分のコードにルールを適用しない」。
