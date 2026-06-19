import { html } from 'lit'

/**
 * 共通コインアイコン（唯一の正）。
 *
 * 以前は絵文字 🪙 (U+1FA99) を直接埋め込んでいたが、端末や WebView に
 * その絵文字グリフが無いと豆腐文字（□）に化けてしまう（High & Low の
 * ストア用 INFO 画像で実際に発生）。フォント非依存のインライン SVG に
 * 統一して文字化けを根絶する。
 *
 * サイズは既定で 1em（前後テキストの font-size に追従）。色は単一ソース
 * のためここに集約する。色や形を変えるときはこのファイルだけを直す。
 */
export const coinIcon = (size: string = '1em') => html`
  <svg
    class="coin-icon"
    viewBox="0 0 24 24"
    width=${size}
    height=${size}
    role="img"
    aria-label="coin"
    style="vertical-align:-0.14em;flex:none"
  >
    <circle cx="12" cy="12" r="11" fill="#c9a128" />
    <circle cx="12" cy="12" r="9" fill="#f5cb4c" />
    <circle cx="12" cy="12" r="5.8" fill="none" stroke="#c9a128" stroke-width="1.5" />
    <ellipse cx="9" cy="8.4" rx="2.6" ry="1.7" fill="#ffe9a6" opacity="0.9" />
  </svg>
`
