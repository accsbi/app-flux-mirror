import { css } from 'lit'

/**
 * 小さな共通ユーティリティ（自作ミニ Tailwind）。
 *
 * このプロジェクトは Lit の Shadow DOM なので、グローバルな Tailwind の class は
 * 各コンポーネント内に効きません。そこで「レイアウトのちょっとした移動」用の最小クラス集を
 * Lit の `css` として用意し、各コンポーネントの static styles 配列に `utilities` を入れて使います。
 *
 * 使い方:
 *   import { utilities } from '../../shared/ui/styles/utilities'
 *   static styles = [ ...既存..., utilities ]
 *   // テンプレ側: <div class="u-row u-center-y u-gap-8"> ... </div>
 *
 * 方針:
 *   - グローバル CSS / :root トークン / 既存の css`` には触れない（共存）。
 *   - クラスは衝突回避のため必ず `u-` プレフィックス。
 *   - 値は 4px 刻みの最小限。足りなければここに追記（単一ソース）。
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
