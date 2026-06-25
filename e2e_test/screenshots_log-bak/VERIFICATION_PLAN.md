# 検証計画書（6ゲーム整合性・UI）— Classic Card Games

目的：base MD を唯一のソースとした「ビルド→config→runtime→表示」の整合性と、各UI状態の正しさを、
6ゲーム × 3言語 × 各状態で網羅的に検証する。各ケースは PNG（証跡）と 1:1 の判定ログを残す。

対象ゲーム：blackjack / poker / casino-war / old-maid / memory-battle / high-low
言語：ja / en / zh
証跡：`screenshots_log/<game>/*.png` ＋ 同名 `.log`（PASS/FAIL・期待・実際）

---

## A. コンテンツ整合性（静的：config と runtime キー）

| ID | 検証項目 | 手順 | 期待結果 |
|----|----------|------|----------|
| C-01 | quick_start 生成 | `build_content.py` 後、各 config `languages.<lang>.game.quick_start` | ja/en/zh すべてに存在（空でない） |
| C-02 | guide_content 生成 | 各 config `overview_info.guide_content` | ja/en/zh すべてに存在 |
| C-03 | 旧 rules_text 不在 | 各 config `game.rules_text` | 存在しない（quick_start に統一済み・直書き残骸なし） |
| C-04 | 旧ガイド手書きキー不在 | `*_guide_intro/rules/payout`・`*_payout_summary`・`overview_intro`・`features_*`・`procedure_*`・`description_*` | runtime 参照ゼロ・config から削除済み |
| C-05 | runtime キー一致 | runtime が読む START=`quick_start`、ガイド=`guide_content` のみ | rules_text/overview_intro 等のフォールバック参照ゼロ |
| C-06 | フォールバック禁止 | guide_content / quick_start 欠如時 | サイレント代替でなく `throw`（設定ロード済み時） |
| C-07 | site_description 言語マージ | `/<lang>/` カタログ | 移行済み言語は site_description_md、未移行は descriptions を維持（en/zh が消えない） |

## B. ランタイムUI状態（各ゲーム × 各言語）

| ID | 状態 | 手順 | 期待結果 |
|----|------|------|----------|
| U-01 | メニュー/開始画面 | standalone を開く | タイトル・COIN・主要ボタンが表示、文字化けなし |
| U-02 | START 説明（quick_start） | 開始時のルール説明 | base MD の クイックスタート文面。古い rules_text(Prayer/☓/BET倍率) が出ない |
| U-03 | BET/テンキー | ベット選択 | テンキー表示。**他モーダルと同時表示・透過しない** |
| U-04 | 設定モーダル | 「設定」を開く | **背景が不透明**。背後の盤面/テンキー/詳細が透けない（全ゲーム統一） |
| U-05 | ガイドモーダル | 「ガイド」を開く | guide_content 表示。**末尾にプライバシーポリシー＋リンク**。重なり・透過なし |
| U-06 | 確認ダイアログ | キャッシュクリア等 | 不透明・前後関係正しい |
| U-07 | 広告削除UI | 該当ゲーム | レイアウト崩れなし |
| U-08 | 多言語切替 | 言語=en/zh | 文言が当該言語、未生成キーは throw で検知（黙って旧言語にしない） |

## C. モーダル重なり/前後関係（CLAUDE.md §2）

| ID | 検証項目 | 期待結果 |
|----|----------|----------|
| M-01 | overlay 暗幕 | 全ゲームで設定/ガイド/確認の overlay 背景濃度が統一（極端に薄い 0.44 等で透けない） |
| M-02 | modal カード背景 | settings/guide/confirm のカードが不透明 |
| M-03 | 単一モーダル原則 | 設定を開いたら BET テンキー等は背後に透けない（暗幕で隠れる or 排他） |
| M-04 | z-index/ヘッダー | ヘッダー/フッター/カード/マーカー/メッセージと重ならない |

---

## 既知の不具合（本セッションで検出・要修正）

- **D-1 設定モーダル透過**：casino-war 系で overlay 背景が薄く（`rgba(6,24,20,0.44)`）、背後の SELECT BET テンキーが透ける。blackjack(`0.68`)と不統一。→ M-01/M-04/U-04。
- **D-2 en/zh の quick_start 未生成**：5ゲーム(memory以外)は en/zh が旧タグ未移行のため `quick_start` 欠如。runtime は throw（U-08/C-01）。→ 要 en/zh 移行。
- **D-3 旧 rules_text 残存**：5ゲーム config に古い `game.rules_text`(Prayer/☓/BET倍率/※) が残存（現在は未参照だが要削除）。→ C-03。
- **D-4 旧ガイド手書きキー残存**：config に未使用の `*_guide_*`・`overview_intro` 等が残る。→ C-04。

## 判定凡例
PASS（一次・AI）／FAIL／N/A。最終チェックは人間（`human_checked/` は人間専用）。

---

# 実施結果（AI一次・証跡PNGは screenshots_log/ 配下）

## アプリ（web-games）6ゲーム × 画面
撮影：`screenshots_log/<game>/scr-01..06`（menu/startrules/betphase/settings/guide/gameplay）。pageerror 全0。

| 項目 | 結果 | 証跡 |
|---|---|---|
| メニュー/START説明/ベット/進行 表示 | PASS | scr-01〜03,06 |
| START説明＝base MD の quick_start | PASS | scr-02, casino-war en/zh ui-06 |
| blackjack 配り（各2枚=計4枚） | PASS（正常） | blackjack/scr-06b |
| **old-maid 設定/ガイドが透明（盤面が透ける）** | **FAIL→修正済** | old-maid/scr-05-guide(不良), scr-04b(修正後 不透明) |
| 設定モーダル不透明（他5ゲーム） | PASS（overlay 0.78計測） | ui-05/scr-04 |
| poker ガイドのハードコード英文フォールバック | **FAIL→修正済(throw化)** | 監査H1 |
| memory START説明のプレースホルダ | **FAIL→修正済(throw化)** | 監査H2 |

## サイト（/ja/ カタログ・詳細ページ）
撮影：`screenshots_log/site/`（catalog-ja-svgfix, detail-<game>-ja）。

| 項目 | 結果 | 証跡 |
|---|---|---|
| /ja/・/en/ カタログに6ゲーム表示 | PASS | catalog-*.png |
| **カタログのGoogle Play/YouTube SVGが離れすぎ** | **FAIL→修正済** | catalog-ja-svgfix |
| 詳細ページ描画（タイトル/説明/スクショ/ガイド/DL） | PASS | detail-*-ja |
| **詳細ページのストアリンク＝CSV一致** | **PASS**（blackjack=simpleblackjack 等） | （href抽出ログ） |
| **アプリ(web-games)のストア/YouTube＝CSV不一致(直書き)** | **FAIL（未修正）** | 監査A |

## 未修正バグ（要対応・優先度順）
1. 【高】アプリのストア/YouTube が CSV 非由来の直書き（`web-store-links.ts`）。blackjack/poker/old-maid がハブURL・CSV空でもハブ動画表示。→ build_content.py で CSV→config、runtime は config 参照、直書き撤去。
2. 【中】タイトルのハードコード最終フォールバック（old-maid `'Simple Old Maid'` 完全直書き 他）。
3. 【中】memory ガイドの無言空表示(H3/H4)、high-low `hlGet` の言語/fallback フォールバック(H5)。
4. 【低】UIラベル多数の `|| '英語'` 直書き（CLAUDE.md §1）。

## 撮れていない（要再取得）
- blackjack/poker のゲーム内ガイド（数字パッドに阻まれ未取得）。
- 各ゲーム en/zh の全画面。
