import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { type AppConfigLanguage, getLocalizedString } from '../../shared/config/app-config'
import { buildFeatureImageUrl } from '../../shared/infra/game-feature-image'
import { StandaloneCardGameApp } from '../../shared/ui/standalone-card-game-app'
import './casino-war-game-table'

// Casino War のスタンドアロン殻。共通処理は StandaloneCardGameApp に集約済み。差分のみ定義。
@customElement('casino-war-standalone-app')
export class CasinoWarStandaloneApp extends StandaloneCardGameApp {
  protected readonly gameTableTag = 'casino-war-game-table'
  // Android native が参照する固定グローバル名/メソッド名（変更不可）。
  protected readonly backGlobalName = '__SIMPLE_CASINO_WAR_APP__'
  protected readonly backMethodName = 'onSystemBack'
  protected readonly heroImageSrc = buildFeatureImageUrl('casino-war')
  protected readonly detailSlug = 'casino-war'
  protected readonly guideContentKey = 'guide_content'

  protected resolveTitle(block: AppConfigLanguage | undefined): string {
    const t = getLocalizedString(block?.menu, 'game_casino_war')
    if (!t) throw new Error('casino-war のタイトルが CSV/config にありません（直書き禁止）。')
    return t
  }

  protected renderGameScreen(): TemplateResult {
    return html`
      <main class="app-shell">
        <casino-war-game-table @go-home=${this.goHome}></casino-war-game-table>
      </main>
    `
  }
}
