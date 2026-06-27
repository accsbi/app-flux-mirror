# E2Eテスト結果（00006_high-low / Classic Simple High & Low）

指示書＝`e2e_test/docs/e2e_test_execution_instructions.md` 準拠。Playwright(@playwright/test)で test()/expect() による自動判定。
手本＝`e2e_test/00004_old-maid/specs`（同型）。

## 実行情報
- 実行日時：2026-06-27
- 対象URL：`http://127.0.0.1:5210/web-games/android/high-low.html`（Android 文脈・GAME=high-low で webServer 起動）
- 対象ブランチ：main
- 対象コミット：ecbbc46（+ 作業ツリー：終了UI統一・盤面88px 修正）
- Playwrightバージョン：1.61.1
- プロジェクト/デバイス：pixel5（393×851@2.75=1080×2340 実機相当）＋ responsive 360×800 / 412×915
- 言語：en / ja / zh
- 実行コマンド：
```bash
GAME=high-low npx playwright test e2e_test/00006_high-low/specs --reporter=list
python3 scripts/build_report.py 00006_high-low   # 単一HTMLレポート生成
```

## 件数
- テストケース数（ユニークID）：30（APP/MENU/GAME/UI/ADS/SETTINGS/LANG/RESPONSIVE/ERROR）
- Playwrightテスト数：82（×言語/×ビューポート展開）
- Passed：82
- Failed：0
- Skipped：0
- 証跡スクショ：82（`screenshots/*.jpg`）

## 対象範囲（指示書§1.3）と対応
| 観点 | 対応スペック | 主なID |
|---|---|---|
| 初期表示（描画/タイトル/Ver/エラー無） | menu / errors | APP-001/002, ERROR-001 |
| メニュー全ボタン（START/Guide/Settings/RemoveAds/Other/News） | menu | MENU-001〜007 |
| 画面遷移・モーダル開閉 | menu / game | MENU-002〜006, GAME-005 |
| 言語切替（en/ja/zh） | settings | LANG-001 |
| 設定変更 | settings | SETTINGS-001〜003 |
| ゲーム開始までの疎通（START→モード→BET→盤面→宣言） | game | GAME-001〜006 |
| 外部リンク（target=_blank/noopener） | menu | MENU-007 |
| エラー表示（Console/Network・広告解析除外） | errors | ERROR-001/002 |
| **広告・オフライン（機内モードで広告ハングしない/警告）** | ads | ADS-001/002 |
| レスポンシブ（360×800・412×915） | responsive | RESPONSIVE-001〜004 |
| **終了画面UI 統一・豆粒禁止・8倍数（今回の不具合の回帰）** | ui | UI-001/002/003 |

## 今回の不具合の回帰テスト（重点）
- **UI-001**（en/ja/zh とも PASS）：終了画面の2ボタン（もう一度遊ぶ／ホーム）が **完全同一寸法**（高さ・幅 ±1px）かつ **on-screen 縦幅 ≥88px**。
  - 旧不具合＝ghost(ホーム)だけ font 24px＋透明で WebView 上 `min-height` が効かず潰れて豆粒化。修正＝`.go-actions .btn` で両ボタンに `height:136px` 固定＋font 32px を同一適用。
- **UI-002**：勝敗テキスト(winner)が豆粒でない（≥36px on-screen）。
- **UI-003**：もう一度遊ぶ が機能しモード選択へ戻る（疎通）。
- 8の倍数監査：終了画面の全寸法(136/32/48/24/16/8)は8倍数。盤面 HIGH/LOW は 92px(8非倍数)→**88px**へ修正（縮小側＝再拡大せず違反解消）。詳細＝`test-cases.html §G`。

## 不具合（APPLICATION_BUG）
| ID | 分類 | 対象 | 内容 | 再現手順 | 証跡 |
|---|---|---|---|---|---|
| （検出し修正済） | APPLICATION_BUG | 終了画面 | ホームボタンが豆粒・2ボタン非統一（WebView で min-height 不適用） | 終局→終了画面 | 修正前=ユーザー実機スクショ／修正後=UI-001 PASS（screenshots/UI-001-*.jpg） |
| （検出し修正済） | APPLICATION_BUG | 広告/オフライン | 移行で `notifyNativeGameEnd()`(native AppFluxHost 依存)に変えたが、テンプレ native に AppFluxHost が無く **7ゲーム広告が出ない/機内モードで警告も出ずハング** | 機内モード→7ゲーム目 | 修正=OLD MAID と同じ共通関数(isOfflineForAd/countGameForAd)。ADS-001/002 PASS（screenshots/ADS-*.jpg） |

※ 修正後の本実行では **APPLICATION_BUG 0 / 全82 PASS**。

## TEST_BUG（実行中に検出→テストコード修正）
| 件 | 内容 | 修正 |
|---|---|---|
| 1 | UI-003 が再ゲーム導線を `.btn-high/bet` と誤想定 | 実装は restartGame→beginStartFlow＝モード選択(.mode-opt)。期待を修正し PASS |

## ENVIRONMENT_ERROR
- 0 件（webServer は GAME=high-low で 5210 起動。実行中に dev サーバ落ちは無し）。

## REQUIREMENT_UNCLEAR
- 0 件。

## 未実施項目（自動不可・要人間/実機）
build_report.py の「⚠️ 未実施・要人間確認」セクション参照（9件）。要点：
| ID | 未実施理由 |
|---|---|
| A-02/03/05 | Android ネイティブ（ステータスバー色・recents 名・ランチャーアイコン）＝WebView外・実機要 |
| D-01〜04 | AdMob 本番ID＋テストデバイス広告＝SDK/実機要 |
| E-02〜04 | 実購入/復元/DEBUG consume＝Play Billing/テストアカウント要 |
| F-01/02 | システムバック（PopScope）＝実機要（web側 onAndroidBack は実装確認済） |
| SND | 効果音/BGM の実発音＝音は自動判定不可 |
| UI-device | 終了2ボタンの WebView 実機での最終目視（自動は Pixel5 プロファイルのみ） |
| INFO-visual | ストア掲載 INFO/MP4 の内容・寸法 最終目視 |

## 成果物
- テストケース：`e2e_test/00006_high-low/test-cases.html`（§A〜§G）
- テストコード：`e2e_test/00006_high-low/specs/`（_helpers / menu / game / ui / ads / settings / responsive / errors）
- HTMLレポート：`e2e_test/00006_high-low/playwright-report.html`（画面別・サムネ拡大・人間判定欄）
- スクリーンショット：`e2e_test/00006_high-low/screenshots/*.jpg`（82枚）
- 時系列ログ：`e2e_test/00006_high-low/test-log.html`
- Trace/動画：失敗時のみ（今回 0 失敗のため無し）

## 判定
- **一部未完了**（自動E2E＝完了・全82 PASS／ネイティブ・広告・課金・音・実機目視＝要人間）。
- 自動テストの PASS は構造・寸法・疎通の一次判定。総合合否は実機での人間最終確認による。
