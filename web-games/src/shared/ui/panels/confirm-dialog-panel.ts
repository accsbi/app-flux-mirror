import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classicBlueButtonStyles } from '../classic-button.styles'

@customElement('confirm-dialog-panel')
export class ConfirmDialogPanel extends LitElement {
  @property({ type: String }) title = ''
  @property({ type: String }) message = ''
  @property({ type: String }) okLabel = ''
  @property({ type: String }) cancelLabel = ''

  private emitAccept(): void {
    this.dispatchEvent(new CustomEvent('confirm-accept', { bubbles: true, composed: true }))
  }

  private emitCancel(): void {
    this.dispatchEvent(new CustomEvent('confirm-cancel', { bubbles: true, composed: true }))
  }

  render() {
    // cancelLabel が空なら OK 1ボタン（警告/通知ダイアログとして再利用）。
    const hasCancel = this.cancelLabel.trim().length > 0
    return html`
      <h3>${this.title}</h3>
      <p>${this.message}</p>
      <div class="actions ${hasCancel ? '' : 'single'}">
        ${hasCancel
        ? html`<button class="confirm-btn cancel classic-btn-blue" @click=${this.emitCancel}>${this.cancelLabel}</button>`
        : null}
        <button class="confirm-btn accept classic-btn-blue" @click=${this.emitAccept}>${this.okLabel}</button>
      </div>
    `
  }

  static styles = [css`
    :host {
      display: grid;
      gap: 8px;
      font-size: 24px;
      line-height: 1.4;
      color: #f2f6f7;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: 32px;
    }

    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .actions.single {
      grid-template-columns: 1fr;
    }

    .confirm-btn {
      min-height: 72px;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
  `, classicBlueButtonStyles]
}
