import { LitElement, css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Lang } from '../data/games-catalog'
import { getTranslation } from '../i18n/translations'
import { legalContent, type LegalLang, type LegalBlock } from '../data/legal-content'
import './site-header'
import './breadcrumb'
import './page-hero'
import { utilities } from '../styles/utilities'

// About / Contact / Blog ＋ 規約・プライバシー（SITE側ページ・サイト共通デザイン）。
// 規約/プライバシー/お問い合わせの本文は src/data/legal-content.ts（app-flux 由来）。
// ※ アプリ内（Remove Ads ダイアログ）の規約は terms-of-use.json をライブ取得して in-app
//   モーダルで表示する別系統。ここ（SITEページ）とは独立で、その挙動は変更しない。
export type StaticPageKey = 'about' | 'contact' | 'blog' | 'privacy-policy' | 'item_terms_of_use'

const FORM_ACTION = 'https://formspree.io/f/mkoajwva' // 送信先＝app-flux と同じ

@customElement('ccg-static-page')
export class CcgStaticPage extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  @property({ type: String }) page: StaticPageKey = 'about'

  static styles = [utilities, css`
    :host { display: block; background: var(--canvas); min-height: 100vh; }
    .top { max-width: var(--max-width); margin: 0 auto; padding: 16px 24px 0; }
    ccg-page-hero { display: block; margin-top: 12px; }
    .page-title {
      max-width: var(--max-width); margin: 8px auto 0; padding: 12px 24px 0;
      font-family: var(--font-display); color: var(--green);
      font-size: clamp(1.6rem, 4.5vw, 2.4rem); letter-spacing: 0.02em; text-align: center;
    }
    .body { max-width: var(--max-width); margin: 0 auto; padding: 32px 24px 80px; }
    .body.placeholder { text-align: center; color: var(--text-soft); font-size: 1rem; padding-top: 48px; }

    /* 規約・プライバシー本文（明色面：濃インク本文・濃紺見出し・金線区切り・深紅リンク） */
    .content { max-width: 880px; margin: 0 auto; color: var(--text); line-height: 1.85; }
    .content .intro { font-size: 1.05rem; margin: 0 0 1.6rem; }
    .content h2 {
      font-family: var(--font-display); color: var(--green);
      font-size: 1.4rem; margin: 0 0 1rem; padding-bottom: .5rem;
      border-bottom: 2px solid var(--gold-line);
    }
    .content h3 { color: var(--green); font-size: 1.1rem; margin: 1.1rem 0 .5rem; }
    .content p { margin: 0 0 .9rem; }
    .content ul { margin: 0 0 1.1rem; padding-left: 1.4rem; }
    .content li { margin-bottom: .4rem; }
    .content li::marker { color: var(--gold-deep); }
    .content a { color: var(--green-accent); text-decoration: underline; text-underline-offset: 3px; }
    .section { margin: 0 0 1.6rem; }
    .divider { border: none; border-top: 1px solid var(--gold-line); opacity: .5; margin: 2rem 0; }
    .subsection { margin: 1rem 0; padding-left: 1rem; border-left: 2px solid var(--gold-line); }

    /* お問い合わせフォーム（サイトの明色＋金線＋深紅CTA） */
    .contact-form { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.3rem; }
    .form-group { display: flex; flex-direction: column; gap: .5rem; }
    .form-group label { color: var(--green); font-weight: 600; }
    .form-group input, .form-group textarea, .form-group select {
      padding: .7rem .8rem; color: var(--text); background: #fffdf6;
      border: 1px solid var(--gold-line); border-radius: 8px;
      font-family: var(--font-sans); font-size: 1rem;
    }
    .form-group select { cursor: pointer; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      outline: none; border-color: var(--gold-deep); box-shadow: 0 0 0 2px rgba(201, 162, 74, .25);
    }
    .submit-button {
      margin-top: .3rem; padding: .85rem 1.6rem; cursor: pointer;
      font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; letter-spacing: .02em;
      color: var(--on-dark); background: var(--green-accent);
      border: 1px solid var(--gold-deep); border-radius: 999px;
    }
    .submit-button:hover { filter: brightness(1.08); }

    .footer { border-top: 1px solid var(--gold-deep); background: linear-gradient(180deg, #0d2138 0%, #06101d 100%); color: var(--on-dark); text-align: center; }
    .footer-inner { max-width: var(--max-width); margin: 0 auto; padding: 40px 24px; font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; letter-spacing: 0.04em; color: var(--gold-bright); }
  `]

  private get legal(): LegalLang { return legalContent[this.lang as 'en' | 'ja' | 'zh'] ?? legalContent.en }

  private pageTitle(): string {
    const t = getTranslation(this.lang)
    if (this.page === 'privacy-policy') return this.legal.privacy.title
    if (this.page === 'item_terms_of_use') return this.legal.terms.title
    return t.nav[this.page as 'about' | 'contact' | 'blog']
  }

  private renderBlock(b: LegalBlock): TemplateResult | typeof nothing {
    if (b.p) return html`<p>${b.p}</p>`
    if (b.ul) return html`<ul>${b.ul.map((i) => html`<li>${i}</li>`)}</ul>`
    if (b.h3) return html`<h3>${b.h3}</h3>`
    if (b.link) return html`<p><a href=${b.link.href}>${b.link.label}</a></p>`
    return nothing
  }

  private renderPrivacy(): TemplateResult {
    const c = this.legal.privacy
    return html`<div class="content">
      <p class="intro">${c.intro}</p>
      ${c.sections.map((s) => html`
        <hr class="divider" />
        <section class="section"><h2>${s.title}</h2>${s.blocks.map((b) => this.renderBlock(b))}</section>
      `)}
    </div>`
  }

  private renderTerms(): TemplateResult {
    const c = this.legal.terms
    return html`<div class="content">
      <p class="intro">${c.intro}</p>
      ${c.articles.map((a) => html`
        <hr class="divider" />
        <section class="section"><h2>${a.title}</h2><p>${a.body}</p></section>
      `)}
    </div>`
  }

  private onContactSubmit(e: Event): void {
    if (!window.confirm(this.legal.contact.confirm)) e.preventDefault()
  }

  private renderContact(): TemplateResult {
    const c = this.legal.contact
    return html`
      <form class="contact-form" action=${FORM_ACTION} method="POST" @submit=${this.onContactSubmit}>
        <div class="form-group">
          <label for="subject">${c.subjectLabel}</label>
          <select id="subject" name="subject" required>
            <option value="">${c.subjectPlaceholder}</option>
            ${c.subjects.map((s) => html`<option value=${s}>${s}</option>`)}
          </select>
        </div>
        <div class="form-group">
          <label for="name">${c.nameLabel}</label>
          <input type="text" id="name" name="name" required />
        </div>
        <div class="form-group">
          <label for="email">${c.emailLabel}</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div class="form-group">
          <label for="message">${c.messageLabel}</label>
          <textarea id="message" name="message" rows="6" required></textarea>
        </div>
        <button type="submit" class="submit-button">${c.submitButton}</button>
      </form>
    `
  }

  private renderBody(): TemplateResult {
    if (this.page === 'contact') return this.renderContact()
    if (this.page === 'privacy-policy') return this.renderPrivacy()
    if (this.page === 'item_terms_of_use') return this.renderTerms()
    return html`${getTranslation(this.lang).pages.preparing}`
  }

  render() {
    const t = getTranslation(this.lang)
    const title = this.pageTitle()
    const hasHeroImage = this.page === 'about' || this.page === 'contact' || this.page === 'blog'
    const isPlaceholder = this.page === 'about' || this.page === 'blog'
    return html`
      <ccg-site-header .lang=${this.lang} current=${this.page} langPath=${`${this.page}/`}></ccg-site-header>
      <div class="top">
        <ccg-breadcrumb .items=${[{ label: t.nav.home, href: `/${this.lang}/` }, { label: title }]}></ccg-breadcrumb>
      </div>
      ${hasHeroImage
        ? html`<ccg-page-hero image=${`/site-assets/images/${this.page}.webp`} heading=${title} hideOverlay></ccg-page-hero>`
        : html`<h1 class="page-title">${title}</h1>`}
      <div class="body ${isPlaceholder ? 'placeholder' : ''}">${this.renderBody()}</div>
      <footer class="footer"><div class="footer-inner">♣ Classic Card Games Collection</div></footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-static-page': CcgStaticPage
  }
}
