# High & Low（00006）移行で間違えた箇所 — 全件記録

ユーザー指示「全部 DOCS に書き出せ！間違えた箇所！」に基づく記録（2026-06-27）。
本書は**再発防止の正本**。以降の移行・実装はここを着手前に読む。

## 0. 根本原因（すべてここに帰着）

**high-low-standalone-app.ts を 735 行の「独自実装」にした。** 正しくは old-maid と同じく
共有殻 `shared/ui/standalone-card-game-app.ts`（`StandaloneCardGameApp`）を **継承**する（old-maid は **30 行**）。

- old-maid: `class OldMaidStandaloneApp extends StandaloneCardGameApp`（gameTableTag/backGlobalName/heroImageSrc/detailSlug/guideContentKey/resolveTitle/renderGameScreen を与えるだけ）。
- high-low: メニュー/版数/規約/ニュース/別ゲーム/Remove Ads/ルール/コインを**全部自前で再実装**＝共有の更新が効かず、各所が共有とズレてバグ化。

下記の個別バグはすべて「独自実装でズレた」結果。**正しい恒久修正＝共有殻の継承に置換**（§9）。

## 1. アセット二重 `/assets/assets/` で 404（音が鳴らない・ボタン無反応）※修正済
- 症状: 音が出ない、START/ガイド等が無反応（設定・広告削除だけ反応）。
- 原因: 独自 `high-low-assets.ts`/`high-low-config.ts` の Android 分岐が旧 `./assets/...` のまま＝ページ `/assets/high-low.html` 基準で `/assets/assets/...` を二重生成し 404。
- 修正: Android 専用分岐を削除し、共通と同じ `${BASE_URL}web-games/game-assets/...` に統一。

## 2. メニュー「別のカードゲーム/お知らせ更新」が無反応 ※修正済
- 原因: 独自 standalone に `@menu-news`/`@menu-other-games` ハンドラ＋モーダルが**丸ごと欠落**（共有殻なら標準装備）。
- 修正: 共有部品（news-info-modal-panel/other-games-modal-panel）＋ハンドラ＋card-games-list 取得を high-low に配線。

## 3. 終了画面 ホームボタンが豆粒・2ボタン非統一 ※修正済
- 原因: 独自 `renderGameover` で `もう一度遊ぶ=.btn(32px塗り)` / `ホーム=.btn-ghost(24px透明)` と**別スタイル**。さらに Android WebView は flex ボタンの `min-height` を効かせず ghost が潰れる。
- 修正: `.go-actions .btn { height:136px; min-height:136px; font-size:32px }` を**両ボタンに同一適用**（色のみ差）。回帰＝`specs/ui.spec.ts` UI-001（2ボタン±1px一致・≥88px）。

## 4. 盤面 HIGH/LOW の高さ 92px が8の倍数でない ※修正済
- 原因: `.btn-hl height:92px`（半端値）。修正: **88px(=8×11)**（縮小側＝再拡大せず違反解消）。回帰＝test-cases §G。

## 5. 広告/オフラインが壊れた（機内モードで永遠に遊べる・広告が出ない）※修正済【根本バグ】
- **設計（web-ad-mock.ts に明記）**: high-low の広告は「**7回カウント・課金判定・ネットワーク確認・実広告・オフライン警告は全て native**」が単一所在で持つ。web は endGame ごとに `notifyNativeGameEnd()`＝`window.AppFluxHost.postMessage({game-end})` を送るだけ。
- **根本原因**: Flutter `main.dart` を old-maid テンプレ複製にしたため **`AppFluxHost` の game-end ハンドラが丸ごと欠落**（テンプレは `showInterstitialAd` callHandler のみ）。⇒ web が送る game-end を native が受けず＝**7count もネット確認も一切走らない**＝機内モードで広告も警告も出ず**永遠に遊べる**。元 app-flux `highandlow_page_mobile.dart` は `AppFluxHost`(game-end→`_handleGameEnd`7count→`_handleAdRequest`→`_isOnline`→実広告 or `__onOfflineAdBlocked`)を実装済みだった＝移行で落とした。
- **誤った中間対応（戒め）**: 一旦 web 側に `isOfflineForAd()`(navigator.onLine)で広告ゲートを再実装＝**ロジックの所在を web に移す誤り**＋`?.showInterstitialAd?.()` の silent no-op フォールバックで根本バグを隠蔽。ユーザー指摘「WEBでネット確認するな／フォールバック禁止／根本バグを潰せ」で撤回。
- **正しい修正**: web は `notifyNativeGameEnd()` に戻す（所在は native）。`main.dart` に `AppFluxHost` JS チャネル＋`window.AppFluxHost` shim を実装し、game-end→`_gameEndCount%7==0`→`_handleAdRequest`(=_isOnline→AdManager or `__onOfflineAdBlocked`)。＝元 highandlow と同一・web-ad-mock 設計どおり。
- 回帰＝`specs/ads.spec.ts`（ADS-001 web が AppFluxHost へ game-end 委譲 / ADS-002 `__onOfflineAdBlocked()` で統一警告）。実機の機内モード挙動は native＝最終は実機目視。

## 6. メニューの VER が yaml と同期されない ※修正済
- 原因: 独自 standalone が `.version=${config.app_info.version}`（JSON 値=例 1.0.1）固定。共有殻は `window.__APP_VERSION__`（Flutter が `PackageInfo.version`=pubspec の versionName を注入）を**唯一ソース**にする（config はフォールバックのみ）。
- 修正: `androidAppVersion()` を追加し `__APP_VERSION__ || config.app_info.version` に（共有 `StandaloneCardGameApp.androidAppVersion` と同一）。**versionName を変えれば VER も追従**。

## 7. Remove Ads の規約がローカル(AAB 同梱)固定 ※修正済
- 原因: 独自 standalone が `termsContent=removeAdsUi.terms_content`（ローカル `remove_ads_ui.json`）**のみ**。外部共通の `terms-of-use.json` を**一切ライブ取得していない**。⇒ 規約が AAB に焼き込み固定＝出荷後に直せない（ユーザー指摘「フォールバックは AAB 同梱したら取り返しつかない」）。共有殻は `loadTermsOfUse()` で**外部ライブ取得（app-flux-mirror）→オフライン時のみ同梱**＝サイト再デプロイで全アプリ即反映。
- 修正: high-low に `loadTermsOfUse()`（外部ライブ取得）＋`termsData` を追加し、`termsTitle/termsContent` を `termsData?.[lang] || removeAdsUi.terms_content` に（外部優先・共通版を常に表示）。

## 8. 多言語テーブルのハードコード（未解消・要対応）
- `removeAdsMessages` に en/ja/zh の文言テーブルを**ゲーム内ハードコード**（`high-low-standalone-app.ts`）。ルール「ランタイム文言は config 由来・多言語テーブルをゲームにハードコードしない」違反。
- 正しくは共有殻＋config（`getLocalizedString`）に寄せる＝§9 の継承で解消。

## 8b. 機内モードで「永遠に遊べる」真因＝広告カデンスが per-game（過去=per-turn を見ろ）※修正済【根本】
- §5 で native に AppFluxHost game-end を実装後も無限に遊べた。**真因＝広告/ネット確認のトリガを `endGame()`（1ゲーム終了＝デッキ空。full は26ラウンド）に置いた**（POKER 流用）。だが High & Low の設計は `web-ad-mock` 明記の **「Next Turn 押下＝1プレイで +1」＝元 app-flux highandlow の攻めターン単位**。per-game だと7ゲーム＝数百ターン遊べてから初めてゲート＝事実上ブロックされない＝「永遠に遊べる」。
- 修正: `showAdMockIfNeeded()` を **`endGame` から `nextTurn()`（Next Turn 押下ごと）へ移動**。7ターンごとに広告／オフラインは native がブロック。
- **戒め**: 「ネット確認されてない」を navigator.onLine 不信頼と決めつけ **`InternetAddress.lookup` を発明**したが誤り（一旦入れて撤回）。**ユーザー「過去のそっち（元 highandlow）を見ろ」＝元はカデンス per-turn＋navigator.onLine で動いていた**。`_isOnline` は元と同じ navigator.onLine に戻し、判定不能時のみ **false(オフライン)** へ（true=online フォールバック禁止＝§1c）。

## 8c. Remove Ads ダイアログが閉じられない（Cancel/✕ 不能）※修正済【自分が混入】
- 原因: §7 の修正時に **lit の `html` テンプレートのタグ内（属性の間）に `<!-- HTML コメント -->` を入れた**。HTML/lit はタグ内コメントを許さず、以降の属性束縛が壊れ **`@remove-ads-close` が無効化**＝閉じイベントが発火しない。ビルドは通る（lit は実行時解析）ため E2E の存在チェックだけでは気付けなかった。
- 修正: タグ内コメントを除去。回帰＝`specs/menu.spec.ts` MENU-004b（Cancel で閉じる）。**教訓: lit テンプレートのタグ内にコメントを書かない（JS コメントは html`` の外に）**。

## 8d. オフラインで規約が出ない時の警告 ※対応済
- §7 で規約を外部ライブのみにした結果、オフラインでは規約本文が空。ユーザー要望で **「インターネット環境が必要です」の状態表示**を出す（config 共有 chrome `externalLinkNote`/`offlineAdTitle` 由来）。**＝規約の代替/同梱の古い規約ではなく、オフライン状態の明示**（フォールバックではない）。

## 9. 正しい恒久修正（推奨・要承認）— 共有殻の継承に置換
high-low-standalone-app.ts を old-maid と同型（≈30 行）に置換し `StandaloneCardGameApp` を継承する。
これで §1〜§8 の大半が**共有実装に一本化**され再発しない。留意点（移行時に検証）:
- `high-low-game-table` は現状 `.language`/`.config` をプロップで受ける（old-maid-game-table は自前ロード）。継承時は renderGameScreen で `.config=${this.appConfig}` を渡すか、game-table を自前ロードに変更。
- `guideContentKey='guide_content'`・`detailSlug='high-low'`・`backGlobalName='__HIGHANDLOW_APP__'`。
- 置換後は `e2e_test/00006_high-low/specs`（82 ケース）＋ APK ビルドで疎通検証。
- **本タスクでは §6/§7 はリスクの低い個別修正で先行対応**（独自 standalone のまま共有と同じ挙動に合わせた）。§9 の全面置換は別途・E2E を網にして実施。

## 10. 今日(2026-06-27)の失敗・やり直し全件（時間を溶かした原因）
**1日かけてこれ＝以下の手戻りが原因。明日の Memory では `docs/MEMORY-MIGRATION-PLAN.md` で回避する。**

### 実バグ（最終的に直したもの）
1. アセット二重404（音出ない/無反応）／2. メニュー news・other-games 欠落／3. 終了2ボタン豆粒・非統一／4. 盤面88px非8倍数／5. 広告 native AppFluxHost 欠落／6. 機内モード永遠（カデンス per-game）／7. VER 非同期／8. 規約ローカル固定／9. Remove Ads 閉じ不能（自分混入）／10. オフライン規約警告。

### やり直し＝手戻り（私の誤判断で二度手間になった箇所）
- **広告/オフライン**：①web に `isOfflineForAd` で再実装（所在誤り）→撤回 → ②OLD MAID 流の web カウントに変更→撤回 → ③正解＝native AppFluxHost＋web は通知のみ。さらに ④カデンスを per-game のまま見落とし→ per-turn に修正。⑤ネット確認を `InternetAddress.lookup` で発明→撤回→元の navigator.onLine に。**＝「過去(app-flux)を先に読む」を怠り3往復した。**
- **規約**：外部fetch追加したが**同梱フォールバックを残し**機内モードで古い規約表示→フォールバック全除去でやり直し。
- **VER**：`__APP_VERSION__ || config` のフォールバック付きで入れ→§1c でフォールバック除去にやり直し。
- **Remove Ads 閉じ不能**：規約修正時に**lit タグ内に HTMLコメント**を入れて `@remove-ads-close` を破壊（自分で埋めた地雷）。
- **テスト過投資**：実バグより先に E2E スイート(82件)と INFO/MP4 を作り込み、本番前の実バグ(VER/広告/規約)を後回しにして叱責。
- **WSL gradle I/O**：`/mnt/c` の FileHasher I/O エラーで APK ビルドが何度も失敗。`~/.gradle/daemon`＋`caches/journal-1` 削除で復旧（or Windows 側ビルド）。**ビルド環境で時間を溶かした。**

### 根本（再掲）
全部 **§0 の「独自実装(735行 standalone)＋その場限りフォールバック」**に帰着。共有殻を使えば大半は発生しない。

## 進め方の反省（プロセス）
- 「載せ替え（移行）」指示なのに**機能を変えた**（広告/版数/規約）。移行は挙動を変えない＝**着手前に old-maid と差分検証**する。
- E2E の作り込みに時間を使い、本番前の実バグ（VER/広告/規約）を後回しにした。**本番前は実バグ優先**。
- 確証なしに「直った」と言わない。確証＝コード差分＋ビルド＋E2E＋（最終は実機目視）。
