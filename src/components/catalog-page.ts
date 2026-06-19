import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { loadGames, type GameEntry, type Lang } from '../data/games-catalog'
import { getTranslation } from '../i18n/translations'
import './site-header'
import './game-card'
import './breadcrumb'
import './page-hero'
import { utilities } from '../styles/utilities'

// TOP（ゲーム一覧ページ）。CSV + 説明JSON を実行時 fetch し、3列カードで表示。
// app-flux games-apps.astro の構成（PageHero + genre 見出し + CardGrid columns=3）を踏襲。
@customElement('ccg-catalog-page')
export class CcgCatalogPage extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  @state() private games: GameEntry[] = []
  @state() private loading = true
  @state() private error = ''

  static styles = [utilities, css`
    :host {
      display: block;
      background: var(--canvas);
    }
    /* ── ヒーロー領域（画像バナー）。固定アスペクト比なので言語でズレない。 ── */
    .hero-top {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 16px 24px 0;
    }
    ccg-page-hero {
      display: block;
      margin-top: 12px;
    }
    /* ── 白い content セクション ── */
    .content {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 8px 24px 64px;
    }
    .category-section {
      margin-top: 40px;
    }
    /* 中央寄せの装飾見出し（小見出し＋タイトル＋金の区切り） */
    .section-heading {
      text-align: center;
      margin-bottom: 28px;
    }
    .section-heading__small {
      margin: 0 0 4px;
      color: var(--gold-deep);
      font-family: var(--font-display);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .category-heading {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.6rem, 4vw, 2.3rem);
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0.01em;
      color: var(--green);
    }
    .ornament {
      display: grid;
      grid-template-columns: minmax(20px, 120px) auto minmax(20px, 120px);
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: min(420px, 90%);
      margin: 14px auto 0;
    }
    .ornament span {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold-line));
    }
    .ornament span:last-child {
      background: linear-gradient(90deg, var(--gold-line), transparent);
    }
    .ornament i {
      color: var(--gold-deep);
      font-style: normal;
      font-size: 0.8rem;
    }
    /* 3列カード（増えるのを想定）。狭い画面では段階的に減らす。 */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 560px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    .status {
      margin-top: 40px;
      text-align: center;
      color: var(--text-soft);
    }
    /* ── 濃紺フェルトのフッター帯（金線で締める） ── */
    .footer {
      border-top: 1px solid var(--gold-deep);
      background: linear-gradient(180deg, #0d2138 0%, #06101d 100%);
      color: var(--on-dark);
      text-align: center;
    }
    .footer-inner {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 40px 24px;
    }
    .footer-ornament {
      display: grid;
      grid-template-columns: minmax(30px, 180px) auto minmax(30px, 180px);
      align-items: center;
      justify-content: center;
      gap: 14px;
      width: min(500px, 90%);
      margin: 0 auto 16px;
    }
    .footer-ornament span {
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold-line));
    }
    .footer-ornament span:last-child {
      background: linear-gradient(90deg, var(--gold-line), transparent);
    }
    .footer-ornament i {
      color: var(--gold-bright);
      font-style: normal;
      font-size: 0.85rem;
      letter-spacing: 0.35em;
    }
    .footer-brand {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--gold-bright);
    }
    .footer-note {
      margin: 8px auto 0;
      font-size: 0.85rem;
      color: var(--on-dark-soft);
      max-width: 60ch;
      line-height: 1.7;
    }
  `]

  connectedCallback(): void {
    super.connectedCallback()
    try {
      this.games = loadGames(this.lang)
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e)
    } finally {
      this.loading = false
    }
  }

  render() {
    const t = getTranslation(this.lang)
    return html`
      <ccg-site-header .lang=${this.lang} current=""></ccg-site-header>

      <div class="hero-top">
        <ccg-breadcrumb .items=${[{ label: t.nav.home }]}></ccg-breadcrumb>
      </div>
      <ccg-page-hero
        image="/site-assets/images/home.webp"
        heading=${t.hero.title}
        hideOverlay
      ></ccg-page-hero>

      <main class="content">
        ${this.loading
          ? html`<p class="status">…</p>`
          : this.error
            ? html`<p class="status">⚠ ${this.error}</p>`
            : html`
                <section class="category-section">
                  <div class="section-heading">
                    <p class="section-heading__small">Card Table</p>
                    <h2 class="category-heading">${t.catalog.genreHeading}</h2>
                    <div class="ornament"><span></span><i>♠ ♥ ♦ ♣</i><span></span></div>
                  </div>
                  <div class="grid">
                    ${this.games.map(
                      (g) =>
                        html`<ccg-game-card .game=${g} .lang=${this.lang}></ccg-game-card>`,
                    )}
                  </div>
                </section>
              `}
      </main>

      <footer class="footer">
        <div class="footer-inner">
          <div class="footer-ornament"><span></span><i>♠ ♥ ♦ ♣</i><span></span></div>
          <div class="footer-brand">${t.hero.title}</div>
          <p class="footer-note">${t.hero.body}</p>
        </div>
      </footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-catalog-page': CcgCatalogPage
  }
}
