import './games/memory/memorymonsters-standalone-app'
import { resolveHubUrl } from './shared/infra/hub-navigation'
import { playSceneFadeOut } from './shared/ui/scene-fade'

const app = document.querySelector('memorymonsters-standalone-app')
const isAndroid = (window as Window & { __ANDROID_APP__?: boolean }).__ANDROID_APP__ === true

// go-home（ゲーム内 HOME）は memorymonsters-standalone-app 自身が in-page でメニューへフワッと復帰
// するため、ここでは扱わない（ページ再読込しない＝他ゲームと同じ挙動に統一）。
// menu-back: スタンドアローンメニューのキャンセルボタン → ハブ（7365 は /index.html、本番は /<lang>/web-app/）
app?.addEventListener('menu-back', () => {
  if (isAndroid) return
  void playSceneFadeOut().then(() => {
    window.location.href = resolveHubUrl()
  })
})
