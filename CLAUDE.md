# プロジェクト・ルール（必読・常時適用）

着手前に必ず該当 docs を読むこと。ユニット（単一ファイル/単一スクショ）だけ見て直さない。
基準ゲーム（blackjack / poker / casino-war）と同じ作りか比較してから書く。

## 0. テストケース先行（最重要・順序厳守）
- **順序＝①テストケース作成 → ②実装 → ③確証**。逆をやると毎回こける（重大な欠陥）。
- 着手前に対象のテストケース表を作る（期待結果を先に書く）。基準＝**[screenshots_log/test_plan/plan.html](screenshots_log/test_plan/plan.html)**（OLD MAID UIテスト指示書・サンプル。対象に合わせ訂正）。
- 確証は実装後、そのケースに沿って判定（OK / NG / 未実施 / 対象外）。**ミスを OK/PASS と書かない**。判定根拠（URL・表示文字・実フェッチ先・エラー）をログ/HTMLに残す。
- 手本＝**high-low(highandlow) / app-flux DOCS / Native(Kotlin/Flutter) 各アプリ** に一致させてから実装。独自実装に置き換えない（移行で過去バグが再発する）。
- **テスト仕様書を残す（独自実装防止）**：このタスクに限らず**以降すべてのタスク**で、確証した結果（`result.html` / `VERIFY-LOG.html`）を基に「期待挙動＝仕様」を**テスト仕様書**として明文化し、次回以降はそれに沿って実装・検証する。仕様書がある領域を独自に作り直さない。
- スキル: `.claude/skills/test-first/SKILL.md`。

## 0b. Flutter 共通必須（全ゲーム・新規も）
- **課金テスト用 consume 救済（DEBUG限定）を全 Flutter 実装に必ず入れる**：払い戻し時に Google Play で「資格情報を削除」を入れ忘れると購入が残り再購入(再テスト)不可になる → アプリから `remove_ads` を **consume して未購入へ戻す**機能（`kDebugMode`/BuildConfig.DEBUG ガード）。手本＝Kotlin Blackjack ハブ `playingcardshub/BillingManager.forceConsumeRemoveAds()` ＋ `WebBillingBridge.debugConsumeRemoveAds()`、Flutter は highandlow `debug-consume-remove-ads`。**old-maid のほか、未実装の HIGH&LOW・memory、今後の新規開発でも必ず適用**。

## 1. 共通化（コピペ・ハードコード禁止）
- 表示文言・ガイド・結果バナー・アセットURL・各種パネルは **shared / common / config** を使う。
  ゲーム個別に同等物を新規実装しない。
- ゲーム内ガイド＝メニューガイドと **同一ソース**（config `overview_info.<slug>_guide_content`）。
- ランタイム文言は **config 由来**（`getLocalizedString`）。多言語テーブルをゲームにハードコードしない。
- 詳細・違反監査: **[docs/CONSOLIDATION.md](docs/CONSOLIDATION.md)**（§0 に「再発の根本原因＋着手前MUST」）。

## 1b. 文字コード（生 UTF-8 厳守・`\uXXXX` エスケープ禁止）
- 多言語文字列（日本語・中国語など CJK）は **config・コードを問わず生 UTF-8 で書く**。`\uXXXX` エスケープに変換しない。
- **AI は読めても人間が読めない／grep 検索できない**。過去に文字化け回避でエスケープ化したが、コード増で検索・読解不能になった（再発禁止）。
- 文字化けが出ても **エスケープへ逃げない＝エラー逃れ禁止**。UTF-8 のまま原因（エンコーディング・ツール側）を直す。
- JSON 生成は `ensure_ascii=False`（手本＝`scripts/build_content.py`）。**Edit/Write ツールが CJK を再エスケープする場合は Python で生 UTF-8 を直接書く**。
- ランタイム文言の唯一ソースは `catalog/base_markdown/*_base.md`（生 markdown＝検索可）。JSON は MD 由来フィールドの注入先にすぎない。

## 2. UI テスト（共通観点）
- モーダルと各部品（ヘッダー/フッター/カード/マーカー/メッセージ）が **重ならない**。前後関係を守る。
- 全観点とIDは **[docs/UI_TEST_CASES.md](docs/UI_TEST_CASES.md)**。実装/修正後はこの一覧で確認。

## 3. テスト記録（証跡）— 一箇所・単一HTML・時系列
- **テストは全部 `e2e_test/<app>/` に集約**（例 `e2e_test/00004_old-maid/`）。散らかさない（`.log` 作らない・別々のHTMLにしない）。
- 記録は **単一ファイル `e2e_test/<app>/test-log.html`** に**時系列で追記**（日付/項目/確証根拠/判定/証跡）。画像は **サムネ＋クリック拡大（ライトボックス）**・**相対参照**。
- テスト用スクショは **`e2e_test/<app>/img/` に JPG（軽量・quality~80）**。PNG は重いので置かない。判定根拠（URL・表示文字・実フェッチ先・エラー）を残し、**ミスを OK と書かない**。
- **INFO/ストア掲載画像だけは PNG**（`catalog/google_play_store_images/...`）。テスト記録とは別管理。
- **【グローバルルール・厳守】INFO/ストア掲載画像は規格寸法 `1080×1920`（16:9 縦）だけで作る。それ以外の寸法・アスペクト（例 1080×2400）で絶対に作らない**（基準＝`catalog/google_play_store_images/info-tmp/old-maid-info1.png`）。生成後は全画像の寸法を監査し、1枚でも規格外なら NG。**16:9 に中身が収まらない不具合をサイズ変更で逃げない＝レイアウトを直す**（盤面と同じ `applyStageScale` で 540×960 基準を `transform: scale` 縮小して収める＝LAY02。8の倍数・操作ボタン縦幅≥88px・vh等の半端値で個別縮小しない）。
- ブラックボックス禁止（`/tmp` 等に隠さない・フォーク任せで過程を隠さない）。`e2e_test/<app>/docs/`・`human_checked/`（§4）はユーザー領域＝AI は触らない。
- **編集前に必ず OLD バックアップ（最重要・再発防止）**：HTML・データ資料・コードを編集/上書き/Write する前に、同階層の **`OLD/`（無ければ作成）へ日付つきでコピー**してから編集する。**上書き・削除で履歴を消さない＝追記専用**。test-log は行を消さず追記のみ。`Write` で既存ドキュメントを丸ごと置換しない（必ず先に OLD へ退避）。素人でも BAK は取る。
- **UI 寸法は 8 の倍数**（8px グリッド：8/16/24/…/88/96）。半端値禁止。操作ボタン縦幅 ≥88px（スマホ基準）。豆粒・見切れ禁止。**WEB でなく WebView/実機基準**で判断し、**render を AI 自身が目視**して OK/NG を決める（要素の有無＝構造チェックだけで OK にしない）。詳細は `e2e_test/<app>/test-cases.html` §12。

## 4. 人間専用領域 — 触らない
- `screenshots_log/<game>/human_checked/` は **人間専用**。**AI・スクリプトは書き込み/移動/削除/リネーム禁止**。
- 一般に、**自分が作っていないファイル/フォルダ（ユーザー作成物）を勝手に削除・改変しない**。
- 最終チェックは人間が行う。AI の判定は一次判定。

## 5. 文章規範（日本語の説明・ガイド文）
- `catalog/base_markdown/*_base.md` の日本語（概略・アプリの説明・ガイド・概要など）を書く/推敲するときは **[docs/japanese-writing-standard.md](docs/japanese-writing-standard.md)** に従う。
- 特に「LLM っぽい表現の禁止」「冗長の排除」「演出の抑制」を点検する。
