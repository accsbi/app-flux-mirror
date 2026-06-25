# old-maid Android（WebView）テストケース＆確証

検証環境: WSL dev `http://127.0.0.1:5190/web-games/android/old-maid.html`（`__ANDROID_APP__=true`、lang=en）。
Flutter 実機/エミュは別途（emulator-5554 で起動確認済み）。各 PNG は `screenshots_log/old-maid/`。

## A. メニュー（Android 出し分け）
| ID | 観点 | 期待 | 結果 | 証跡 |
|---|---|---|---|---|
| M1 | Android 項目 | START/Guide/Settings/**Remove Ads**/**Other Card Games**/**News・Updates** | PASS（高-low と一致） | web-side-COMPARE-AFTER.png |
| M2 | Back/Google Play 非表示 | Android では出さない | PASS | 同上 |
| M3 | 外部リンクアイコン(↗) | Other/News/注記に表示 | PASS（404→200 修正後） | android-icon-fixed.png |
| M4 | Ver 表示 | config 由来で表示 | PASS（Ver:1.0.1） | android-icon-fixed.png |
| M5 | WEB は不変 | flag=false で従来メニュー | PASS（Back/Details/Google Play） | web-side-COMPARE-AFTER.png |
| M6 | ヒーロー画像 | feat 全体表示・文字が切れない | PASS（cover→contain 修正後） | hero-CONTAIN.png |

## B. ゲーム疎通（START→配り→プレイ）
| ID | 観点 | 期待 | 結果 | 証跡 |
|---|---|---|---|---|
| G1 | START→BET | BET 選択（COIN/keypad） | PASS | smoke-2-bet.png |
| G2 | BET 確定→配り | 4人(YOU+CPU×3)・親決め | PASS（COIN 100→99） | smoke-3-deal.png / smoke-4-hands.png |
| G3 | 手札描画 | YOU の手札がカード画像で表示 | PASS（9♠4♥K♣7♥10♥3♣2♣） | smoke-4-hands.png |
| G4 | ペア捨て/ドロー機構 | 「Discard matching pairs」「Draw from CPUx」 | PASS（CPU1 上がり→グレー） | smoke-5-end.png |
| G5 | エラー無し | pageerror 0 | PASS | smoke ログ |

## C. アセット監査（全 52 件 200・4xx/5xx 0）
| 種別 | 件数 | 結果 | 例 |
|---|---|---|---|
| 画像(webp/png/svg) | 45 | 全 200 | back_card.png / clubs_Q.png / spades_9.png / external_link.svg / feat.webp |
| 効果音(ogg/mp3) | 6 | 全 200 | main_bgm.ogg / start.mp3 / deal_cards_btn.mp3 / card_draw.mp3 / submit.mp3 / submit_btn.mp3 |
| config(json) | — | 200 | old-maid_app_config.json |

## D. 未検証 / 後続（要・実機 or 後フェーズ）
- AD point（手札≤3）の **実広告**は Flutter/AdMob のみ（web プレビューは bridge 無しで no-op）。→ エミュ/実機で確認（P6）。
- **Remove Ads クリック**＝ダイアログ＋課金は **P5**（現状ボタン表示のみ）。
- 勝敗終了バナー（win/lose）: 1ゲームが長く smoke 時間内に未到達。要・長時間 or Debug 強制終了で確認。
- 設定モーダル / ガイドモーダル / システムバック: 個別確認は次サイクル。

## 修正で潰したバグ（このサイクル）
1. Android メニューが WEB と同一（Remove Ads 等が出ない）→ ベース `standalone-card-game-app.ts` に `isAndroidApp()` 出し分け追加。
2. 外部リンク/その他アセットが Android で 404 → `buildGameAssetUrl`/`resolveConfigUrl` の Android 専用パス分岐(`./game-assets/`・`./assets/configs/`)が dist 構成と不整合 → base 相対の単一スキームに統一。
3. ヒーロー画像の文字切れ → `.feature-image` を cover→contain。
