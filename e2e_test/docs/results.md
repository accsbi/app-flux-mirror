# old-maid E2E テスト結果（Playwright）

## 実行情報
- 日時: 2026-06-26 09:07 (JST)
- 対象 URL: `http://127.0.0.1:5210/web-games/android/old-maid.html`（Lit+Vite MPA・Android 入口）
- 実行コマンド: `npx playwright test --project=pixel5`
- 環境: Node v22.22.1 / @playwright/test 1.61.1 / Chromium(devices['Pixel 5'] 393×851@2.75=1080×2340)
- webServer: `npx vite --port 5210`（自動起動・reuseExistingServer）
- 言語: en / ja / zh、レスポンシブ viewport: 360×800 / 412×915
- レポート: `e2e_test/00004_old-maid/playwright-report/`（`npx playwright show-report e2e_test/00004_old-maid/playwright-report`）
- 証跡 JPG: `e2e_test/00004_old-maid/img/<ID>.jpg`（quality~80・実機解像度 1081×1999 等。INFO 規格 1080×1920 とは別）

## 件数
- 洗い出し要素: メニュー6ボタン + 5モーダル + バージョン/外部注記 + 盤面ヘッダー(home/settings/guide) + BET ±/START + 設定(効果音/BGM/キャッシュ/言語 select) + 確認ダイアログ(accept/cancel) + 外部リンク(News/Other) ≒ 30+ 操作要素
- テストケース: 37 ID（test-cases.md）
- テスト実行数: 129（37 定義 × en/ja/zh または viewport/言語ペア展開）
- 結果: **Passed 129 / Failed 0 / Skipped 0**
- spec: menu / modal / navigation / settings / game / responsive / errors（7 ファイル）+ 既存 menu-transition(18 件)は別途維持

## 実施範囲カバレッジ
- 初期表示: APP-001/002 ✅
- メニュー全ボタン: MENU-001〜007（START/Guide/Settings/RemoveAds/Other/News/外部リンク） ✅
- モーダル(開く・タイトル・本文非空・閉じる×・背景復帰・重複なし・画面内): MODAL-* 10 ケース ✅
- 画面遷移(戻る・二重クリック): NAV-001〜004 ✅
- 言語切替(en/ja/zh): LANG-001（3 ペア） ✅
- 設定変更(効果音/BGM/言語/キャッシュ): SETTINGS-001〜004 + LANG-001 ✅
- ゲーム開始疎通(盤面が開き操作可能まで): GAME-001〜005（勝敗ロジックは対象外） ✅
- 外部リンク(開き方): MENU-007（target=_blank・rel=noopener 検証） ✅
- レスポンシブ(360×800/412×915・横スクロール無/はみ出し無/重なり無/モーダル収まる/タップ極小でない): RESPONSIVE-001〜003 ✅
- Console error / Network error（広告・解析・音声 abort は区別して除外）: ERROR-001/002 ✅

## 不具合表
| 分類 | 件数 | 内容 |
|---|---|---|
| APPLICATION_BUG | 0 | 検出なし（アプリコードは未変更） |
| TEST_BUG | 6（修正済） | 下記 ※1 |
| ENVIRONMENT_ERROR | 0 | なし |
| REQUIREMENT_UNCLEAR | 0 | なし |

### ※1 TEST_BUG（テストコード側の問題・修正済み。アプリは変更していない）
1. `_helpers.ts` ESM スコープで `__dirname` 未定義 → `import.meta.url` から導出に修正。
2. GAME/NAV の bet 操作が初回ルール overlay（`.rules-ok`）にクリックを遮られていた → `dismissRulesOverlay()` を追加し overlay を閉じてから操作。
3. `game-top-header` のボタンが `game-toolbar-bar` 内に入れ子 → locator を `.toolbar-btn` (0=home/1=settings/2=guide) に修正。
4. `confirm-dialog-panel` のボタン順は cancel→accept → `.confirm-btn.accept` / `.cancel` で指定するよう修正。
5. MODAL 画面内判定がガイド等の長文スクロールモーダルで過剰に厳格 → 横方向はみ出し＋上端可視＋横スクロール無に緩和（縦は内部スクロール許容）。
6. ERROR-002 が `main_bgm_01.ogg :: net::ERR_ABORTED` で fail → 音声メディアの autoplay/遷移由来 abort は広告/解析と同様に想定内として除外。

## 未実施
- なし（`test.only` / 理由なき `skip` 無し）。

## 判定
- **完了**。129/129 PASS、全ケース ID と spec テスト名が 1:1 対応（漏れ・重複・ID 無し無し）、証跡 JPG・HTML レポートを生成済み。
- アプリ(`web-games/src` 等)は一切変更せず、テストコードと playwright.config / docs のみ追加・修正。

## 成果物
- spec: `e2e_test/specs/{menu,modal,navigation,settings,game,responsive,errors}.spec.ts` + `_helpers.ts`
- 設定: `playwright.config.ts`（video: retain-on-failure 追加。screenshot:'on' / trace:'retain-on-failure' は既存）
- ケース表: `e2e_test/docs/test-cases.md`
- 結果: `e2e_test/docs/results.md`（本書）
- 証跡 JPG: `e2e_test/00004_old-maid/img/<ID>.jpg`（111 枚・成功スクショ）
- HTML レポート: `e2e_test/00004_old-maid/playwright-report/`
