import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('remove-ads-dialog-panel')
export class RemoveAdsDialogPanel extends LitElement {
  @property({ type: String }) title = 'Remove Ads'
  @property({ type: Array }) lines: string[] = []
  @property({ type: String, attribute: 'close-label' }) closeLabel = 'X'
  @property({ type: Boolean, attribute: 'show-purchase' }) showPurchase = true
  @property({ type: String, attribute: 'purchase-label' }) purchaseLabel = 'Purchase'
  @property({ type: String, attribute: 'cancel-label' }) cancelLabel = 'Cancel'
  @property({ type: Boolean, attribute: 'show-terms' }) showTerms = true
  @property({ type: String, attribute: 'terms-label' }) termsLabel = 'Terms'
  @property({ type: String, attribute: 'terms-link-url' }) termsLinkUrl = ''
  @property({ type: String, attribute: 'terms-title' }) termsTitle = 'Terms of Service'
  @property({ type: String, attribute: 'terms-content' }) termsContent = ''
  @property({ type: String, attribute: 'link-label' }) linkLabel = ''
  @property({ type: String, attribute: 'price-label' }) priceLabel = ''
  @property({ type: String, attribute: 'status-label' }) statusLabel = ''
  @property({ type: Boolean, attribute: 'purchased' }) purchased = false

  @property({ type: Boolean, attribute: 'terms-open' }) termsOpen = false
  @property({ type: String, attribute: 'terms-close-label' }) termsCloseLabel = 'Close'

  private close(): void {
    this.dispatchEvent(new CustomEvent('remove-ads-close', { bubbles: true, composed: true }))
  }

  private onPurchase(): void {
    this.dispatchEvent(new CustomEvent('remove-ads-purchase', { bubbles: true, composed: true }))
  }

  private openTerms(): void {
    const externalUrl = this.termsLinkUrl.trim()
    if (externalUrl.length > 0) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer')
      return
    }
    this.termsOpen = true
  }

  private closeTerms(): void {
    this.termsOpen = false
  }

  private visibleStatusLabel(): string {
    const status = this.statusLabel.trim()
    if (status.length === 0) {
      return ''
    }
    const duplicated = this.lines.some((line) => line.trim() === status)
    return duplicated ? '' : status
  }

  render() {
    const statusLabel = this.visibleStatusLabel()
    const showTopCloseButton = this.closeLabel.trim().length > 0
    return html`
      <section class="panel">
        ${showTopCloseButton
          ? html`<button class="top-close-btn" @click=${this.close}>${this.closeLabel}</button>`
          : null}
        <h3>${this.title}</h3>
        ${this.lines.map((line) => html`<p>${line}</p>`)}
        ${this.priceLabel ? html`<p class="meta-line">${this.priceLabel}</p>` : null}
        ${statusLabel ? html`<p class="meta-line status">${statusLabel}</p>` : null}
        <div class="actions">
          ${this.showPurchase
            ? html`<button class="action-btn purchase-btn" @click=${this.onPurchase} ?disabled=${this.purchased}>${this.purchaseLabel}</button>`
            : null}
          ${this.linkLabel
            ? html`<button class="action-btn purchase-btn" @click=${this.onPurchase}>${this.linkLabel}</button>`
            : null}
          ${this.showTerms
            ? html`<button class="action-btn terms-btn" @click=${this.openTerms}>${this.termsLabel}</button>`
            : null}
          <button class="action-btn cancel-btn" @click=${this.close}>${this.cancelLabel}</button>
        </div>
      </section>
      ${this.showTerms && this.termsOpen
        ? html`
            <section class="terms-overlay" @click=${this.closeTerms}>
              <div class="terms-modal" @click=${(event: Event) => event.stopPropagation()}>
                <h4>${this.termsTitle}</h4>
                <pre>${this.termsContent}</pre>
                <button class="action-btn cancel-btn" @click=${this.closeTerms}>${this.termsCloseLabel}</button>
              </div>
            </section>
          `
        : null}
    `
  }

  static styles = css`
    /* Rule: Keep Remove Ads action buttons aligned with Game Select buttons for tap usability. */
    /* Baseline: height 72px, font-size 24px, vertical gap 24px. */
    :host {
      display: block;
    }

    .panel {
      display: grid;
      gap: 8px;
      position: relative;
    }

    h3,
    p {
      margin: 0;
      line-height: 1.45;
    }

    .meta-line {
      color: #f2f6f7;
      font-size: clamp(16px, 3.6vw, 20px);
    }

    .meta-line.status {
      color: #f4e2b8;
      font-weight: 700;
    }

    .top-close-btn {
      position: absolute;
      right: 0;
      top: 0;
      min-width: 44px;
      min-height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(0, 0, 0, 0.35);
      color: #f2f6f7;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }

    .actions {
      display: grid;
      gap: 24px;
      margin-top: 8px;
    }

    .action-btn {
      min-height: 72px;
      height: 72px;
      max-height: 72px;
      padding: 0;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      border-radius: 999px;
      border: 0;
      background: #6f4a2e;
      color: #1a1a1a;
      font-size: 24px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      touch-action: manipulation;
    }

    .cancel-btn {
      background: rgba(255, 255, 255, 0.2);
      color: #f2f6f7;
    }

    .purchase-btn {
      background: #6f4a2e;
      color: #1a1a1a;
    }

    .purchase-btn:disabled {
      background: rgba(255, 255, 255, 0.32);
      color: #f2f6f7;
      cursor: default;
    }

    .terms-btn {
      background: #6f4a2e;
      color: #1a1a1a;
    }

    .terms-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 10, 11, 0.82);
      display: grid;
      place-items: center;
      padding: 12px;
      z-index: 40;
    }

    .terms-modal {
      width: min(100%, 700px);
      max-height: 100%;
      overflow: auto;
      background: rgba(10, 23, 25, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 12px;
      padding: 12px;
      display: grid;
      gap: 8px;
      box-sizing: border-box;
    }

    .terms-modal h4 {
      margin: 0;
      font-size: 24px;
      color: #f2f6f7;
    }

    .terms-modal pre {
      margin: 0;
      white-space: pre-wrap;
      color: #f2f6f7;
      font-size: 16px;
      line-height: 1.5;
      font-family: inherit;
    }
  `
}
