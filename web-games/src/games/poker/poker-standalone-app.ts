import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { type AppConfigLanguage, getLocalizedString } from '../../shared/config/app-config'
import { buildFeatureImageUrl } from '../../shared/infra/game-feature-image'
import { StandaloneCardGameApp } from '../../shared/ui/standalone-card-game-app'
import './poker-game-table'

// Poker のスタンドアロン殻。共通処理は StandaloneCardGameApp に集約済み。差分のみ定義。
@customElement('poker-standalone-app')
export class PokerStandaloneApp extends StandaloneCardGameApp {
  protected readonly gameTableTag = 'poker-game-table'
  // Android native が参照する固定グローバル名/メソッド名（変更不可）。
  protected readonly backGlobalName = '__SIMPLE_POKER_APP__'
  protected readonly backMethodName = 'onSystemBack'
  protected readonly heroImageSrc = buildFeatureImageUrl('poker')
  protected readonly detailSlug = 'poker'
  protected readonly guideContentKey = 'guide_content'

  protected resolveTitle(block: AppConfigLanguage | undefined): string {
    const t = getLocalizedString(block?.menu, 'game_poker')
    if (!t) throw new Error('poker のタイトルが CSV/config にありません（直書き禁止）。')
    return t
  }

  protected renderGameScreen(): TemplateResult {
    return html`
      <main class="app-shell">
        <poker-game-table @go-home=${this.goHome}></poker-game-table>
      </main>
    `
  }
}
