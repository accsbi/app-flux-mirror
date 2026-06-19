import './games/high-low/high-low-standalone-app'
import { resolveHubUrl } from './shared/infra/hub-navigation'
import { isAndroidApp } from './shared/infra/web-ad-mock'

// 問い合わせ（お問い合わせ）は一時的に無効化中。
// 再開する場合は以下を復活させ、high-low-standalone-app の openContact / extraActionLabel も戻すこと。
// const contactScript = document.createElement('script')
// contactScript.src = `${import.meta.env.BASE_URL}contact-form.js`
// contactScript.defer = true
// document.head.appendChild(contactScript)

const app = document.querySelector('high-low-standalone-app')

// go-home はゲーム内（ホーム確認/ゲーム終了）からの「メニューに戻る」。
// high-low-standalone-app が screen='menu' に切り替えるので、ここではルート遷移しない。
// ルート(ハブ)へ戻るのはメニューの戻る(menu-back)のみ。
// Android アプリ(WebView 単独起動)ではハブが存在しないため遷移しない（memorymonsters と同じ）。
app?.addEventListener('menu-back', () => {
  if (isAndroidApp()) return
  window.location.href = resolveHubUrl()
})
