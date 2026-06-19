import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { ToolbarButtonItem } from './game-toolbar-bar'
import './game-toolbar-bar'

@customElement('game-top-header')
export class GameTopHeader extends LitElement {
  @property({ type: String, attribute: 'home-label' })
  homeLabel = 'Home'

  @property({ type: String, attribute: 'settings-label' })
  settingsLabel = 'Settings'

  @property({ type: String, attribute: 'guide-label' })
  guideLabel = 'Guide'

  @property({ type: Number })
  coin = 100

  @property({ type: Boolean, attribute: 'tools-disabled' })
  toolsDisabled = false

  private emitAction(name: 'header-home' | 'header-settings' | 'header-guide'): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true
      })
    )
  }

  render() {
    const buttons: ToolbarButtonItem[] = [
      { label: this.homeLabel, action: 'home' },
      { label: this.settingsLabel, action: 'settings', visible: this.settingsLabel.trim().length > 0 },
      { label: this.guideLabel, action: 'guide', visible: this.guideLabel.trim().length > 0 }
    ]
    return html`
      <header class="header-wrap">
        <game-toolbar-bar
          .buttons=${buttons}
          .disabled=${this.toolsDisabled}
          @toolbar-action=${(event: CustomEvent<{ action: string }>) => {
            if (event.detail.action === 'home') {
              this.emitAction('header-home')
              return
            }
            if (event.detail.action === 'settings') {
              this.emitAction('header-settings')
              return
            }
            this.emitAction('header-guide')
          }}
        ></game-toolbar-bar>
      </header>
    `
  }

  static styles = [css`
    :host {
      display: block;
      --toolbar-pad-top: var(--toolbar-pad-top-shared, 4px);
      --toolbar-pad-bottom: var(--toolbar-pad-bottom-shared, 4px);
      --toolbar-pad-x: var(--toolbar-pad-x-shared, 2px);
      --toolbar-gap: var(--toolbar-gap-shared, 6px);
      --toolbar-btn-height: var(--toolbar-btn-height-shared, 54px);
      --toolbar-btn-font-size: var(--toolbar-btn-font-size-shared, 20px);
    }

    .header-wrap {
      display: block;
    }
  `]
}


