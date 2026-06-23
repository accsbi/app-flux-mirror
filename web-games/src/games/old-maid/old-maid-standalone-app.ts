import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { StandaloneCardGameApp } from '../../shared/ui/standalone-card-game-app'
import { buildFeatureImageUrl } from '../../shared/infra/game-feature-image'
import './old-maid-game-table'

// Old Maid（ババ抜き）。共有殻 StandaloneCardGameApp を継承し、他ゲームと同一の統一メニューを使う。
// START 後は old-maid-game-table（4人ターン制の実ゲーム）を描画。
@customElement('old-maid-standalone-app')
export class OldMaidStandaloneApp extends StandaloneCardGameApp {
  protected readonly gameTableTag = 'old-maid-game-table'
  protected readonly backGlobalName = '__OLD_MAID_APP__'
  protected readonly backMethodName = 'onAndroidBack'
  protected readonly heroImageSrc = buildFeatureImageUrl('old-maid')
  protected readonly detailSlug = 'old-maid'
  protected readonly guideContentKey = 'guide_content'

  protected resolveTitle(): string {
    // タイトルは CSV(games-list.csv, getGameTitle) が唯一の正。ここに来る＝CSV欠如なのでエラー。
    throw new Error('old-maid のタイトルが CSV(games-list.csv) にありません（直書き禁止）。')
  }

  // 盤面の戻る制御は介さず常にホーム（メニュー）へ戻す。
  protected handleGameBack(): boolean {
    this.emitGoHome()
    return true
  }

  protected renderGameScreen(): TemplateResult {
    return html`<old-maid-game-table @go-home=${this.goHome}></old-maid-game-table>`
  }
}
