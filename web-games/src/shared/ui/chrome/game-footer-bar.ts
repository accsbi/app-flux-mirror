import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { ToolbarButtonItem } from './game-toolbar-bar'
import './game-toolbar-bar'

const FOOTER_DEBUG_ENABLED = false
const FOOTER_DEMO_ENABLED = false

@customElement('game-footer-bar')
export class GameFooterBar extends LitElement {
  @property({ type: Boolean })
  showDebug = false

  @property({ type: Boolean })
  showDemo = false

  // フィードバックボタン（memory web 版のみ opt-in。他ゲームは既定 false で非表示）
  @property({ type: Boolean })
  showFeedback = false

  @property({ type: String })
  feedbackLabel = 'Feedback'

  private onFooterClick(action: 'debug' | 'demo'): void {
    this.dispatchEvent(
      new CustomEvent('footer-action', {
        bubbles: true,
        composed: true,
        detail: { action }
      })
    )
  }

  private onFeedbackClick(): void {
    this.dispatchEvent(
      new CustomEvent('footer-feedback', {
        bubbles: true,
        composed: true,
        detail: { action: 'feedback' }
      })
    )
  }

  render() {
    const buttons: ToolbarButtonItem[] = [
      { label: 'Debug', action: 'debug', visible: FOOTER_DEBUG_ENABLED && this.showDebug },
      { label: 'Demo', action: 'demo', visible: FOOTER_DEMO_ENABLED && this.showDemo },
      { label: this.feedbackLabel, action: 'feedback', visible: this.showFeedback }
    ]
    return html`
      <game-toolbar-bar
        .buttons=${buttons}
        @toolbar-action=${(event: CustomEvent<{ action: string }>) => {
          const action = event.detail.action
          if (action === 'debug' || action === 'demo') {
            this.onFooterClick(action)
          } else if (action === 'feedback') {
            this.onFeedbackClick()
          }
        }}
      ></game-toolbar-bar>
    `
  }

  static styles = [css`
    :host {
      display: flex;
      align-items: flex-end;
      width: 100%;
      height: 100%;
      --toolbar-pad-top: var(--toolbar-pad-top-shared, 4px);
      --toolbar-pad-bottom: var(--toolbar-pad-bottom-shared, 4px);
      --toolbar-pad-x: var(--toolbar-pad-x-shared, 2px);
      --toolbar-gap: var(--toolbar-gap-shared, 6px);
      --toolbar-btn-height: var(--toolbar-btn-height-shared, 54px);
      --toolbar-btn-font-size: var(--toolbar-btn-font-size-shared, 20px);
    }
  `]
}
