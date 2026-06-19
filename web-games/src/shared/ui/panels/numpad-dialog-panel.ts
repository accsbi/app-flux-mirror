import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

@customElement('numpad-dialog-panel')
export class NumpadDialogPanel extends LitElement {
  @property({ type: String }) title = ''
  @property({ type: Number }) maxValue = 0
  @property({ type: Number }) initialValue = 0

  @state()
  private displayValue = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.displayValue = String(this.initialValue || 0)
  }

  private appendToInput(digit: string): void {
    const currentValue = this.displayValue || '0'
    const newValue = currentValue === '0' ? digit : currentValue + digit
    const numValue = parseInt(newValue, 10)
    if (!isNaN(numValue) && numValue <= this.maxValue) {
      this.displayValue = String(numValue)
    }
  }

  private clearInput(): void {
    this.displayValue = '0'
  }

  private backspaceInput(): void {
    const currentValue = this.displayValue || '0'
    if (currentValue.length > 1) {
      this.displayValue = currentValue.slice(0, -1)
    } else {
      this.displayValue = '0'
    }
  }

  private setMin(): void {
    this.displayValue = '1'
  }

  private setMax(): void {
    this.displayValue = String(this.maxValue)
  }

  private cancel(): void {
    this.dispatchEvent(new CustomEvent('numpad-cancel', { bubbles: true, composed: true }))
  }

  private confirm(): void {
    const value = parseInt(this.displayValue, 10)
    if (!isNaN(value) && value >= 0 && value <= this.maxValue) {
      this.dispatchEvent(new CustomEvent('numpad-confirm', { detail: { value }, bubbles: true, composed: true }))
    }
  }

  render() {
    return html`
      <section class="overlay">
        <div class="modal">
          <h3>${this.title}</h3>
          <div class="display">${this.displayValue || '0'}</div>
          <div class="numpad">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => html`
              <button class="numpad-btn" @click=${() => this.appendToInput(String(num))}>${num}</button>
            `)}
            <button class="numpad-btn clear" @click=${() => this.clearInput()}>C</button>
            <button class="numpad-btn" @click=${() => this.appendToInput('0')}>0</button>
            <button class="numpad-btn backspace" @click=${() => this.backspaceInput()}>←</button>
          </div>
          <div class="min-max-buttons">
            <button class="min-max-btn" @click=${this.setMin}>MIN</button>
            <button class="min-max-btn" @click=${this.setMax}>MAX</button>
          </div>
          <div class="buttons">
            <button class="action-btn cancel" @click=${this.cancel}>Cancel</button>
            <button class="action-btn confirm" @click=${this.confirm}>OK</button>
          </div>
        </div>
      </section>
    `
  }

  static styles = css`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(5, 10, 11, 0.85);
      display: grid;
      place-items: center;
      padding: 12px;
      z-index: 100;
    }

    .modal {
      width: 96%;
      padding: 16px;
      border-radius: 14px;
      border: 3px solid #dccb42;
      background: rgba(13, 84, 33, 0.98);
      display: grid;
      gap: 16px;
      text-align: center;
      box-sizing: border-box;
    }

    h3 {
      margin: 0;
      font-size: clamp(18px, 4.5vw, 24px);
      font-weight: 800;
      color: #ffd730;
    }

    .display {
      width: 100%;
      min-height: 80px;
      padding: 0 12px;
      border-radius: 12px;
      border: 2px solid rgba(240, 215, 51, 0.6);
      background: radial-gradient(circle at 35% 30%, #fff2b8, #f1b743 55%, #ab5f11);
      color: #241b05;
      font-size: clamp(24px, 6vw, 32px);
      font-weight: 800;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
      display: grid;
      place-items: center;
      box-sizing: border-box;
    }

    .numpad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 8px 0;
      width: 100%;
    }

    .numpad-btn {
      min-height: 80px;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f4fbff;
      font-size: clamp(20px, 5vw, 28px);
      font-weight: 800;
      cursor: pointer;
      transition: opacity 120ms ease;
    }

    .numpad-btn:active {
      opacity: 0.7;
    }

    .numpad-btn.clear {
      background: linear-gradient(180deg, #d14545, #a13333);
    }

    .numpad-btn.backspace {
      background: linear-gradient(180deg, #5a5a5a, #3a3a3a);
    }

    .min-max-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .min-max-btn {
      min-height: 72px;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f4fbff;
      font-size: clamp(16px, 4vw, 20px);
      font-weight: 800;
      cursor: pointer;
      transition: opacity 120ms ease;
    }

    .min-max-btn:active {
      opacity: 0.8;
    }

    .buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .action-btn {
      min-height: 72px;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      font-size: clamp(16px, 4vw, 20px);
      font-weight: 800;
      cursor: pointer;
      transition: opacity 120ms ease;
    }

    .action-btn.cancel {
      background: linear-gradient(180deg, #5a5a5a, #3a3a3a);
      color: #f4fbff;
    }

    .action-btn.confirm {
      background: #1b68d6;
      color: #f4fbff;
    }

    .action-btn:active {
      opacity: 0.8;
    }
  `
}
