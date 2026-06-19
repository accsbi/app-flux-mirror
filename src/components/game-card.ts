import { LitElement, css, html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { GameEntry, Lang } from '../data/games-catalog'
import { getTranslation } from '../i18n/translations'

// 1ゲームのカード。app-flux games-apps.astro のカード構造/CSS を移植。
// 注目画像 → Mobile/Web バッジ → タイトル → 3行説明 → Details(準備中) →
// ストア行(Google Play 2/3 + YouTube 1/3) → 🎮 Browser Game。
@customElement('ccg-game-card')
export class CcgGameCard extends LitElement {
  @property({ attribute: false }) game!: GameEntry
  @property({ type: String }) lang: Lang = 'en'

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px;
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-card);
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-dark) 100%);
      /* クラシックの金ヘアライン額縁（cream 紙の上に入れ子の二重金線）＋温かい影。
         外縁=金 / 内側に紙の余白 / さらに細い金線、で「額縁」を表現。 */
      box-shadow: var(--shadow-card),
        inset 0 0 0 3px var(--surface),
        inset 0 0 0 4px rgba(156, 122, 46, 0.55);
    }
    .card-image-link {
      display: block;
    }
    .card-image {
      display: block;
      width: 100%;
      border: 1px solid var(--gold-deep);
      border-radius: 8px;
      aspect-ratio: 1024 / 500;
      object-fit: cover;
      background: var(--green-house);
      transition: opacity 0.3s ease-in;
    }
    .badges {
      display: flex;
      gap: 6px;
    }
    .badge {
      display: inline-block;
      padding: 3px 11px;
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-pill);
      font-family: var(--font-display);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    /* バッジは金で統一（Mobile=金の塗り / Web=金のアウトライン）＝クラシックの額縁色に合わせる */
    .badge-mobile {
      background: linear-gradient(180deg, var(--gold-bright), var(--gold));
      color: #2e1a0d;
    }
    .badge-web {
      background: transparent;
      color: var(--gold-deep);
    }
    .card-title-link {
      text-decoration: none;
    }
    .title {
      font-family: var(--font-display);
      font-size: 1.2rem;
      line-height: 1.3;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--green);
      transition: color 0.15s ease;
      /* タイトルも2行ぶんの箱に固定し、言語/語長で下の要素がズレないようにする。 */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(1.15rem * 1.3 * 2);
    }
    .card-title-link:hover .title {
      color: var(--green-accent);
    }
    .desc {
      font-size: 0.9rem;
      line-height: 1.5;
      color: var(--text-soft);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: calc(0.9rem * 1.5 * 3);
    }
    /* Details: 金アウトラインのフルピル */
    .details {
      display: block;
      text-align: center;
      padding: 7px 16px;
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-pill);
      font-family: var(--font-display);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--gold-deep);
      background: transparent;
      text-decoration: none;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .details:hover {
      color: #2e1a0d;
      background: linear-gradient(180deg, var(--gold-bright), var(--gold));
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .store-links {
      display: flex;
      align-items: stretch;
      gap: 8px;
      width: 100%;
    }
    .store-icon-link {
      display: flex;
      align-items: center;
      height: 44px;
    }
    .store-link-google {
      flex: 2 1 0;
      justify-content: flex-start;
    }
    .store-link-youtube {
      flex: 1 1 0;
      justify-content: center;
    }
    .store-icon {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .store-icon-google {
      object-position: left center;
    }
    .coming-soon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 2 1 0;
      height: 44px;
      padding: 0 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      background: var(--neutral-cool);
      color: var(--text-soft);
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .web-play-section {
      margin-top: 2px;
      padding-top: 12px;
      border-top: 1px solid var(--hairline);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .web-play-caption {
      font-size: 0.78rem;
      line-height: 1.4;
      color: var(--text-soft);
    }
    /* 主 CTA: 金の多重額縁＋濃紺フェルトのクラシック押し込みボタン。
       幅はカードいっぱい。文字は金のグラデーション（background-clip: text）。 */
    .web-link-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 58px;
      padding: 12px 22px;
      box-sizing: border-box;
      border: 2px solid var(--gold-deep);
      border-radius: var(--radius-pill);
      text-decoration: none;
      background: radial-gradient(
          ellipse at 50% 20%,
          rgba(255, 255, 255, 0.07),
          transparent 48%
        ),
        repeating-linear-gradient(
          115deg,
          rgba(255, 255, 255, 0.02) 0,
          rgba(255, 255, 255, 0.02) 1px,
          transparent 1px,
          transparent 5px
        ),
        linear-gradient(180deg, #1b3358 0%, #0a1c33 35%, #06101d 100%);
      /* 金 → 濃紺 → 金 の入れ子フレーム＋上下の艶 */
      box-shadow: 0 3px 0 #05101c, 0 7px 12px rgba(0, 0, 0, 0.42),
        inset 0 0 0 2px var(--gold), inset 0 0 0 4px #142336,
        inset 0 0 0 6px var(--gold-deep),
        inset 0 8px 10px rgba(255, 255, 255, 0.05),
        inset 0 -10px 16px rgba(0, 0, 0, 0.4);
      transition: transform 150ms ease, filter 150ms ease;
    }
    .web-link-btn__icon {
      position: relative;
      z-index: 2;
      font-size: 1.1rem;
      line-height: 1;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
    }
    .web-link-btn__text {
      position: relative;
      z-index: 2;
      font-family: var(--font-display);
      font-size: clamp(15px, 3.6vw, 19px);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: 0.04em;
      white-space: nowrap;
      color: transparent;
      background: linear-gradient(
        180deg,
        #fff0ad 0%,
        #e2b95d 30%,
        #a96820 63%,
        #f0ce75 100%
      );
      background-clip: text;
      -webkit-background-clip: text;
      filter: drop-shadow(0 2px 0 #3f2108);
    }
    .web-link-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-2px);
    }
    .web-link-btn:active {
      filter: brightness(0.92);
      transform: translateY(2px);
    }
    .web-link-btn:focus-visible {
      outline: 3px solid var(--gold-bright);
      outline-offset: 4px;
    }
  `

  render() {
    const g = this.game
    const t = getTranslation(this.lang)
    const googlePlaySvg = '/site-assets/images/google-play.svg'
    const youtubeSvg = '/site-assets/images/youtube.svg'
    const detailHref = `/${this.lang}/games-apps/${g.fileName}/`

    return html`
      <a class="card-image-link" href=${detailHref} aria-label=${g.title}>
        <img class="card-image" src=${g.featImage} alt=${g.title} loading="lazy" />
      </a>

      <div class="badges">
        <span class="badge badge-mobile">${t.catalog.badgeMobile}</span>
        <span class="badge badge-web">${t.catalog.badgeWeb}</span>
      </div>

      <a class="card-title-link" href=${detailHref}><h2 class="title">${g.title}</h2></a>

      ${g.cardText || g.description
        ? html`<p class="desc">${g.cardText || g.description}</p>`
        : nothing}

      <a class="details" href=${detailHref}>${t.catalog.details} →</a>

      <div class="actions">
        <div class="store-links">
          ${g.storeState === 'button' && g.googlePlayUrl
            ? html`<a
                class="store-icon-link store-link-google"
                href=${g.googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google Play"
              >
                <img
                  class="store-icon store-icon-google"
                  src=${googlePlaySvg}
                  alt="Google Play"
                  loading="lazy"
                />
              </a>`
            : g.storeState === 'comingsoon'
              ? html`<span class="coming-soon">${t.catalog.comingSoon}</span>`
              : nothing}
          ${g.youtubePublished && g.youtubeUrl
            ? html`<a
                class="store-icon-link store-link-youtube"
                href=${g.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <img class="store-icon" src=${youtubeSvg} alt="YouTube" loading="lazy" />
              </a>`
            : nothing}
        </div>

        ${g.webPublished
          ? html`<div class="web-play-section">
              <span class="web-play-caption">🎮 ${t.catalog.playInBrowser}</span>
              <a class="web-link-btn" href=${g.webGameHref}>
                <span class="web-link-btn__icon">🎮</span>
                <span class="web-link-btn__text">${t.catalog.browserGame}</span>
              </a>
            </div>`
          : nothing}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-game-card': CcgGameCard
  }
}
