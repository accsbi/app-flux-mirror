# WEBゲーム → Android(Flutter) 移行プラン（実装前の計画）

対象：`web-games/`（Lit+Vite のカードゲーム）。参考：`/home/dev/wsl_pj/app-flux`（WebViewAssetLoader方式）。
**テスト対象は old-maid のみ。** 今回 Android 化するのは **00004_old-maid → 00005_memory-battle → 00006_high-low** の3つ。
**blackjack / poker / casino-war は今回保留（`00001/00002/00003` フォルダは空のまま）。** WebView ライブラリ＝**flutter_inappwebview** 確定。
本書は計画のみ。実装はしない。

---

## 0. 結論（方針）
- **WebView ホスト方式**：web を Vite で `base:'./'` ビルド → `dist-android/` を Android プロジェクトの `assets/` 直下に置き（`www` は廃止・平坦化）、**Flutter の WebView で読む**（host は Flutter）。
- **ゲームロジック・UI・多言語・COIN/BET は web 側（単一ソース）**。Android 固有（メニュー/実広告/課金/戻る/ネット監視）は **Flutter 側**。
- web↔Flutter は **既存ブリッジ契約**（`__ANDROID_APP__` / `onAndroidBack` / billing / `notifyNativeGameEnd`）を使う。web は通知するだけ、判定・表示は Flutter。

## 1. 役割分担（WSL=開発 / Windows=Flutter・実機）
| やること | 場所 | 理由 |
|---|---|---|
| web 改修・ビルド（Vite, `base:'./'`） | **WSL** | ソースは WSL が単一ソース |
| `dist-android/` を Android の `assets/` 直下へコピー | **WSL**（`/mnt/c` に書ける） | Win に BAT/BASH を置かない方針。WSL で完結 |
| Flutter プロジェクト（WebView host / メニュー / 広告 / 課金 / 戻る） | **Windows** | Flutter/AdMob/IAP は Win + Android Studio が要る |
| APK ビルド・USB実機デバッグ・`chrome://inspect` | **Windows** | 実機・SDK・USB は Win |

- **Win に BAT/BASH は作らない**。WSL 側で「build → /mnt/c へ copy」まで完結（npm script か WSL の make/シェル）。
- Android プロジェクト本体は **`C:\Users\dev\pj\google_play_store_app\<id>_<slug>\`**（WSL から `/mnt/c/Users/dev/pj/google_play_store_app/<id>_<slug>/`）。**ゲーム＝1 Flutter アプリ**（folder 既存：`00001_blackjack`…`00006_high-low`、CSV の package_name と1:1）。old-maid は `00004_old-maid/`。WSL から書込可を確認済み。

## 2. WSL→Win 導線（コピー）
```
WSL:  cd playing_cards && npm run sync:android old-maid   # build:android → android/app/src/main/assets/ 直下へコピー＋他ゲーム剪定
Win:  Android Studio で 00004_old-maid(Flutter) を開く → Run（USB実機）
Win:  chrome://inspect で WebView を Inspect（web 側デバッグ）
```
- **配置先＝`android/app/src/main/assets/` 直下**（`www` は廃止）。さらに Vite を `assetsDir:''` にして内側 `assets/` を作らない。これで旧 `assets/www/assets/` の二重・無駄な入れ子を解消。`flutter_assets/` はビルド時に APK へ注入されるため `src/main/assets/` には無く衝突しない。Android assets は再帰取り込みなので pubspec への列挙も不要。
- Flutter は `flutter_inappwebview` の **`WebViewAssetLoader`**（`AssetsPathHandler('/assets/')`）で `https://appassets.androidplatform.net/assets/old-maid.html` を読み、**`UserScript(AT_DOCUMENT_START)` で `__ANDROID_APP__=true` を注入**（B-2）。メニューは web が Android モードで描画。
- `build:android` は新規 Vite config（`vite.android.config.ts`：`base:'./'`、出力 `dist/`、対象ゲームの html を input）。**WEB 用 `vite.config.ts` は触らない**（web 配信はそのまま）。

## 3. Android メニューの方針（2案比較・採用=B-2）
**app-flux の実態**：`android_index_<app>.html` は専用メニューではなく、web版とほぼ同一で**`window.__ANDROID_APP__=true` を注入して同じ `*-standalone-app` を読むだけ**。「Androidメニュー」＝**WEBと同じ `standalone-game-menu` を `isAndroidApp()` で出し分け**（Remove Ads 表示／ストアリンク非表示 等）。乱立の正体は **android_index×3 ＋ web×5 を1フォルダ平置き**。

### 案A：Flutter ネイティブでメニュー
- 長所：ネイティブ操作感／Win で hot-reload 反復／web=ゲームのみで分離が明快。
- 短所：**メニューを二重実装**（項目・多言語・COIN・設定・Remove Ads を web と Flutter 両方）＝**単一ソース原則(§1)違反**・整合コスト・3ゲーム分の Flutter 増・i18n 再構築。

### 案B：WEBメニューを Android モードで使う（app-flux 方式）
- 長所：**既存 `standalone-game-menu` 再利用＝単一ソース**（多言語/COIN/BET/審査表現が web のまま）／Flutter は薄い host／**WSL dev で `__ANDROID_APP__=true` を立てれば Android メニューをブラウザで即プレビュー＝2度手間を実質回避**。
- 短所：見た目は web（完全ネイティブ質感ではない）／実広告・課金・ネイティブ戻るだけは実機でしか確認不可（メニュー“レイアウト”は WSL で見える）。

**採用 = 案B**（単一ソース・低工数・WSL プレビュー可）。Flutter はメニューを持たず host に徹する。

### フラグ注入と HTML 乱立回避
- **B-2（採用）**：`flutter_inappwebview` の `UserScript(injectionTime: AT_DOCUMENT_START)` で `window.__ANDROID_APP__=true` を注入し、**web の `old-maid.html` をそのまま読む**。→ **android_index HTML 不要＝乱立ゼロ**。
- **B-1（代替）**：HTML を分ける場合は `web-games/android/<slug>.html` の**サブフォルダにまとめる**（app-flux の平置きは禁止）。フラグ確実だが HTML が増える。タイミング問題が出た時のみ採用。
- WEB 配信用メニューはそのまま（Android は同じ HTML を flag 付きで読むだけ）。

## 4. 広告（AD point → 実広告）
**現状（設計済み）**：`web-ad-mock.ts` が単一ソース。WEB=モックダイアログ（`ad-mock-dialog.ts`）／Android=実広告は **native が表示**。web は AD point で `notifyNativeGameEnd()` 等で **native に通知するだけ**（カウント・課金判定・ネット確認・実広告表示は全て native）。

**AD point（＝WEBがモックを出す箇所＝実広告を出す箇所）**：
- blackjack/poker/casino-war：1ゲーム +1、7回ごと。
- high-low：Next Turn(1プレイ) +1、7回ごと。
- memory：1人用=1ゲーム終了 / CPU=プレイヤー5ペア時点。
- **old-maid：手札が初めて3枚以下になった時点・1ゲーム1回**（`maybeShowHandCountAd`）。

**Flutter 側でやること**：
- `notifyNativeGameEnd`（JavaScript channel）を受けて、**AdMob（google_mobile_ads）でインタースティシャルを表示**。間隔(7回)・課金(Remove Ads)・オフライン判定は **Flutter が保持**（web のコピーで上書きされない＝単一所在を native に固定）。
- オフライン時は web の `notifyOffline`（既存）を呼んで、アプリ内言語の警告を web に出させてからスタートへ戻す。
- **WEB 側は変更不要**（既に notify 済み）。Flutter にだけ実広告を実装。

## 5. web↔Flutter ブリッジ契約（既存を踏襲）
| 名前 | 向き | 用途 |
|---|---|---|
| `window.__ANDROID_APP__ = true` | Flutter→web(注入) | Android 判定（ストアリンク非表示・Remove Ads 表示・実広告経路） |
| `window.__<GAME>_APP__.onAndroidBack()` | Flutter→web | システムバック（モーダル1つ閉じ→メニュー→終了） |
| `getAndroidBillingBridge()`（`android-billing-bridge.ts`） | web↔Flutter | Remove Ads 課金・状態・価格 |
| `notifyNativeGameEnd()` / `requestAd` | web→Flutter | AD point 通知（実広告は Flutter） |
| `notifyOffline`（既存） | Flutter→web | 広告タイミングでオフライン警告 |

- Flutter は WebView の JavaScript channel でこれらを実装する。**契約は web 側に既にあるので、Flutter が受け口を作る**。

## 6. フェーズ（old-maid を最初に完走）
1. **P1 基盤（WSL）**：`vite.android.config.ts`（`base:'./'`・`assetsDir:''`）+ `build:android`（old-maid を dist-android 出力。web html をそのまま使う）。`/mnt/c/.../00004_old-maid/android/app/src/main/assets/` 直下への copy 手順（WSL 完結・www 無し）を用意。
2. **P2 Flutter 雛形（Win）**：`flutter_inappwebview` の WebView host ＋ `UserScript(AT_DOCUMENT_START)` で `__ANDROID_APP__=true` 注入 ＋ `onAndroidBack` ＋ assets/ 直下読込（`/assets/<game>.html`）で **old-maid が（Android モードのメニューから）起動**するところまで。
3. **P3 Android メニュー項目の確定（WSL で確認）**：web `standalone-game-menu` の `isAndroidApp()` 出し分けで項目を確定（START/ガイド/設定/Remove Ads/別ゲーム/ニュース等）。**WSL dev で `__ANDROID_APP__=true` を立ててブラウザ確認**。WEB との差分は app-flux の `frontend/games/playing_cards`（isAndroidApp 条件）を参照。Flutter にメニューは作らない。
4. **P4 広告（Win）**：AdMob 雛形＋`notifyNativeGameEnd` 受信＋old-maid の AD point(手札≤3)で実広告。間隔(7)/課金/オフラインを Flutter に。
5. **P5 課金（Win）**：Remove Ads（in_app_purchase）を billing ブリッジに接続。
6. **P6 実機検証（Win）**：USB実機で old-maid を通し（メニュー→ゲーム→AD point→広告→課金→戻る）。`chrome://inspect` で web 側確認。
7. **横展開**：old-maid 完走後に memory-battle → high-low（テンプレ化）。

## 7. テスト対象 / 完了条件（old-maid）
- old-maid のみを実機(USB)で検証。完了条件：
  - Flutter メニュー → old-maid 起動（autostart）→ 1ゲーム完走。
  - AD point（手札≤3）で **実広告**が出る（モックでない）。間隔/課金/オフラインが Flutter 制御。
  - システムバックでモーダル→メニュー→終了が正しい。
  - 多言語・COIN/BET・審査セーフ表現が web のまま反映。
- 証跡：実機スクショ＋判定ログ（CLAUDE.md §3）。`screenshots_log/old-maid/android/` 想定。

## 8. 確定 / 未確定
**確定**
- Win 置き場所：`C:\Users\dev\pj\google_play_store_app\<id>_<slug>\`（ゲーム＝1 Flutter アプリ。folder 既存・WSL 書込可）。old-maid=`00004_old-maid/`。
- WebView ライブラリ＝**flutter_inappwebview**。host=Flutter、WSL=web/build/copy、Win=Flutter/実機。
- メニュー＝**案B-2**（web メニューを Android モードで使用・Flutter が flag 注入・別 HTML なし）。Flutter にメニューは作らない。
- 今回 Android 化＝**old-maid / memory-battle / high-low**。**blackjack/poker/casino-war は保留（空フォルダ）**。

**未確定・要確認**
- Android メニューの**確定項目リスト**（WEB と異なる点）＝P3 で app-flux の `isAndroidApp()` 条件を見て詰める。
- AdMob/in_app_purchase の本番ID（テストIDで P4/P5 を先行）。
- B-2 の UserScript 注入タイミングで問題が出た場合のみ B-1（`web-games/android/<slug>.html` サブフォルダ）にフォールバック。

---
（実装はこのプラン承認後に着手。WSL=web/build/copy、Win=Flutter/実機 の分担を厳守。）
