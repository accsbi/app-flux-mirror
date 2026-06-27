# Memory（00005_memory-battle）Flutter 移行プラン — High & Low を基に・今日の失敗を全部回避

作成 2026-06-27。**着手前に必ず本書＋`HIGH-LOW-MIGRATION-MISTAKES.md`＋CLAUDE.md §1/§1c を読む。**
目的: 高low で一日溶かした失敗（独自実装→フォールバック、広告カデンス、VER、規約、閉じ不能、E2E後回し）を**繰り返さない**。

## 0. 結論（最短ルート）
1. **Flutter 殻**は 00006_high-low（修正済）を複製して流用。**ただし広告カデンスだけ memory 固有に差し替える**。
2. **WEB standalone は独自実装を作らない**。memory-battle-standalone は現状 `extends LitElement`（=high-low と同じ独自殻＝同じ地雷）。**old-maid と同じく `StandaloneCardGameApp` 継承へ寄せる**か、寄せられない場合でも §3 の個別チェックを**着手時に全部**満たす（後出しにしない）。
3. **E2E スイートを最初に作る**（specs/ を high-low から複製・memory 用に）。実装と同時に回す。後回し厳禁。
4. **フォールバック禁止（§1c）を全行で守る**。`||`/`??`/「失敗時バンドル」を書いたら独自実装のサイン＝共有へ。

## 1. 既知の前提（調査済み）
- WEB は既存（`web-games/src/games/memory/`）。standalone = `memory-battle-standalone-app.ts`（`extends LitElement`＝**独自殻**）/ `memorymonsters-standalone-app.ts`。
- **広告ルールが他と違う**：`web-ad-mock.ts` 記載＝**一人用=1ゲーム終了 / CPU対戦=プレイヤー5ペア時点**（`memory-battle-game-table.ts` の `requestAd`）。専用カウント `MEMORY_WEB_AD_COUNT_KEY='memorymonsters_web_ad_count'`。**共通カウント(card_games_web_ad_count)を増やさない**。
- Flutter フォルダ `00005_memory-battle` は既存（中身要確認）。**android 入口 html は未作成**（`web-games/android/memory*.html` が無い＝high-low 同様まず作る）。
- 旧アプリ（app-flux）の memory 実装があれば**着手前に差分確認**（「過去のそっちを見ろ」＝挙動を変えない）。

## 2. 手順（順序厳守）
1. **テストケース先行**：`e2e_test/00005_memory-battle/test-cases.html` に期待結果を先に書く（CLAUDE.md §0）。high-low §A〜§G を雛形に。
2. **android 入口 html**：`web-games/android/memory-battle.html`（old-maid.html/high-low.html を複製・`<memory-battle-standalone-app>`/`main.memory-battle.ts`/title/bg）。
3. **WEB standalone の地雷つぶし**（§3 を全部）。独自殻なら個別に、可能なら共有殻継承へ。
4. **Flutter 殻**を 00006_high-low から複製し §4 を適用。
5. **広告カデンスを memory 固有に**（§5）。
6. **ビルド→sync→APK**：`ANDROID_GAME=memory-battle npm run build:android` → `node tools/sync-android.mjs memory-battle` → flutter build。
7. **E2E スイート**（§6）を作って回す。85件級の網羅。
8. INFO/MP4（必要なら）。test-log.html に時系列記録。

## 3. WEB standalone チェックリスト（独自殻の地雷＝high-low で全部踏んだ。memory も同型）
- [ ] **VER は `window.__APP_VERSION__`（pubspec）のみ**。`config.app_info.version` へフォールバックしない（§1c）。Android のみ表示。
- [ ] **規約は外部ライブ `terms-of-use.json`（`buildLiveDataUrl`）のみ**。**AAB 同梱(`buildGameAssetUrl`)へフォールバックしない**。取得失敗＝規約は出さず「インターネット環境が必要です」の状態表示（config `externalLinkNote`/`offlineAdTitle`）。
- [ ] **メニュー全ボタンのハンドラ＋モーダルが揃っているか**（news/other-games/remove-ads/settings/guide）。high-low は news/other-games が丸ごと欠落していた。
- [ ] **多言語テーブルをゲームにハードコードしない**（config `getLocalizedString`）。
- [ ] **lit `html` テンプレートのタグ内（属性の間）に `<!-- HTMLコメント -->` を入れない**（high-low で Remove Ads が閉じ不能になった真因）。JS コメントは html`` の外。
- [ ] アセット/設定の解決は共通 base 相対（`${BASE_URL}web-games/game-assets/...`）。Android 専用 `./assets/...` 分岐を作らない（二重 `/assets/assets/` 404＝high-low の音出ない/無反応の真因）。

## 4. Flutter 殻チェックリスト（00006_high-low を流用）
- [ ] `main.dart`：`AppFluxHost` JS チャネル＋`window.AppFluxHost` shim（inappwebview は自動生成しない）＋`game-end`/`show-ad` ハンドラ。**広告カウント/ネット確認/実広告/オフライン警告は native 単一所在**。
- [ ] `_isOnline`＝`navigator.onLine`（元 highandlow 同）。**判定不能時は `false`(オフライン)**。`true`(online)へフォールバックしない。
- [ ] ステータスバー黒＋白アイコン／`MaterialApp(color:0xFF091418)`／recents 名／minSdk 26（Android8 水色化対策）。
- [ ] 課金 `forceConsumeRemoveAds`/`debugConsumeRemoveAds`（kDebugMode）。
- [ ] back グローバル名＝memory の standalone が使う名（high-low は `__HIGHANDLOW_APP__`）に合わせる。
- [ ] AdMob 本番ID＋商品ID は memory のもの。package/applicationId/署名は memory の既存ストアに合わせる（高lowの値を流用しない）。
- [ ] assets 平坦化（www 禁止・二重 assets 禁止）。

## 5. 広告カデンス（memory 固有＝high-low の per-turn を流用しない）
- memory のトリガは **一人用=1ゲーム終了 / CPU対戦=プレイヤー5ペア時点**（`requestAd`）。**high-low の「Next Turn 押下ごと」を機械的にコピーしない**（カデンス取り違え＝high-low で「機内モード永遠」を踏んだ失敗）。
- Android では memory の `requestAd` から **native へ通知**（`notifyNativeGameEnd` か `showInterstitialAd` か、memory WEB の既存実装に合わせる＝過去の挙動を変えない）。**native が7…ではなく memory ルールで広告/オフライン判定**するなら native 側のカウント条件も memory に合わせる。
- オフラインは memory の広告点で native が `__onOfflineAdBlocked`→統一警告→ホーム（無課金）。課金者はオフライン可（`offlineAdMessage` の設計）。
- 専用カウント `MEMORY_WEB_AD_COUNT_KEY` を使い**共通カウントを汚さない**。

## 6. E2E（最初に作る・後回し禁止）
- `e2e_test/00005_memory-battle/specs/` を high-low から複製：`_helpers`(GAME_PATH/inject `__ANDROID_APP__`＋`__APP_VERSION__`)/menu/game/ui/ads/settings/responsive/errors。
- 回帰必須：**APP-002 VER=__APP_VERSION__ 同期** / **MENU-004b Remove Ads が閉じる** / **ADS web→AppFluxHost 委譲・`__onOfflineAdBlocked`→警告** / レスポンシブ360×800・412×915 / console/network エラー0。
- 実行＝`GAME=memory-battle npx playwright test e2e_test/00005_memory-battle/specs`。レポート＝`python3 scripts/build_report.py 00005_memory-battle`（PFX/PHASE に memory 用追記は不要＝同 prefix）。

## 7. プロセス（時間を溶かさないために）
- **本番前は実バグ最優先**。E2E の作り込みや INFO に没頭して実バグを後回しにしない（今日の失敗）。
- **憶測で発明しない**（`InternetAddress.lookup` を勝手に入れて撤回した）。**過去（app-flux / old-maid）の実装を先に読む＝差分確認**。
- **「直った」はビルド＋E2E＋（最終は実機）まで**。確証なしに言わない。
- WSL の `/mnt/c` gradle I/O エラーが出たら `~/.gradle/daemon` と `caches/journal-1` を消すか、**Windows 側（Android Studio / flutter run）でビルド**（user の通常フロー）。
