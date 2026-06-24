---
name: test-first
description: Use BEFORE implementing any UI/bug-fix/feature in playing_cards. Enforces order test-cases → implement → verify. Invoke when starting any fix or change to old-maid / shared UI so test cases exist before code.
---

# Test-first（テストケース先行）

実装より先にテストケースを作る。**順序＝①テストケース → ②実装 → ③確証**。逆は禁止（毎回こける・重大欠陥）。

## 手順
1. **基準を読む**: `screenshots_log/test_plan/plan.html`（OLD MAID UIテスト指示書・サンプル）。手本ゲーム high-low(highandlow) / app-flux DOCS。
2. **テストケース表を作る/更新する**（期待結果を先に書く）。置き場所 `screenshots_log/test_plan/<game>/test-cases.html`。
   - 列: NO / 場所 / 操作 / 期待結果 / 判定(OK・NG・未実施・対象外) / スクショ(相対参照) / 備考。
   - 新規バグは必ずケース化してから直す。
3. **実装**（手本に一致。独自実装に置き換えない）。
4. **確証**: 各ケースを実機/WEBで実行→スクショ＋同名 `.log`（`screenshots_log/<game>/`）。判定を記録。
   - **ミスを OK/PASS と書かない**。根拠（URL・表示文字・実フェッチ先・エラー・pageerror件数）を残す。
   - ゲーム内部の勝敗処理を推測で OK にしない。OKも確証画像必須。

## 判定基準
- OK: 表示・遷移・モーダル・URL・基本操作が期待どおりで、画面崩れ/致命エラー無し。
- NG: 未表示・誤遷移・操作不能・重なり・画面外欠落・JSエラー。1件でも未処理例外があれば原則 NG。
- 未実施 / 対象外（ゲームロジック詳細は対象外）。

## 関連ルール
- CLAUDE.md §0（最重要）, §2 UI観点（[docs/UI_TEST_CASES.md](../../docs/UI_TEST_CASES.md)）, §3 スクショ＆ログ。
- memory: test-cases-before-implementation, screenshot-log-rule, verify-by-render-not-diff, consolidation-no-copypaste。
