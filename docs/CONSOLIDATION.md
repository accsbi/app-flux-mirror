# 共通化ルールと違反監査（Consolidation Rules & Audit）

各ゲームで**コピペ・独自実装をせず、共通(shared/common/config)を使う**ための単一ソース。
新規実装・修正前に必ず参照すること。違反を見つけたらここに追記する。

最終監査: 2026-06-22

---

## 0. なぜ何度直しても再発するのか（根本原因）— 着手前に必読

同じ不具合（共通化無視・不整合）を繰り返す原因は、コードではなく**進め方**にある:

1. **このDOCSを最初に読んでいない。** 着手時に本書を読まず、いきなり対象ファイルだけ開く。だから「他ゲームは既に共通方式で解決済み」を見落とし、また独自実装・コピペする。← これ自体がルール無視。
2. **ユニットレベルでしか見ていない。** 1ファイル・1スクショの見た目だけを個別に直し、**同じ機能を3基準ゲーム(blackjack/poker/casino-war)横断で比較しない**。結果、共通の正方式に寄せず、その場しのぎ(symptom)を繰り返す。
3. **症状修正の連鎖。** スクショ→CSS微調整→次のスクショ…を繰り返し、根本(config/shared)に手が入らないので別局面で再発する。
4. **手本コードを読まない。** 仕様の正解は手本 `app-flux/.../simple_old_maid`（Dart）にあるのに、推測で実装して挙動がズレる。

### 着手前ルール（MUST・毎回）
- **(1) 本書 §1/§2 を読む。** 触る機能が既に共通方式で他ゲームに在るかを先に確認。
- **(2) 3基準ゲームと同じ作りか比較してから書く。** 違えば「個別実装」を疑い、共通(config/shared)に寄せる。
- **(3) 修正は config / shared レベルで。** ゲーム個別ファイルに同等物を新規実装しない（=コピペ禁止）。
- **(4) 仕様は手本(app-flux)を読んでから実装。** 親決め・席順・順位・終了画面など UX 仕様は手本が正。
- **(5) スクショは「見た目」ではなく「共通方式に乗っているか」の検証に使う。**

---

## 1. 共通化ルール（全ゲーム共通の「正」方式）

| 項目 | 正しい共通方式 | 基準実装 |
|---|---|---|
| ゲーム内ガイド | config `overview_info.<slug>_guide_content` を `getLocalizedString()` + `splitTextLines()` で読み、`<guide-overview-panel .lines=…>` に渡す。**メニューのガイドと同一ソース**。ハードコード禁止。 | blackjack / poker / casino-war / memory |
| ガイド文言の出所 | BASE markdown `### [ … ] {GUIDE}` セクション → `scripts/build_content.py` → config `*_guide_content`。本文見出しは `■`（`#`/`##`/`###` は parser と衝突するため不可）。 | `scripts/build_content.py` |
| ランタイム文言（「親を決めます」「CPUの番」等） | config の `game.*` / `<game>.*` ブロックから `getLocalizedString()`。**ゲームファイル内に多言語テーブル（`Record<AppLanguage>` / `{ja,en,zh}`）を持たない**。 | blackjack / poker / casino-war = ハードコード0件 |
| 結果バナー (win/lose/tie/push/21/no_more_bets/match…) | `common/messages/*.png` を `buildGameAssetUrl('messages/<name>.png')` で読む。 | blackjack / casino-war / memory |
| アセットURL | `buildGameAssetUrl()` 一本（`shared/infra/game-asset-url.ts`）。`messages/`/`cards/`/`effects/` 等の無印は `common/` 解決。 | 全ゲーム |
| 確認 / 設定 / BET / ガイド UI | 共有パネル `confirm-dialog-panel` / `settings-modal` / `bet-selector-panel` / `guide-overview-panel`。独自 inline ダイアログを作らない。 | `shared/ui/panels/*` |
| 広告（インタースティシャル） | WEB=共通 `ad-mock-dialog` ＋ `web-ad-mock`（カウントキーはゲーム別定数）。Android=ブリッジ/native。ゲーム個別の独自広告UIを作らない。**カウントは独自ルール可**。 | blackjack/poker/casino-war=共通7ごと(`card_games_web_ad_count`) / memory=専用点(`memorymonsters_web_ad_count`) / old-maid=手札≤3で1回(`oldmaid_web_ad_count`) |
| 広告カウントの独立性 | **old-maid と memory は共通カウント `card_games_web_ad_count` を増やさない**。各自専用キーのみ。他カードゲームから遊びに来ても 1 とカウントしない（独自ルール）。 | `web-ad-mock.ts` の各キー |
| COIN 残高 / 補充 | `shared/infra/shared-coin-store`、`scheduleCoinRecoveryDialogIfZero`。 | 全ゲーム |
| config 読み込み | game-table が自前で `loadAppConfig('<slug>')` し `appConfig` を保持（standalone から渡さない）。 | blackjack |

> 注: 上の `<slug>` は CSV `file_name`（例 `old-maid`）。config キーは `slug.replace('-','_')`（例 `old_maid_guide_content`）。

---

## 2. 違反監査（全ゲーム横断・ハードコード / ローカライズ漏れ）

正方式: 表示文言は `getLocalizedString(block.game, 'key')`（未設定時のみ `|| 'English fallback'`）。
**config を一切引かない純粋な直書き表示文言 ＝ 違反**（その言語以外で表示されない/不整合）。

### 重度（config 未参照の直書きが多数）

**high-low** — ゲーム内文言の大半が直書き英語（config 参照わずか4箇所）。実質ローカライズされていない。
- `HIGH`/`LOW` ボタン、`PLAYER Wins!`/`CPU Wins!`/`Draw!`（winner）、`BINGO`/`MISS`/`TIE`（結果バナー）、宣言・`action-msg` 等。
- ガイドは config だが `overview_intro` 流用（専用 `high_low_guide_content` でない）。

**old-maid** — `const T`（ja/en/zh）に 11 文言を自前テーブル化（他ゲームは config）。
- `parent / parentIs / removePairs / drawFrom / cpuTurn / cpuPause / shuffle / ok / again / menu / you`。
- 結果表示 `YOU WIN!` / `YOU LOSE` 直書き。
- ガイドは **修正済**（config `old_maid_guide_content` 化、メニューと同一ソース）。

**poker** — `statusMessage()` の status 文言が直書き英語（config 未参照）。
- `Not enough COIN. Reset from Settings.` / `Set BET to 1 or more to start.` / `HOLD or DRAW → SUBMIT` / `EVEN 0 COIN` / `HOLD` / `DRAW`。

### 許容（config + 英語フォールバック ＝ 違反ではない）
- blackjack / casino-war / memory: `getLocalizedString(game,'key') || 'fallback'` 形式。config が正、未設定時のみ英語。
- high-low / memory standalone の課金結果 `Record<AppLanguage>` はストア未接続時フォールバック（許容）。
- 共通元 `shared/config/shared-chrome-text.ts`・`shared/ui/standalone-card-game-app.ts` の多言語は**共有ソース**（正）。

### old-maid の UX/共通化バグ（文言以外・要修正）

| バグ | 内容 | 状態 |
|---|---|---|
| アバター画像 | 焼き込みラベルがファイル名と入替（`cpu2.webp`=「CPU 3」/`cpu3.webp`=「CPU2」）。 | **修正済**: ファイル名を入替（cpu2↔cpu3）。 |
| アバター描画 | コードで名前テキストを重ねて二重表示。YOU 未表示。 | **対応中**: 焼き込みラベルを使い名前テキスト廃止、YOU 追加、右回り4席配置。 |
| 親決めフェーズ | 「親を決めます」でカードを配って表示（手本はカード非表示・アバターのみ＋右回りヒント）。 | **対応中** |
| 終了画面 | 独自「YOU WIN/LOSE」オーバーレイ。手本は4席に順位を出したまま継続→最終的に全席順位＋「もう一度遊びますか？(OK/やめる)」。 | **未** |
| 広告 | old-maid に広告モックが無かった（共通 `ad-mock-dialog` 未使用）。 | **修正済**: 共通 `ad-mock-dialog`＋`web-ad-mock` を導入。タイミングは Player 手札が初めて**3枚以下**で1ゲーム1回（4枚だと配り直後に出るため調整）。専用キー `oldmaid_web_ad_count`＝共通カウントは増やさない。Android アプリはブリッジ実広告。 |
| 親決め文言の二重表示 | `arrange`/`cpuPause` でダイアログ主文言と同じ `message` を盤面 `.msg-band` にも出し2箇所で重複・重なり。 | **修正済**: `dialogOpen` 中は `.msg-band` を抑止。 |

> 結果バナー（win/lose/tie 等）が high-low/poker/old-maid でテキストなのは「個別PNGの寄せのみ」のユーザー合意済み例外（§3）。ただし**その文言が config 由来でない**点は上記の違反に含む。

---

## 3. 既知の許容例外（違反ではない）
- high-low / poker / old-maid の**勝敗バナーはテキスト表示**のまま（ユーザー合意済み: 「個別PNGの寄せのみ」）。共通 `messages/*.png` への置換は対象外。

---

## 4. 運用
- 新ゲーム追加・既存修正時は §1 の表に照らし、独自実装になっていないか確認する。
- 違反を見つけたら §2 に追記し、修正したら状態を更新する。
