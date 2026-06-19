import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { gameToolbarControlsStyles } from './game-toolbar-controls.styles'
import { ensureClassicFont } from '../classic-font'

export interface ToolbarButtonItem {
  label: string
  action: string
  visible?: boolean
}

@customElement('game-toolbar-bar')
export class GameToolbarBar extends LitElement {
  @property({ attribute: false })
  buttons: ToolbarButtonItem[] = []

  @property({ type: Boolean })
  disabled = false

  connectedCallback(): void {
    super.connectedCallback()
    ensureClassicFont()
  }

  private onClick(action: string): void {
    this.dispatchEvent(
      new CustomEvent<{ action: string }>('toolbar-action', {
        bubbles: true,
        composed: true,
        detail: { action }
      })
    )
  }

  render() {
    return html`
      <div class="toolbar-grid">
        ${this.buttons.map(
          (item) => html`
            <button
              class="toolbar-btn ${item.visible === false ? 'invisible' : ''}"
              type="button"
              ?disabled=${this.disabled}
              @click=${() => this.onClick(item.action)}>
              <span class="toolbar-btn-text">${item.label}</span>
            </button>
          `
        )}
      </div>
    `
  }

  static styles = [gameToolbarControlsStyles, css`
    :host {
      display: block;
      width: 100%;
    }

    .toolbar-btn.invisible {
      visibility: hidden;
    }
  `]
}
