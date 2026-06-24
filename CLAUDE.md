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

## 2. UI テスト（共通観点）
- モーダルと各部品（ヘッダー/フッター/カード/マーカー/メッセージ）が **重ならない**。前後関係を守る。
- 全観点とIDは **[docs/UI_TEST_CASES.md](docs/UI_TEST_CASES.md)**。実装/修正後はこの一覧で確認。

## 3. スクショ＆検証記録（証跡）
- **`.log` ファイルは作らない**。検証結果は **追記式 HTML に蓄積**する（`screenshots_log/<game>/VERIFY-LOG.html`、テスト実行は `screenshots_log/test_plan/<game>/result.html`）。
- 画像は **サムネイル＋クリックで拡大（ライトボックス）**・**相対参照**（Base64 で埋め込まない）。スクショは `screenshots_log/<game>/` に置く。
- 一時ファイルに隠さない（`/tmp` 等でブラックボックス化しない）。判定根拠（URL・表示文字・実フェッチ先・エラー）を HTML に残し、**ミスを OK と書かない**。
- `screenshots_log/<game>/human_checked/` は人間専用（§4）。AI は触らない。

## 4. 人間専用領域 — 触らない
- `screenshots_log/<game>/human_checked/` は **人間専用**。**AI・スクリプトは書き込み/移動/削除/リネーム禁止**。
- 一般に、**自分が作っていないファイル/フォルダ（ユーザー作成物）を勝手に削除・改変しない**。
- 最終チェックは人間が行う。AI の判定は一次判定。

## 5. 文章規範（日本語の説明・ガイド文）
- `catalog/base_markdown/*_base.md` の日本語（概略・アプリの説明・ガイド・概要など）を書く/推敲するときは **[docs/japanese-writing-standard.md](docs/japanese-writing-standard.md)** に従う。
- 特に「LLM っぽい表現の禁止」「冗長の排除」「演出の抑制」を点検する。
