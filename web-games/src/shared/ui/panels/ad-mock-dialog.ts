import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// WEB の広告モック（実広告枠の代わりに出すダイアログ）。全カードゲーム共通の単一ソース。
// 閉じるときに 'ad-mock-close' を発火する。
@customElement('ad-mock-dialog')
export class AdMockDialog extends LitElement {
  @property({ type: Number }) count = 0
  @property({ type: String }) okLabel = 'OK'

  private close(): void {
    this.dispatchEvent(new CustomEvent('ad-mock-close', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      <div class="ad-overlay">
        <div class="ad-card">
          <span class="ad-badge">AD</span>
          <p class="ad-title">Advertisement</p>
          <p class="ad-sub">(mock) game count: ${this.count}</p>
          <button class="ad-ok" @click=${this.close}>${this.okLabel}</button>
        </div>
      </div>
    `
  }

  static styles = css`
    :host { display: contents; }
    .ad-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(5, 10, 11, 0.82);
      display: grid;
      place-items: center;
      padding: 16px;
      box-sizing: border-box;
    }
    .ad-card {
      width: min(100%, 420px);
      display: grid;
      gap: 12px;
      justify-items: center;
      text-align: center;
      background: rgba(10, 23, 25, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 18px;
      padding: 22px 18px;
      box-sizing: border-box;
    }
    .ad-badge {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      color: #0f1517;
      background: #ffd730;
      border-radius: 6px;
      padding: 2px 10px;
    }
    .ad-title {
      margin: 0;
      font-size: clamp(22px, 5.6vw, 30px);
      font-weight: 800;
      color: #f4fbff;
    }
    .ad-sub {
      margin: 0;
      font-size: clamp(13px, 3.4vw, 16px);
      font-weight: 600;
      color: rgba(244, 251, 255, 0.7);
    }
    .ad-ok {
      width: 100%;
      min-height: clamp(52px, 12vw, 64px);
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #07221f;
      font-family: inherit;
      font-size: clamp(16px, 4.4vw, 20px);
      font-weight: 800;
      letter-spacing: 0.02em;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'ad-mock-dialog': AdMockDialog
  }
}
