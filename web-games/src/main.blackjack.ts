import './games/blackjack/blackjack-standalone-app'
import { resolveHubUrl } from './shared/infra/hub-navigation'
import { playSceneFadeOut } from './shared/ui/scene-fade'

const app = document.querySelector('blackjack-standalone-app')

// ゲーム内 HOME はアプリ内メニューへ戻る（アプリ自身が処理。/games-apps へは戻さない）。
// ここはメニューの「戻る」ボタンのみ＝ハブ(/games-apps)へ、フワッと黒へフェードしてから遷移。
app?.addEventListener('menu-back', () => {
  void playSceneFadeOut().then(() => {
    window.location.href = resolveHubUrl()
  })
})
