import { LitElement, css, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// 全ページ共通のヒーローバナー（1024×500 画像の上にタイトルを重ねる）。
// app-flux PageHero.astro を踏襲。画像パスは prop で渡す（ハードコードしない）。
// 画像は固定アスペクト比なので、言語でテキスト行数が変わってもレイアウトが動かない。
@customElement('ccg-page-hero')
export class CcgPageHero extends LitElement {
  @property({ type: String }) image = ''
  @property({ type: String }) heading = ''
  @property({ type: String }) eyebrow = ''
  @property({ type: String }) description = ''
  /** 画像内に文字が焼き込まれている場合などに、HTML のテキストオーバーレイを消す。
      heading は画像の alt（アクセシビリティ/SEO）として引き続き使う。 */
  @property({ type: Boolean }) hideOverlay = false

  static styles = css`
    :host {
      display: block;
    }
    .page-hero {
      position: relative;
      width: 80%;
      max-width: 1024px;
      margin-inline: auto;
      border-radius: var(--radius-frame);
      overflow: hidden;
      border: 1px solid var(--gold-deep);
      background: var(--green-house);
      /* 金線の額縁を入れ子の inset 影で表現 */
      box-shadow: var(--shadow-soft), inset 0 0 0 4px #15233a,
        inset 0 0 0 6px var(--gold-deep), inset 0 0 0 9px #15233a;
    }
    /* 内側の細い金枠 */
    .page-hero::before {
      content: '';
      position: absolute;
      inset: 14px;
      z-index: 2;
      border: 1px solid rgba(220, 190, 120, 0.5);
      border-radius: 12px;
      pointer-events: none;
    }
    @media (max-width: 640px) {
      .page-hero {
        width: 100%;
      }
    }
    .img {
      display: block;
      width: 100%;
      aspect-ratio: 1024 / 500;
      object-fit: cover;
    }
    /* 文字の可読性のためのスクリム（下を濃く） */
    .overlay {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 8px;
      padding: clamp(20px, 4vw, 48px);
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.72) 0%,
        rgba(0, 0, 0, 0.32) 45%,
        rgba(0, 0, 0, 0) 80%
      );
    }
    .eyebrow {
      margin: 0;
      color: var(--gold-bright);
      font-family: var(--font-display);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .title {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.9rem, 4.6vw, 3.6rem);
      font-weight: 600;
      line-height: 1.05;
      letter-spacing: 0.01em;
      color: var(--gold-bright);
      text-shadow: 0 2px 0 #2a1604, 0 8px 18px rgba(0, 0, 0, 0.55);
    }
    .desc {
      margin: 0;
      max-width: 52rem;
      color: rgba(255, 255, 255, 0.86);
      font-size: clamp(0.9rem, 1.6vw, 1.1rem);
    }
  `

  render() {
    return html`
      <section class="page-hero">
        <img class="img" src=${this.image} alt=${this.heading} loading="eager" />
        ${this.hideOverlay
          ? nothing
          : html`<div class="overlay">
              ${this.eyebrow ? html`<p class="eyebrow">${this.eyebrow}</p>` : nothing}
              <h1 class="title">${this.heading}</h1>
              ${this.description ? html`<p class="desc">${this.description}</p>` : nothing}
            </div>`}
      </section>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-page-hero': CcgPageHero
  }
}
