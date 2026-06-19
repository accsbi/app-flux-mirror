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
  protected readonly guideContentKey = 'casino_war_guide_content'
  protected readonly guideFallbackKeys = [
    'casino_war_guide_intro',
    'casino_war_guide_rules',
    'casino_war_guide_payout'
  ] as const

  protected resolveTitle(block: AppConfigLanguage | undefined): string {
    return getLocalizedString(block?.menu, 'game_casino_war') || 'Simple Casino War'
  }

  protected renderGameScreen(): TemplateResult {
    return html`
      <main class="app-shell">
        <casino-war-game-table @go-home=${this.goHome}></casino-war-game-table>
      </main>
    `
  }
}
