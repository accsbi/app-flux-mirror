import { LitElement, css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Lang } from '../data/games-catalog'
import { getTranslation } from '../i18n/translations'
import { legalContent, type LegalLang, type LegalBlock } from '../data/legal-content'
import { loadPosts, formatPostDate } from '../data/blog'
import { mdToPlain } from '../lib/markdown'
import './site-header'
import './breadcrumb'
import './page-hero'
import { utilities } from '../styles/utilities'
import { classicButton } from '../styles/classic-button'

// About / Contact / Blog ＋ 規約・プライバシー（SITE側ページ・サイト共通デザイン）。
// 規約/プライバシー/お問い合わせの本文は src/data/legal-content.ts（app-flux 由来）。
// ※ アプリ内（Remove Ads ダイアログ）の規約は terms-of-use.json をライブ取得して in-app
//   モーダルで表示する別系統。ここ（SITEページ）とは独立で、その挙動は変更しない。
export type StaticPageKey = 'about' | 'contact' | 'blog' | 'privacy-policy' | 'item_terms_of_use'

const FORM_ACTION = 'https://formspree.io/f/mkoajwva' // 送信先＝app-flux と同じ
// 同一デベロッパーの Google Play 開発者ページ（app-flux と同じ）。
const GOOGLE_PLAY_DEV_URL = 'https://play.google.com/store/apps/developer?id=App+Flux'
// 事業1=モバイルアプリ開発のメイン画像（app-flux から移設・public/site-assets/images/about/）。
const APP_DEV_IMAGE = '/site-assets/images/about/app-flux_main.webp'
// 事業2=ECサイト運営の販売チャネル（app-flux about と同一。言語非依存）。
const EC_SITES: { name: string; url: string; logo: string; alt: string }[] = [
  {
    name: 'accessories.bi(YAHOO! Shopping)',
    url: 'https://store.shopping.yahoo.co.jp/brando-inc',
    logo: '/site-assets/images/about/yahoo_sp_logo.webp',
    alt: 'accessories YAHOO! Shopping Store',
  },
  {
    name: 'accessories.bi(YAHOO! Store Auction)',
    url: 'https://auctions.yahoo.co.jp/seller/DYssYS8FiFht3sCHBHWT8uFr3QNh9?user_type=c',
    logo: '/site-assets/images/about/yahoo_ac_logo.webp',
    alt: 'accessories YAHOO! Store Auction',
  },
  {
    name: 'accessories.bi(Amazon)',
    url: 'https://www.amazon.co.jp/s?me=AYY3JMBV5HRWW&marketplaceID=A1VC38T7YXB528',
    logo: '/site-assets/images/about/amazon_logo.webp',
    alt: 'accessories Amazon Store',
  },
  {
    name: 'accessories.bi(Qoo10)',
    url: 'https://www.qoo10.jp/shop/accessories_bi',
    logo: '/site-assets/images/about/qoo10_logo.webp',
    alt: 'accessories.bi Qoo10 Store',
  },
  {
    name: 'accessories.bi(Mercari Shop)',
    url: 'https://mercari-shops.com/shops/otyw9JeT7UQ7uV9XVDvhjg',
    logo: '/site-assets/images/about/mercari_sp_logo.webp',
    alt: 'accessories Mercari Shop',
  },
]

@customElement('ccg-static-page')
export class CcgStaticPage extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  @property({ type: String }) page: StaticPageKey = 'about'

  static styles = [utilities, classicButton, css`
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

    /* About 本文（規約と同系の明色面：濃インク本文・濃緑見出し・金線区切り・深紅CTA） */
    .about { max-width: 880px; margin: 0 auto; color: var(--text); line-height: 1.85; }
    .about-sec { margin: 0 0 40px; padding-bottom: 32px; border-bottom: 1px solid var(--gold-line); }
    .about-sec.last { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .about h2 {
      font-family: var(--font-display); color: var(--green);
      font-size: 1.4rem; margin: 0 0 16px; padding-bottom: .5rem; border-bottom: 2px solid var(--gold-line);
    }
    .about h3 { color: var(--green); font-size: 1.15rem; margin: 0 0 12px; }
    .about p { margin: 0 0 .9rem; }
    .about .note { margin-bottom: 24px; }
    /* お問い合わせ CTA＝クラシック共有ボタン(classicButton)を赤フェルトで。幅は固定上限。 */
    .about .about-cta { width: 100%; max-width: 360px; margin-top: 8px; }

    /* モバイルアプリ開発: 一覧の短い説明＋「Google Play 開発者ページ」テキスト＋枠付きバッジ(=ストアリンク)。 */
    .about .biz-desc { margin: 0 0 16px; color: var(--text); }
    .about .gp-heading { font-family: var(--font-display); color: var(--green); font-size: 1.05rem; font-weight: 700; margin: 0 0 10px; }
    /* バッジを金枠＋紙地で囲み、ホバー/フォーカスで「押せるリンク」と分かるように。 */
    .about .gp-link {
      display: inline-flex; align-items: center; padding: 10px 16px;
      border: 1px solid var(--gold-deep); border-radius: 12px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-dark) 100%);
      box-shadow: var(--shadow-card), inset 0 0 0 2px rgba(156, 122, 46, 0.35);
      transition: transform 0.15s ease, filter 0.15s ease;
    }
    .about .gp-link:hover { transform: translateY(-2px); filter: brightness(1.04); }
    .about .gp-link:focus-visible { outline: 3px solid var(--gold-bright); outline-offset: 3px; }
    .about .gp-badge { height: 44px; width: auto; display: block; }
    /* 長い文言(例: 英語の Google Play …)は折り返して見切れ防止（共有の nowrap を上書き）。 */
    .about .about-cta .web-link-btn__text { white-space: normal; text-align: center; }
    .web-link-btn.felt-red { --cta-felt: linear-gradient(180deg, #a52424 0%, #590d0d 100%); }

    /* 事業ブロック（事業1=アプリ開発 / 事業2=EC運営）。金線で区切る。 */
    .about .biz-block { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--gold-line); }
    .about .biz-block.first { margin-top: 8px; padding-top: 0; border-top: none; }
    .about .biz-eyebrow {
      font-size: .8rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      color: var(--text-soft); margin: 0 0 6px;
    }
    .about .biz-media { margin: 0 0 16px; }
    .about .biz-image {
      width: 100%; max-width: 480px; height: auto; display: block;
      border-radius: 14px; border: 1px solid var(--gold-line);
    }
    .about .sub-heading {
      font-size: 1rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
      color: var(--green); margin: 8px 0 16px; padding-bottom: 6px; border-bottom: 1px solid var(--gold-line);
    }
    /* EC 販売チャネルのカード群（ロゴ＋店名、外部リンク） */
    .about .ec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .about .ec-card {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 16px; text-decoration: none; color: var(--text);
      background: #fffdf6; border: 1px solid var(--gold-line); border-radius: 14px;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .about .ec-card:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(0,0,0,.15); }
    .about .ec-logo-wrap { width: 100%; aspect-ratio: 1024 / 500; border-radius: 10px; overflow: hidden; }
    .about .ec-logo { width: 100%; height: 100%; object-fit: cover; display: block; }
    .about .ec-name { font-size: .85rem; text-align: center; color: var(--text-soft); line-height: 1.4; }
    @media (max-width: 720px) { .about .ec-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 460px) { .about .ec-grid { grid-template-columns: 1fr; } }

    /* Blog 一覧（記事カード＝game-card と同じクラシック額縁: 紙グラデ＋金二重線＋温かい影）。
       レイアウト＝サムネ左・テキスト右の横並び（画像 | テキスト）。 */
    .blog-list { max-width: 880px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .blog-card {
      display: grid; grid-template-columns: clamp(128px, 36%, 208px) 1fr; gap: 20px; align-items: center;
      text-decoration: none; color: var(--text);
      padding: 16px;
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-card);
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-dark) 100%);
      box-shadow: var(--shadow-card),
        inset 0 0 0 3px var(--surface),
        inset 0 0 0 4px rgba(156, 122, 46, 0.55);
      transition: transform 0.15s ease, filter 0.15s ease;
    }
    .blog-card.no-image { grid-template-columns: 1fr; }
    .blog-card:hover { transform: translateY(-2px); filter: brightness(1.02); }
    /* サムネ＝game-card の feat 画像と同じ扱い（金枠・1024:500・cover）。左に小さく置く。 */
    .blog-thumb {
      display: block; width: 100%; aspect-ratio: 1024 / 500; object-fit: cover; margin: 0;
      border: 1px solid var(--gold-deep); border-radius: 8px; background: var(--green-house);
    }
    .blog-card-body { min-width: 0; }
    .post-date { color: var(--text-soft); font-size: .8rem; letter-spacing: .04em; margin: 0 0 6px; }
    .blog-card-title {
      font-family: var(--font-display); color: var(--green); font-size: clamp(1.05rem, 2.6vw, 1.3rem);
      margin: 0 0 8px; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .blog-excerpt {
      margin: 0 0 10px; color: var(--text); line-height: 1.7; font-size: .92rem;
      display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .blog-readmore { color: var(--green-accent); font-weight: 700; font-size: .85rem; }
    @media (max-width: 420px) { .blog-card { grid-template-columns: 120px 1fr; gap: 16px; } }
    .about .info-list { display: grid; grid-template-columns: auto 1fr; gap: 12px 32px; margin: 0; max-width: 44rem; }
    .about .info-list dt { font-weight: 700; color: var(--green); }
    .about .info-list dd { margin: 0; color: var(--text); }
    @media (max-width: 560px) {
      .about .info-list { grid-template-columns: 1fr; gap: 4px 0; }
      .about .info-list dd { margin-bottom: 12px; }
    }

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

  // About 本文（app-flux https://app-flux.com/{lang}/about/ と同一内容。外枠デザインのみサイト準拠）。
  // 事業1=モバイルアプリ開発（画像＋Google Play）/ 事業2=ECサイト運営（説明＋販売チャネル）/ 会社情報 / お問い合わせ。
  private renderAbout(): TemplateResult {
    const a = getTranslation(this.lang).about
    return html`<div class="about">
      <section class="about-sec">
        <h2>${a.businessTitle}</h2>

        <div class="biz-block first">
          <p class="biz-eyebrow">${a.businessLabel[0]}</p>
          <h3>${a.appDevName}</h3>
          <div class="biz-media">
            <img class="biz-image" src=${APP_DEV_IMAGE} alt=${a.appDevName} loading="lazy" />
          </div>
          <p class="biz-desc">${a.appDevDesc}</p>
          <p class="gp-heading">${a.googlePlayLabel}</p>
          <!-- Google Play 公式バッジが開発者ページへのリンク。枠でリンクと分かるようにする。 -->
          <a class="gp-link" href=${GOOGLE_PLAY_DEV_URL} target="_blank" rel="noopener noreferrer" aria-label=${a.googlePlayLabel}>
            <img class="gp-badge" src="/site-assets/images/google-play.svg" alt="Google Play" loading="lazy" />
          </a>
        </div>

        <div class="biz-block">
          <p class="biz-eyebrow">${a.businessLabel[1]}</p>
          <h3>${a.ecName}</h3>
          <p class="note">${a.ecDescription}</p>
          <h4 class="sub-heading">${a.ecChannelsLabel}</h4>
          <div class="ec-grid">
            ${EC_SITES.map(
              (s) => html`<a class="ec-card" href=${s.url} target="_blank" rel="noopener noreferrer">
                <span class="ec-logo-wrap"><img class="ec-logo" src=${s.logo} alt=${s.alt} loading="lazy" /></span>
                <span class="ec-name">${s.name}</span>
              </a>`,
            )}
          </div>
        </div>
      </section>

      <section class="about-sec">
        <h2>${a.companyTitle}</h2>
        <dl class="info-list">
          ${a.company.map((r) => html`<dt>${r.label}</dt><dd>${r.value}</dd>`)}
        </dl>
      </section>

      <section class="about-sec last">
        <h2>${a.contactTitle}</h2>
        <p class="note">${a.contactNote}</p>
        <a class="web-link-btn felt-red about-cta" href=${`/${this.lang}/contact/`}>
          <span class="web-link-btn__text">${a.contactLink}</span>
        </a>
      </section>
    </div>`
  }

  // Blog 一覧（データ駆動。記事は catalog/blog/*.md が唯一ソース＝src/data/blog.ts）。
  // 個別記事は /{lang}/blog/{slug}/（HTML は scripts/node/build_blog_pages.mjs で生成）。
  private renderBlog(): TemplateResult {
    const t = getTranslation(this.lang)
    const posts = loadPosts(this.lang)
    return html`<div class="blog-list">
      ${posts.map(
        (p) => html`<a class="blog-card ${p.image ? '' : 'no-image'}" href=${`/${this.lang}/blog/${p.slug}/`}>
          ${p.image
            ? html`<img class="blog-thumb" src=${p.image} alt=${p.title} loading="lazy" />`
            : nothing}
          <div class="blog-card-body">
            <p class="post-date">${formatPostDate(this.lang, p.date)}</p>
            <h2 class="blog-card-title">${p.title}</h2>
            <p class="blog-excerpt">${this.excerpt(p.body)}</p>
            <span class="blog-readmore">${t.pages.readMore} →</span>
          </div>
        </a>`,
      )}
    </div>`
  }

  private excerpt(body: string): string {
    const plain = mdToPlain(body)
    return plain.length > 120 ? plain.slice(0, 120).trimEnd() + '…' : plain
  }

  private renderBody(): TemplateResult {
    if (this.page === 'about') return this.renderAbout()
    if (this.page === 'blog') return this.renderBlog()
    if (this.page === 'contact') return this.renderContact()
    if (this.page === 'privacy-policy') return this.renderPrivacy()
    if (this.page === 'item_terms_of_use') return this.renderTerms()
    return html`${getTranslation(this.lang).pages.preparing}`
  }

  render() {
    const t = getTranslation(this.lang)
    const title = this.pageTitle()
    const hasHeroImage = this.page === 'about' || this.page === 'contact' || this.page === 'blog'
    return html`
      <ccg-site-header .lang=${this.lang} current=${this.page} langPath=${`${this.page}/`}></ccg-site-header>
      <div class="top">
        <ccg-breadcrumb .items=${[{ label: t.nav.home, href: `/${this.lang}/` }, { label: title }]}></ccg-breadcrumb>
      </div>
      ${hasHeroImage
        ? html`<ccg-page-hero image=${`/site-assets/images/${this.page}.webp`} heading=${title} hideOverlay></ccg-page-hero>`
        : html`<h1 class="page-title">${title}</h1>`}
      <div class="body">${this.renderBody()}</div>
      <footer class="footer"><div class="footer-inner">♣ Classic Card Games Collection</div></footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-static-page': CcgStaticPage
  }
}
