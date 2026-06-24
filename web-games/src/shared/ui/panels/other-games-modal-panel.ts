import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classicButtonStyles } from '../classic-button.styles'

// 「別のカードゲーム」モーダル（Android の離脱防止＝外部遷移せずアプリ内で一覧）。
// データは card-games-list.json（games-list.csv 由来・バンドル）。app 側で現在ゲームを除外し
// feat 画像URL/ストアURLを解決して `.games` に渡す。ストアリンクは新規タブ／Android は
// Flutter(url_launcher) が外部で開く（WebView は遷移しない＝戻れる）。
// description = 各ゲームの [ 概略 ] {google_description}（現在言語・見出しなし）。card-games-list.json 由来。
export type OtherGameItem = { title: string; description: string; featImageUrl: string; storeUrl: string; comingSoon: boolean }

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
          <div class="game-card">
            <img class="game-feat" src=${g.featImageUrl} alt=${g.title} loading="lazy" />
            <p class="game-title">${g.title}</p>
            ${g.description ? html`<p class="game-desc">${g.description}</p>` : null}
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
      display: grid; gap: 16px;
      overflow-y: auto; max-height: 62vh; padding-right: 4px;
    }
    /* 1ゲーム=1縦カード（画像大→タイトル→概略→GOOGLE PLAY を縦積み）。 */
    .game-card {
      display: grid; gap: 8px; justify-items: center; text-align: center;
      padding: 14px 12px; border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
    .game-feat {
      width: 100%; max-width: 340px; aspect-ratio: 1024 / 500; /* feat 比率維持・大きく */
      object-fit: cover; border-radius: 10px; display: block;
    }
    .game-title { margin: 0; font-size: 0.84em; font-weight: 700; line-height: 1.25; }
    /* 概略本文（見出しなし・言語追従）。改行は保持。 */
    .game-desc {
      margin: 0; font-size: 0.6em; line-height: 1.45;
      color: rgba(238, 244, 245, 0.88); white-space: pre-line; max-width: 38ch;
    }
    .game-store {
      min-height: 44px; padding: 0 24px; margin-top: 2px; white-space: nowrap;
      border-radius: 999px; border: 0; background: #6f4a2e; color: #1a1a1a;
      font-size: 0.72em; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; text-decoration: none;
    }
    /* comingsoon ゲーム：押せないバッジ（ストア未公開）。 */
    .game-coming {
      min-height: 44px; padding: 0 16px; white-space: nowrap;
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
