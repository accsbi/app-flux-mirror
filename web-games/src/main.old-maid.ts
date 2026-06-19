import './games/old-maid/old-maid-standalone-app'
import { resolveHubUrl } from './shared/infra/hub-navigation'
import { playSceneFadeOut } from './shared/ui/scene-fade'

const app = document.querySelector('old-maid-standalone-app')

// メニューの「戻る」= カタログTOPへフェードしてから遷移（他ゲームと同一挙動）。
app?.addEventListener('menu-back', () => {
  void playSceneFadeOut().then(() => {
    window.location.href = resolveHubUrl()
  })
})
