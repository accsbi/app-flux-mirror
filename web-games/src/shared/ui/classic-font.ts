// クラシックボタン（金×緑）の Cinzel フォントを document.head に一度だけ読み込む。
// メニュー・ヘッダー・フッターのどこから呼んでも安全（id 重複チェックで二重読込しない）。
// shadow DOM 内でも document レベルのフォントは効くため、head への <link> 注入で全ゲームに適用される。
export function ensureClassicFont(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('ccg-cinzel-font')) return
  const preconnect = document.createElement('link')
  preconnect.rel = 'preconnect'
  preconnect.href = 'https://fonts.gstatic.com'
  preconnect.crossOrigin = 'anonymous'
  document.head.appendChild(preconnect)
  const link = document.createElement('link')
  link.id = 'ccg-cinzel-font'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap'
  document.head.appendChild(link)
}
