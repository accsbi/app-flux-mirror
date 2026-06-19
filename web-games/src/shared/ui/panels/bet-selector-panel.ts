import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './numpad-dialog-panel'
import { classicBlueButtonStyles } from '../classic-button.styles'

const HOME_ICON = '\u{1F3E0}'
const SETTINGS_ICON = '\u2699'
const GUIDE_ICON = '\u{1F4D6}'

@customElement('bet-selector-panel')
export class BetSelectorPanel extends LitElement {
  @property({ type: String }) title = 'Select BET'
  @property({ type: String, attribute: 'available-label' }) availableLabel = 'COIN:'
  @property({ type: Number, attribute: 'available-coin' }) availableCoin = 0
  @property({ type: Number }) bet = 1
  @property({ type: String, attribute: 'start-label' }) startLabel = 'START'
  @property({ type: Boolean, attribute: 'disable-decrease' }) disableDecrease = false
  @property({ type: Boolean, attribute: 'disable-increase' }) disableIncrease = false
  @property({ type: Boolean, attribute: 'disable-start' }) disableStart = false
  @property({ type: Boolean, attribute: 'show-tools' }) showTools = true
  @property({ type: Boolean, attribute: 'show-cancel' }) showCancel = false
  @property({ type: String, attribute: 'cancel-label' }) cancelLabel = 'Cancel'
  @property({ type: String, attribute: 'instruction-text' }) instructionText = ''

  @state()
  private isNumpadOpen = false

  private holdTimer: ReturnType<typeof setTimeout> | null = null
  private holdInterval: ReturnType<typeof setInterval> | null = null
  private isRepeating = false
  private touchActive = false

  private emit(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { detail: { isRepeating: this.isRepeating }, bubbles: true, composed: true }))
  }

  private startHold(callback: () => void, event?: Event): void {
    if (event?.type.startsWith('mouse') && this.touchActive) {
      return
    }
    if (event?.type.startsWith('touch')) {
      this.touchActive = true
      event.preventDefault()
    }
    this.stopHold()
    this.isRepeating = false
    callback()
    this.holdTimer = setTimeout(() => {
      this.isRepeating = true
      this.holdInterval = setInterval(() => {
        callback()
      }, 100)
    }, 500)
  }

  private stopHold(event?: Event): void {
    if (event?.type.startsWith('mouse') && this.touchActive) {
      return
    }
    if (event?.type === 'touchend' || event?.type === 'touchcancel') {
      setTimeout(() => {
        this.touchActive = false
      }, 300)
    }
    this.isRepeating = false
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer)
      this.holdTimer = null
    }
    if (this.holdInterval !== null) {
      clearInterval(this.holdInterval)
      this.holdInterval = null
    }
  }

  private openNumpad(): void {
    this.isNumpadOpen = true
  }

  private closeNumpad(): void {
    this.isNumpadOpen = false
  }

  private onNumpadConfirm(event: CustomEvent<{ value: number }>): void {
    this.dispatchEvent(new CustomEvent('bet-value-change', { detail: { value: event.detail.value }, bubbles: true, composed: true }))
    this.closeNumpad()
  }

  render() {
    return html`
      <div class="bet-modal">
        <div class="bet-modal-head">
          <h3>${this.title}</h3>
          ${this.showTools
            ? html`
                <div class="bet-modal-tools">
                  <button class="bet-tool-btn" aria-label="home" @click=${() => this.emit('bet-home')}>${HOME_ICON}</button>
                  <button class="bet-tool-btn" aria-label="settings" @click=${() => this.emit('bet-settings')}>${SETTINGS_ICON}</button>
                  <button class="bet-tool-btn" aria-label="guide" @click=${() => this.emit('bet-guide')}>${GUIDE_ICON}</button>
                </div>
              `
            : null}
        </div>
        <p class="bet-note">${this.availableLabel}${this.availableCoin}</p>
        <div class="bet-controls">
          <button
            @mousedown=${(e: Event) => this.startHold(() => this.emit('bet-decrease'), e)}
            @mouseup=${(e: Event) => this.stopHold(e)}
            @mouseleave=${(e: Event) => this.stopHold(e)}
            @touchstart=${(e: Event) => this.startHold(() => this.emit('bet-decrease'), e)}
            @touchend=${(e: Event) => this.stopHold(e)}
            @touchcancel=${(e: Event) => this.stopHold(e)}
            ?disabled=${this.disableDecrease}>-</button>
          <div class="bet-value clickable" @click=${this.openNumpad}>${this.bet}</div>
          <button
            @mousedown=${(e: Event) => this.startHold(() => this.emit('bet-increase'), e)}
            @mouseup=${(e: Event) => this.stopHold(e)}
            @mouseleave=${(e: Event) => this.stopHold(e)}
            @touchstart=${(e: Event) => this.startHold(() => this.emit('bet-increase'), e)}
            @touchend=${(e: Event) => this.stopHold(e)}
            @touchcancel=${(e: Event) => this.stopHold(e)}
            ?disabled=${this.disableIncrease}>+</button>
        </div>
        ${this.instructionText ? html`<p class="bet-instruction">${this.instructionText}</p>` : null}
        <div class="bet-action-row ${this.showCancel ? 'two-col' : 'one-col'}">
          ${this.showCancel
            ? html`<button class="bet-cancel-btn" @click=${() => this.emit('bet-cancel')}>${this.cancelLabel}</button>`
            : null}
          <button class="bet-start-btn classic-btn-blue" @click=${() => this.emit('bet-start')} ?disabled=${this.disableStart}>${this.startLabel}</button>
        </div>
      </div>
      ${this.isNumpadOpen
        ? html`
            <numpad-dialog-panel
              title="Enter BET"
              .maxValue=${this.availableCoin}
              .initialValue=${this.bet}
              @numpad-cancel=${this.closeNumpad}
              @numpad-confirm=${this.onNumpadConfirm}
            ></numpad-dialog-panel>
          `
        : null}
    `
  }

  static styles = [css`
    :host {
      display: block;
      width: min(90%, 420px);
    }

    .bet-modal {
      width: 100%;
      border: 3px solid #dccb42;
      background: rgba(13, 84, 33, 0.96);
      border-radius: 14px;
      display: grid;
      gap: 16px;
      text-align: center;
      padding: 16px;
      box-sizing: border-box;
    }

    .bet-modal h3 {
      margin: 0;
      color: #ffd730;
      font-size: 30px;
      line-height: 1.1;
    }

    .bet-modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .bet-modal-tools {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .bet-tool-btn {
      min-width: 44px;
      min-height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f4fbff;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: grid;
      place-items: center;
    }

    .bet-note {
      margin: 0;
      color: #f2f6f7;
      font-size: 20px;
      font-weight: 700;
    }

    .bet-instruction {
      margin: 8px 0 0;
      color: #d9e7eb;
      font-size: 14px;
      line-height: 1.4;
      text-align: center;
    }

    .bet-controls {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
    }

    .bet-controls button {
      min-width: 64px;
      min-height: 64px;
      border-radius: 12px;
      border: 0;
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f4fbff;
      font-size: 32px;
      font-weight: 800;
      cursor: pointer;
    }

    .bet-value {
      min-height: 64px;
      display: grid;
      place-items: center;
      background: rgba(6, 14, 16, 0.65);
      border: 2px solid rgba(255, 255, 255, 0.28);
      border-radius: 12px;
      color: #ffd730;
      font-size: 36px;
      font-weight: 800;
    }

    .bet-value.clickable {
      cursor: pointer;
    }

    .bet-value.clickable:active {
      opacity: 0.8;
    }

    .bet-start-btn {
      min-height: 64px;
      border-radius: 12px;
      border: 0;
      background: #1b68d6;
      color: #f4fbff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.04em;
      cursor: pointer;
    }

    .bet-action-row {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .bet-action-row.one-col {
      grid-template-columns: minmax(0, 224px);
      justify-content: center;
    }

    .bet-action-row.two-col {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .bet-cancel-btn {
      min-height: 64px;
      border-radius: 12px;
      border: 0;
      background: rgba(255, 255, 255, 0.2);
      color: #f4fbff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.04em;
      cursor: pointer;
    }

    .bet-start-btn {
      width: 100%;
      max-width: 224px;
      justify-self: center;
    }

  `, classicBlueButtonStyles]
}
