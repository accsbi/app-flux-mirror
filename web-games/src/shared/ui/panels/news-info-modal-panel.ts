import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classicButtonStyles } from '../classic-button.styles'
import { menuBaseStyles } from '../menu/menu-base.styles'

// 「お知らせ・更新情報」モーダル。仕様変更後は news_content 本文を出さず、2ボタン式：
//   ① 最新版を確認 → Play ストアを外部別窓（storeUrl）
//   ② このアプリについて → サイトの詳細ページを外部別窓（aboutUrl）
//   ＋ 戻る（モーダルを閉じる）
// ボタンUIはメニュー/戻ると同じ（.menu-btn / menuBaseStyles を流用）。
// 外部リンクは target=_blank：WEB=新規タブ、Android=Flutter(url_launcher)が外部ブラウザで開く（離脱防止）。
@customElement('news-info-modal-panel')
export class NewsInfoModalPanel extends LitElement {
  @property({ type: String }) title = ''
  @property({ type: String }) checkLatestLabel = ''
  @property({ type: String }) aboutLabel = ''
  @property({ type: String }) backLabel = ''
  @property({ type: String }) storeUrl = ''
  @property({ type: String }) aboutUrl = ''

  private close(): void {
    this.dispatchEvent(new CustomEvent('news-info-close', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      <button class="top-close-btn classic-btn" @click=${this.close} aria-label="Close">✕</button>
      <h3>${this.title}</h3>
      <div class="news-actions">
        ${this.storeUrl
          ? html`<a class="menu-btn" href=${this.storeUrl} target="_blank" rel="noopener noreferrer"
              ><span class="menu-btn-text">${this.checkLatestLabel}</span></a
            >`
          : null}
        ${this.aboutUrl
          ? html`<a class="menu-btn" href=${this.aboutUrl} target="_blank" rel="noopener noreferrer"
              ><span class="menu-btn-text">${this.aboutLabel}</span></a
            >`
          : null}
        <button class="menu-btn" @click=${this.close}><span class="menu-btn-text">${this.backLabel}</span></button>
      </div>
    `
  }

  static styles = [
    classicButtonStyles,
    menuBaseStyles,
    css`
      :host {
        display: block;
      }
      h3 {
        margin: 0 0 16px;
        text-align: center;
        color: #f4e2b8;
        font-size: clamp(20px, 5vw, 26px);
      }
      .news-actions {
        display: grid;
        gap: 24px; /* メニューと同じ縦間隔 */
        width: min(496px, 100%);
        margin: 0 auto;
      }
      .top-close-btn {
        position: absolute;
        right: 0;
        top: 0;
        min-width: 44px;
        min-height: 44px;
        border-radius: 999px;
      }
    `,
  ]
}
