# UI を手早くいじるためのガイド

このプロジェクトは **Lit（Web Components / Shadow DOM）** で出来ています。
Shadow DOM のため、グローバルCSS や Tailwind の class は各コンポーネント内に**効きません**。
そこで「レイアウトのちょっとした移動」を楽にするために、**自作ミニ・ユーティリティ**を用意しています。

---

## 1. ユーティリティ class の使い方

各コンポーネントの `static styles` 配列には既に `utilities` が入っています。
テンプレートで `class="u-..."` を付けるだけで効きます。

```ts
// 既に各コンポーネントに配線済み:
import { utilities } from '../styles/utilities'                       // catalog (src/)
import { utilities } from '../../shared/ui/styles/utilities'          // web-games

static styles = [utilities, css`...既存のCSS...`]
```

```html
<div class="u-row u-center-y u-gap-8 u-mt-8"> ... </div>
```

### 使える class（最小セット）
| 種類 | class |
|---|---|
| flex | `u-row` `u-col` `u-center` `u-center-x` `u-center-y` `u-between` `u-wrap` `u-grow` `u-self-center` |
| gap | `u-gap-2/4/6/8/12/16` |
| margin | `u-m-0` `u-mt-4/8/12/16` `u-mb-4/8/12/16` `u-mx-auto` |
| size | `u-fw`(幅100%) `u-fh`(高さ100%) `u-box`(border-box) |
| text | `u-text-center` `u-text-left` `u-text-right` `u-nowrap` |

> 足りない class はユーティリティ定義に**追記**してください（下記2ファイル）。値は 4px 刻みが基本。

### ユーティリティの定義ファイル（クラスを足す場所）
- `src/styles/utilities.ts` … カタログ（`/en/` 等のサイト側）
- `web-games/src/shared/ui/styles/utilities.ts` … ゲーム側
- 同じ内容です。**追記するときは両方**に（src/ と web-games/ は別ツリーのため）。

---

## 2. どのファイルがどの画面か（編集場所マップ）

### ゲーム（web-games/src/games/<game>/）
| ゲーム | 盤面（メインUI） | スタイル |
|---|---|---|
| Blackjack | `blackjack/blackjack-game-table.ts` | 同ファイル内 `css\`` |
| Poker | `poker/poker-game-table.ts` | 同上 |
| Casino War | `casino-war/casino-war-game-table.ts` | 同上 |
| Old Maid | `old-maid/old-maid-game-table.ts` | 同上 |
| High & Low | `high-low/high-low-game-table.ts` | 同上 |
| Memory Battle | `memory/memory-battle-game-table.ts` | `memory/memory-battle-game-table.styles.ts` |

- メニュー（START/Guide/Settings の共通メニュー）: `web-games/src/shared/ui/menu/menu-base.styles.ts`
- 上部ツールバー（ホーム/設定/ガイド）: `web-games/src/shared/ui/chrome/game-toolbar-controls.styles.ts`
- ボタンの基準色（金×緑 / 青系クラシック）: `web-games/src/shared/ui/classic-button.styles.ts`
- フォント（全ゲーム共通＝Cinzel）: `web-games/src/shared/ui/styles/fonts.ts`

### カタログ（src/components/）
`game-card.ts` / `catalog-page.ts` / `detail-page.ts` / `page-hero.ts` /
`site-header.ts` / `breadcrumb.ts` / `static-page.ts`
- 配色トークン（色・余白・角丸など）: `src/styles/global.css` の `:root`（Shadow DOM を貫通する）

---

## 3. 色・サイズの「おおもと」

- カタログの配色/余白/角丸は `src/styles/global.css` の `:root` 変数（`--gold`, `--surface`, `--radius-card` 等）。
  各コンポーネントは `var(--xxx)` で参照しているので、**ここを変えると全体が変わる**。
- ゲームのフォントは `fonts.ts` の `APP_FONT_STACK` 一箇所。
- ゲームの説明文・ガイド・開始説明は **`catalog/base_markdown/<slug>_base.md`** が正本。
  `python3 scripts/build_content.py` で JSON に反映される（詳細は同スクリプトの docstring）。

---

## 4. ビルド / 確認

```bash
npm run dev      # 開発サーバ（http://127.0.0.1:5190）
npm run build    # tsc + 本番ビルド
```

---

## 5. 元に戻す（復元ポイント）

- **Git**: ベースライン commit `Baseline restore point before CSS utilities` に戻せます。
  ```bash
  git log --oneline
  git checkout <baselineのハッシュ>     # 一時的に確認
  # または特定ファイルだけ: git checkout <hash> -- path/to/file
  ```
- **フルバックアップ**: `../playing_cards_backup_*.tar.gz`（リポジトリ外に保存）。
  ```bash
  tar -xzf ../playing_cards_backup_YYYYMMDD_HHMMSS.tar.gz -C /restore/先
  ```
