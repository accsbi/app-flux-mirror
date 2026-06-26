# E2Eテスト結果（00004_old-maid）

## 実行情報
- 実行日時：2026-06-26
- 対象URL：http://127.0.0.1:5210/web-games/android/old-maid.html（Android入口）
- 対象ブランチ：main
- 対象コミット：76a4f20
- Playwrightバージョン：1.61.1
- 実行コマンド：`npx playwright test e2e_test/00004_old-maid/specs --project=pixel5`

## 件数
- テストケース数：44（en/ja/zh・レスポンシブ展開で実行129）
- Playwrightテスト数：129
- Passed：129 / Failed：0 / Skipped：0

## 不具合
| ID | 分類 | 対象 | 内容 | 再現手順 | 証跡 |
|---|---|---|---|---|---|
| （なし） | - | - | APPLICATION_BUG/TEST_BUG/ENVIRONMENT_ERROR/REQUIREMENT_UNCLEAR いずれも0 | - | - |

## 未実施項目
| ID | 未実施理由 |
|---|---|
| ゲーム内勝敗ロジック | §1.3 対象外（開く・初期表示・基本操作のみ） |

## 成果物
- テストコード：e2e_test/00004_old-maid/specs/*.spec.ts（8本・全テスト expect()）
- HTMLレポート（単一・サーバ不要）：e2e_test/00004_old-maid/playwright-report.html
- スクリーンショット：e2e_test/00004_old-maid/screenshots/<ID>-<lang|viewport>.jpg（129枚）
- 生成器：scripts/build_report.py（screenshots＋specs→playwright-report.html）
