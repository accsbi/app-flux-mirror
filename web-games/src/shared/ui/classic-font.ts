// クラシックボタン（金×緑）の Cinzel フォントを document.head に一度だけ読み込む。
// メニュー・ヘッダー・フッターのどこから呼んでも安全（id 重複チェックで二重読込しない）。
// shadow DOM 内でも document レベルのフォントは効くため、head への <link> 注入で全ゲームに適用される。
export function ensureClassicFont(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('ccg-cinzel-font')) return
  // Cinzel は **ローカルにバンドル**して読む。旧実装は Google Fonts CDN 依存で、実機 WebView の
  // オフライン/CDN 不達時に Cinzel が落ちてフォールバック書体になり WEB と font が変わっていた。
  // 可変 woff2(latin) が weight 600-700 をカバー。sync で APK の www にも入る。
  const url = new URL(
    `${import.meta.env.BASE_URL}web-games/game-assets/fonts/cinzel-600.woff2`,
    window.location.href,
  ).toString()
  const style = document.createElement('style')
  style.id = 'ccg-cinzel-font'
  style.textContent =
    `@font-face{font-family:'Cinzel';font-style:normal;font-weight:600 700;` +
    `font-display:swap;src:url('${url}') format('woff2');}`
  document.head.appendChild(style)
}
