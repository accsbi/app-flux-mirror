import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Lang } from '../data/games-catalog'
import { getTranslation } from '../i18n/translations'
import './site-header'
import './breadcrumb'
import './page-hero'

export type StaticPageKey = 'about' | 'contact' | 'blog'

// About / Contact / Blog の静的ページ。フェーズ1は中身未実装のため、
// HERO 画像 + タイトル + 「準備中」のプレースホルダのみ（後で本文を足す）。
@customElement('ccg-static-page')
export class CcgStaticPage extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  @property({ type: String }) page: StaticPageKey = 'about'

  static styles = css`
    :host {
      display: block;
      background: var(--canvas);
      min-height: 100vh;
    }
    .top {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 16px 24px 0;
    }
    ccg-page-hero {
      display: block;
      margin-top: 12px;
    }
    .body {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 48px 24px 80px;
      text-align: center;
      color: var(--text-soft);
      font-size: 1rem;
    }
    /* フッターは catalog-page と統一（金線＋濃紺グラデ＋金の Cinzel ブランド） */
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
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--gold-bright);
    }
  `

  render() {
    const t = getTranslation(this.lang)
    const title = t.nav[this.page]
    return html`
      <ccg-site-header .lang=${this.lang} current=${this.page} langPath=${`${this.page}/`}></ccg-site-header>
      <div class="top">
        <ccg-breadcrumb
          .items=${[{ label: t.nav.home, href: `/${this.lang}/` }, { label: title }]}
        ></ccg-breadcrumb>
      </div>
      <ccg-page-hero
        image=${`/site-assets/images/${this.page}.webp`}
        heading=${title}
        hideOverlay
      ></ccg-page-hero>
      <div class="body">${t.pages.preparing}</div>
      <footer class="footer">
        <div class="footer-inner">♣ Classic Card Games Collection</div>
      </footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-static-page': CcgStaticPage
  }
}
