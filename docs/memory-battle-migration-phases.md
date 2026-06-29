# memory-battle (memorymonsters) → Classic Simple Memory Battle 移行フェーズ

最終更新: 2026-06-28 / 着手チェックポイント: git tag `pre-memory-battle` (= commit 0873192)

## 方針（確定事項）
- 土台 = **high-low(00006) を 80–90% 流用**。old-maid は「モーダル外部リンクのフォールバック方式」だけ不採用（その他は参考可）。
- 新規スクラッチではなく **memorymonsters の既存ストアID/キーを流用**（ストア更新アップロード）。
- 完成形 Flutter は `/mnt/c/Users/dev/pj/google_play_store_app/00005_memory-battle`（現在空）に構築。
- **自律実行**：各フェーズで AI が疎通テスト→OK なら次フェーズへ。ユーザー確認は挟まない。ゴールまで進める。
- **AAB は作らない**（リリース成果物は出さない）。**Flutter の実機疎通テストは人間が実施**。AI はコード完成・解析(`flutter analyze`)・Web ビルド・assets 同期までを担保。
- WEB ゲーム本体は実装・テスト済み（バグ無し前提）。AI が触るのは android ローダー html・文字切れ・Flutter・テスト/INFO/MP4 の生成系。
- 各フェーズ末でチェックポイント commit（`pre-memory-battle` から常に戻せる）。

## 流用する既存キー（memorymonsters・確定）
| 項目 | 値 | 出所 |
|---|---|---|
| applicationId | `com.games.memorymonsters`（変更不可＝既存ストア） | memorymonsters build.gradle.kts:31 |
| AdMob App ID | `ca-app-pub-7478772823447569~2898854013` | memorymonsters AndroidManifest.xml:20 |
| インタースティシャル ad unit | `ca-app-pub-7478772823447569/7612124647` | memorymonsters memorymonsters_page_mobile.dart:13 |
| 課金プロダクト | `remove_ads` | memorymonsters memorymonsters_billing.dart:9 |
| 署名キーストア | `C:/Users/dev/pj/app-flux/android_app/keys/app_flux_upload.jks` / alias `key0` / pass `devapp1234` | high-low key.properties と同一 |
| version | **1.0.1+8 のまま**（既存と同じ。YAML→アプリ同期=high-low方式。リリース時に versionCode を 9+ へ） | memorymonsters pubspec.yaml:19 |
| 表示名 | **Classic Simple Memory Battle**（旧 "Funny Frog Memory Battle" から改名） | 決定事項 |

## 過去不具合の恒久対策（high-low 実装を継承・再発厳禁）
- **Android8 タイトルバー水色 → グレー**：`@android:style/Theme.Light.NoTitleBar`（values / values-night）＋ `MaterialApp(color: 0xFF091418)` ＋ statusBar 黒。
- **minSdk 26（Android8〜）**、Java/Kotlin 17。
- **払い戻し時「資格情報を削除」忘れ対処**：DEBUG限定 `forceConsumeRemoveAds` / JS `debugConsumeRemoveAds`（kDebugMode ガード）。
- **本番 AdMob ＋ テストデバイス登録**（テストID不使用。`updateRequestConfiguration(testDeviceIds)`。実機 hash は人間が登録）。
- **広告前に必ずネット確認**：`navigator.onLine` を evaluateJavascript、判定不能は offline 側へ倒す（フォールバック禁止）。オフラインは統一文言警告→スタートへ戻す。
- **モーダル外部リンクはフォールバックさせない**：Web 側 `requestAd` の統一警告＋外部リンクは外部ブラウザ起動（WebView は残す）。「ネット環境がありません」を出す。old-maid のフォールバック方式は不採用。
- **軽量厳守**：無駄ファイルの AAB 同梱禁止・丸ごとコピペ禁止・不要 asset を入れない。assets 平坦化（`src/main/assets/` 直下・www 禁止）、memory-battle 分のみ同梱。

## 広告タイミング（Web 現状に一致＝確定）
- CPU対戦：プレイヤーが 5 ペア取得（=ステージ折り返し＝半分）で 1 回（`memory-battle-game-table.ts:1468`、`adShownThisStage` で同ステージ1回）。
- 一人用(practice)：ゲーム終了時（`:1591`）。
- Flutter は `notifyNativeGameEnd()`→`game-end` を受けて実インタースティシャル表示、終了後 `window.__onAdComplete()`。

---

## Phase 1 — Web Android ローダー作成 ＋ 文字切れ修正（最初・必須）
メニューが動く前提を作る。high-low.html を真似て一発で作る。
1. `web-games/android/memory-battle.html` を `web-games/android/high-low.html` ベースで作成。差し替え＝コメント / `<title>` / 背景色 / コンポーネント `memorymonsters-standalone-app` / `<script src="../src/main.memorymonsters.ts">`。
2. **WEB で文字が切れる不具合の根本修正**（Android では治っているのに Web で切れる＝手動修正が Web に反映されていない疑い）。`stage-layout.ts` / safe-area / `.stage overflow` 周辺を調査し **Web 側を直す**。8の倍数・見切れ禁止。
3. 疎通テスト：`http://127.0.0.1:5190/web-games/android/memory-battle.html` を render して AI が目視（メニュー/ヘッダー/フッター/文字が切れない）。OK/NG を記録。
4. チェックポイント commit。

## Phase 2 — Flutter プロジェクト構築（00005_memory-battle）
high-low(00006) を複製し、ゲーム固有値を差し替え（無駄コピペ排除）。
1. `00006_high-low` の `lib/ android/ pubspec.yaml analysis_options.yaml` 等を `00005_memory-battle` へ複製（build/.dart_tool 等の生成物は除外＝軽量）。
2. 差し替え：
   - `pubspec.yaml`：name=`memory_battle`、version=`1.0.1+8`。
   - `android/app/build.gradle.kts`：applicationId=`com.games.memorymonsters`、namespace/MainActivity package を `com.games.memorymonsters` に統一、minSdk 26。
   - `AndroidManifest.xml`：AdMob App ID=`~2898854013`、label=`Classic Simple Memory Battle`、INTERNET 権限。
   - `lib/ad_manager.dart`：interstitial=`/7612124647`、testDeviceIds 維持。
   - `lib/*_billing.dart`：product `remove_ads`、DEBUG consume 救済維持。
   - `lib/main.dart`：エントリ `/assets/memory-battle.html`、`MaterialApp(title: 'Classic Simple Memory Battle', color: 0xFF091418)`、JS ブリッジ（`AppFluxHost`/`AndroidBilling`/`__APP_VERSION__` 注入）、game-end/show-ad ハンドリング。
   - `android/key.properties`：high-low と同一（app_flux_upload.jks / key0）。
   - テーマ xml（values, values-night）：NoTitleBar グレー化をそのまま。
   - MainActivity.kt：package パスを移動。
3. 疎通テスト：`flutter pub get` ＋ `flutter analyze`（device 不要の静的確証）。OK/NG 記録。
4. チェックポイント commit。

## Phase 3 — Web ビルド → assets 同期（軽量）
1. `ANDROID_GAME=memory-battle` で Web ビルド（`vite.android.config.ts`）→ `dist-android/` に memory-battle.html ＋ memory-battle assets ＋ `memory-battle_app_config.json` のみ。
2. assets 平坦化 sync（high-low の sync スクリプト相当）で `00005_memory-battle/android/app/src/main/assets/` 直下へ。www 禁止・二重 assets 禁止・他ゲーム除外。旧世代 hash js を残さない。
3. 疎通テスト：assets 構成監査（フラット・余計なゲーム混入なし・サイズ確認）。`flutter analyze` 再確認。**AAB/APK のリリースビルドはしない**（実機疎通は人間）。OK/NG 記録。
4. チェックポイント commit。

## Phase 4 — 簡易テスト（high-low と同じ簡易さ）
1. `e2e_test/00005_memory-battle/` に test-cases.html（期待結果を先に明文化）→ `specs/*.spec.ts`（high-low 流用・game/menu/settings/ui/ads/errors/responsive）。
2. Playwright 実行（web）→ `screenshots/*.jpg`（quality~80）。`python3 scripts/build_report.py 00005_memory-battle`。
3. `test-log.html` に時系列追記（日付/項目/根拠/判定/証跡サムネ）。ミスを OK と書かない。
4. チェックポイント commit。

## Phase 5 — INFO 画像（1080×1920・3言語・多数）
1. `scripts/node/make-info-memory.mjs` を `make-info-highlow.mjs` 複製で作成。出力 `catalog/google_play_store_images/00005_memory-battle/info/{en,ja,zh}/`。
2. board/result/mode/bet/guide/settings/menu/removeads など多画面を無差別に撮る。
3. 全画像の寸法監査＝**1080×1920 のみ**。1枚でも規格外なら NG（レイアウトを直す。サイズで逃げない）。
4. チェックポイント commit。

## Phase 6 — MP4（言語別・場面分割・実動画）
1. `scripts/node/make-video-memory.mjs` を `make-video-highlow.mjs` 複製で作成。540×960 録画→ffmpeg `scale=1080:1920` MP4。
2. 言語別 `{en,ja,zh}`、場面分割：**メインゲーム → 多言語紹介 → メニュー**（離脱防止＝重要場面から）。
3. 紙芝居(PNG連結)禁止＝実際に動く。複数短クリップに分ける。
4. チェックポイント commit。

---

## ゴール
Phase 1–6 完了（AAB 除く）。Flutter プロジェクト・assets・テスト記録・INFO 画像・MP4 が揃い、人間が実機疎通 →（必要なら version bump して）AAB 作成・ストア更新に進める状態。


---

## 進捗（2026-06-28 完了）
- **Phase 1 完了**(commit fa8cc4d): `web-games/android/memory-battle.html` 作成。WEB描画バグ根治＝旧Android専用 `./assets/...` 二重assets404分岐を削除(memory-app-config.ts / memory-battle-game-table.ts)し high-low と同一 base 相対へ。menu/guide/settings 疎通OK。
- **Phase 2 完了**: `00005_memory-battle` に high-low 複製＋memorymonsters キー差替(applicationId/AdMob/billing/label/entry/広告間隔1/__MEMORYMONSTERS_APP__/bg 0xFF0D1215)。`flutter analyze` No issues / `flutter test` pass。844K軽量(ゴミ literal絶対パスdir除去)。
- **Phase 3 完了**: `node tools/sync-android.mjs memory-battle` でビルド→assets平坦化同期(4.2M・www無し・他ゲーム混入無し・単一JS)。本番バンドルを静的配信し3言語描画・config取得・404/エラー無しを確証。
- **Phase 4 完了**(commit 4ab853d): e2e `e2e_test/00005_memory-battle/`(test-cases→specs→test-log→report)。Playwright **77/77 pass**。test-first が**実バグ検出**＝Other Card Games/News 無反応(共有部品 @menu-other-games/@menu-news 未配線)→high-low FIX-2 を共有部品のまま移植して修正(ハードコード/フォールバック無し・再同期済)。
- **Phase 5 完了**(commit e1564b5): INFO画像 `catalog/google_play_store_images/00005_memory-battle/info/{en,ja,zh}/` 各18画面=**54枚 全1080×1920(NG=0)**。scripts/node/make-info-memory.mjs。
- **Phase 6 完了**: MP4 `catalog/google_play_store_images/00005_memory-battle/video/{en,ja,zh}/` 各4本(vid1-main-practice/vid2-main-battle/vid3-intro/vid9-menu)=**12本 全1080×1920・実動画(frames166〜535・フレーム差分で動き確認)**。scripts/node/make-video-memory.mjs(LANGS対応)。*.mp4 は gitignore のため非コミット(ローカル成果物)。

## 人間の残作業（AIスコープ外）
- Flutter 実機/エミュ疎通（Windows側 `flutter run`）: Android8 タイトルのグレー化目視・本番AdMob＋テストデバイス登録(実機hashを ad_manager.dart の _kTestDeviceIds に追加)・課金consume救済・広告タイミング・ネット確認。
- リリース時: versionCode を 9 以上へ bump、store_state を comingsoon→button、AABビルド・ストア更新アップロード。
