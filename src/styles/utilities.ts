import { css } from 'lit'

/**
 * カタログ(src/)用の小さな共通ユーティリティ（自作ミニ Tailwind）。
 *
 * このサイトは Lit の Shadow DOM なので、グローバルCSSや Tailwind の class は
 * コンポーネント内に効きません。レイアウトのちょっとした移動用の最小クラス集を
 * Lit の `css` として用意し、各コンポーネントの static styles 配列に `utilities` を入れて使います。
 *
 * 使い方:
 *   import { utilities } from '../styles/utilities'
 *   static styles = [utilities, css`...既存...`]
 *   // テンプレ側: <div class="u-row u-center-y u-gap-8"> ... </div>
 *
 * 注意: 同じ内容を web-games/src/shared/ui/styles/utilities.ts にも置いています
 *       （src/ と web-games/ はビルド上は同じだが別ツリーのため）。クラスを足すときは両方に。
 */
export const utilities = css`
  /* ── flex 配置 ── */
  .u-row { display: flex; flex-direction: row; }
  .u-col { display: flex; flex-direction: column; }
  .u-center { display: flex; align-items: center; justify-content: center; }
  .u-center-x { display: flex; justify-content: center; }
  .u-center-y { display: flex; align-items: center; }
  .u-between { display: flex; align-items: center; justify-content: space-between; }
  .u-wrap { flex-wrap: wrap; }
  .u-grow { flex: 1 1 0; min-width: 0; min-height: 0; }
  .u-self-center { align-self: center; }

  /* ── gap ── */
  .u-gap-2 { gap: 2px; }
  .u-gap-4 { gap: 4px; }
  .u-gap-6 { gap: 6px; }
  .u-gap-8 { gap: 8px; }
  .u-gap-12 { gap: 12px; }
  .u-gap-16 { gap: 16px; }

  /* ── margin ── */
  .u-m-0 { margin: 0; }
  .u-mt-4 { margin-top: 4px; }
  .u-mt-8 { margin-top: 8px; }
  .u-mt-12 { margin-top: 12px; }
  .u-mt-16 { margin-top: 16px; }
  .u-mb-4 { margin-bottom: 4px; }
  .u-mb-8 { margin-bottom: 8px; }
  .u-mb-12 { margin-bottom: 12px; }
  .u-mb-16 { margin-bottom: 16px; }
  .u-mx-auto { margin-left: auto; margin-right: auto; }

  /* ── サイズ ── */
  .u-fw { width: 100%; }
  .u-fh { height: 100%; }
  .u-box { box-sizing: border-box; }

  /* ── テキスト ── */
  .u-text-center { text-align: center; }
  .u-text-left { text-align: left; }
  .u-text-right { text-align: right; }
  .u-nowrap { white-space: nowrap; }
`
