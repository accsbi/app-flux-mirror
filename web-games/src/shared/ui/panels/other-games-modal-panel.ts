import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classicButtonStyles } from '../classic-button.styles'

// 「別のカードゲーム」モーダル（Android の離脱防止＝外部遷移せずアプリ内で一覧）。
// データは card-games-list.json（games-list.csv 由来・バンドル）。app 側で現在ゲームを除外し
// feat 画像URL/ストアURLを解決して `.games` に渡す。ストアリンクは新規タブ／Android は
// Flutter(url_launcher) が外部で開く（WebView は遷移しない＝戻れる）。
export type OtherGameItem = { title: string; featImageUrl: string; storeUrl: string; comingSoon: boolean }

@customElement('other-games-modal-panel')
export class OtherGamesModalPanel extends LitElement {
  @property({ type: String }) title = ''
  @property({ type: Array }) games: OtherGameItem[] = []
  @property({ type: String }) playLabel = 'Google Play'
  @property({ type: String }) comingSoonLabel = 'Coming Soon'
  @property({ type: String }) okLabel = ''

  private close(): void {
    this.dispatchEvent(new CustomEvent('other-games-close', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      <button class="top-close-btn classic-btn" @click=${this.close} aria-label="Close">✕</button>
      <h3>${this.title}</h3>
      <div class="games-list">
        ${this.games.map((g) => html`
          <div class="game-item">
            <img class="game-feat" src=${g.featImageUrl} alt=${g.title} loading="lazy" />
            <p class="game-title">${g.title}</p>
            ${g.storeUrl
              ? html`<a class="game-store classic-btn" href=${g.storeUrl} target="_blank" rel="noopener noreferrer">${this.playLabel}</a>`
              : g.comingSoon
                ? html`<span class="game-coming">${this.comingSoonLabel}</span>`
                : null}
          </div>
        `)}
      </div>
      <button class="ok-btn classic-btn" @click=${this.close}>${this.okLabel}</button>
    `
  }

  static styles = [css`
    :host {
      display: grid;
      gap: 8px;
      font-size: var(--panel-font-size, 24px);
      line-height: 1.4;
      color: #f2f6f7;
      position: relative;
    }
    h3 { margin: 0; font-size: var(--panel-title-size, 32px); padding-right: 44px; }

    /* 右上 ✕（guide-overview-panel と同体裁） */
    .top-close-btn {
      position: absolute; right: 0; top: 0;
      min-width: 44px; min-height: 44px; border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(0, 0, 0, 0.35); color: #f2f6f7;
      font-size: 16px; font-weight: 700; cursor: pointer; z-index: 2;
    }

    /* 一覧：縦スクロール（modal-card の高さに収める） */
    .games-list {
      display: grid; gap: 12px; text-align: left;
      overflow-y: auto; max-height: 60vh; padding-right: 4px;
    }
    .game-item {
      display: grid;
      grid-template-columns: 96px 1fr auto;
      align-items: center; column-gap: 12px;
      padding: 8px; border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .game-feat {
      width: 96px; height: 47px; /* 1024x500 の縮小（比率維持） */
      object-fit: cover; border-radius: 6px; display: block;
    }
    .game-title { margin: 0; font-size: 0.8em; line-height: 1.25; }
    .game-store {
      min-height: 40px; padding: 0 14px; white-space: nowrap;
      border-radius: 999px; border: 0; background: #6f4a2e; color: #1a1a1a;
      font-size: 0.7em; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; text-decoration: none;
    }
    /* comingsoon ゲーム：押せないバッジ（ストア未公開）。 */
    .game-coming {
      min-height: 40px; padding: 0 12px; white-space: nowrap;
      border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.28);
      color: rgba(238, 244, 245, 0.7); font-size: 0.66em; font-weight: 700;
      display: inline-flex; align-items: center;
    }

    .ok-btn {
      min-height: var(--panel-btn-height, 72px); margin-top: 12px;
      border-radius: 999px; border: 0; background: #6f4a2e; color: #1a1a1a;
      font-size: var(--panel-font-size, 24px); font-weight: 700;
      letter-spacing: 0.02em; cursor: pointer;
    }
  `, classicButtonStyles]
}
