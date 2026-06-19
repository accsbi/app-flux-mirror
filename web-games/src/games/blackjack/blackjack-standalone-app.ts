import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { type AppConfigLanguage } from '../../shared/config/app-config'
import { buildFeatureImageUrl } from '../../shared/infra/game-feature-image'
import { StandaloneCardGameApp } from '../../shared/ui/standalone-card-game-app'
import './blackjack-game-table'

// Blackjack のスタンドアロン殻。共通処理は StandaloneCardGameApp に集約済み。差分のみ定義。
@customElement('blackjack-standalone-app')
export class BlackjackStandaloneApp extends StandaloneCardGameApp {
  protected readonly gameTableTag = 'blackjack-game-table'
  // Android native(MainActivity.kt) が参照する固定グローバル名/メソッド名（変更不可）。
  protected readonly backGlobalName = '__SIMPLE_BJ_APP__'
  protected readonly backMethodName = 'onAndroidBack'
  protected readonly heroImageSrc = buildFeatureImageUrl('blackjack')
  protected readonly detailSlug = 'blackjack'
  protected readonly guideContentKey = 'blackjack_guide_content'
  protected readonly guideFallbackKeys = [
    'overview_intro',
    'features_content',
    'procedure_content',
    'description_content_1',
    'description_content_2',
    'description_content_3'
  ] as const

  protected resolveTitle(block: AppConfigLanguage | undefined): string {
    return block?.app_title || 'Simple Blackjack'
  }

  // Blackjack は盤面の戻る制御を介さず常にホームへ戻す（従来挙動を維持）。
  protected handleGameBack(): boolean {
    this.emitGoHome()
    return true
  }

  protected renderGameScreen(): TemplateResult {
    return html`
      <blackjack-game-table
        ?demo-available=${!this.autostartGame}
        .demoPlayCount=${1}
        .demoLaunchToken=${0}
        @go-home=${this.goHome}
      ></blackjack-game-table>
    `
  }
}
