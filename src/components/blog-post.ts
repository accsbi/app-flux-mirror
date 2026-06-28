import { LitElement, css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Lang } from '../data/games-catalog'
import { getTranslation } from '../i18n/translations'
import { getPost, formatPostDate } from '../data/blog'
import { renderMarkdown } from '../lib/markdown'
import './site-header'
import './breadcrumb'
import { utilities } from '../styles/utilities'

// 個別ブログ記事ページ。lang/slug は HTML 側の <ccg-blog-post lang slug> 属性で渡す。
// 記事本文は catalog/blog/*.md（唯一ソース）→ src/data/blog.ts。サイト共通デザイン。
@customElement('ccg-blog-post')
export class CcgBlogPost extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  @property({ type: String }) slug = ''

  static styles = [utilities, css`
    :host { display: block; background: var(--canvas); min-height: 100vh; }
    .top { max-width: var(--max-width); margin: 0 auto; padding: 16px 24px 0; }
    .body { max-width: var(--max-width); margin: 0 auto; padding: 24px 24px 80px; }

    .post { max-width: 760px; margin: 0 auto; color: var(--text); }
    .post-date { color: var(--text-soft); font-size: .85rem; letter-spacing: .04em; margin: 0 0 10px; }
    .post-title {
      font-family: var(--font-display); color: var(--green);
      font-size: clamp(1.6rem, 4.5vw, 2.4rem); line-height: 1.25; margin: 0 0 20px;
      padding-bottom: .6rem; border-bottom: 2px solid var(--gold-line);
    }
    /* ヒーロー画像＝金枠の額装（クラシック統一） */
    .post-hero {
      display: block; width: 100%; aspect-ratio: 1024 / 500; object-fit: cover;
      border: 1px solid var(--gold-deep); border-radius: 10px; background: var(--green-house);
      margin: 0 0 24px;
    }
    /* markdown 本文（renderMarkdown が md-* クラスを出力） */
    .post .md-p { margin: 0 0 1.1rem; line-height: 1.9; }
    .post .md-img {
      display: block; width: 100%; height: auto; margin: 1.4rem 0;
      border: 1px solid var(--gold-deep); border-radius: 10px; background: var(--green-house);
    }
    .post .md-h { font-family: var(--font-display); color: var(--green); margin: 1.6rem 0 .8rem; line-height: 1.4; }
    .post .md-h2 { font-size: 1.4rem; }
    .post .md-h3, .post .md-h4 { font-size: 1.15rem; }
    .post .md-li { display: flex; gap: .5rem; margin: 0 0 .5rem; line-height: 1.8; }
    .post .md-mark { color: var(--gold-deep); flex-shrink: 0; }
    .post .md-link { color: var(--green-accent); text-decoration: underline; text-underline-offset: 3px; }
    .post .md-hr { border: none; border-top: 1px solid var(--gold-line); opacity: .5; margin: 2rem 0; }

    .back { display: inline-block; margin-top: 32px; color: var(--green-accent); font-weight: 700; text-decoration: none; }
    .back:hover { text-decoration: underline; }
    .notfound { text-align: center; color: var(--text-soft); padding: 48px 0; }

    .footer { border-top: 1px solid var(--gold-deep); background: linear-gradient(180deg, #0d2138 0%, #06101d 100%); }
    .footer-inner { max-width: var(--max-width); margin: 0 auto; padding: 40px 24px; text-align: center; font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; letter-spacing: 0.04em; color: var(--gold-bright); }
  `]

  private renderBody(): TemplateResult {
    const t = getTranslation(this.lang)
    const post = getPost(this.lang, this.slug)
    if (!post) {
      return html`<p class="notfound">404</p>
        <p class="notfound"><a class="back" href=${`/${this.lang}/blog/`}>← ${t.nav.blog}</a></p>`
    }
    return html`<article class="post">
      <p class="post-date">${formatPostDate(this.lang, post.date)}</p>
      <h1 class="post-title">${post.title}</h1>
      ${post.image
        ? html`<img class="post-hero" src=${post.image} alt=${post.title} loading="lazy" />`
        : nothing}
      ${renderMarkdown(post.body)}
      <a class="back" href=${`/${this.lang}/blog/`}>← ${t.nav.blog}</a>
    </article>`
  }

  render() {
    const t = getTranslation(this.lang)
    const post = getPost(this.lang, this.slug)
    const crumbTitle = post?.title ?? t.nav.blog
    return html`
      <ccg-site-header .lang=${this.lang} current="blog" langPath=${`blog/${this.slug}/`}></ccg-site-header>
      <div class="top">
        <ccg-breadcrumb
          .items=${[
            { label: t.nav.home, href: `/${this.lang}/` },
            { label: t.nav.blog, href: `/${this.lang}/blog/` },
            { label: crumbTitle },
          ]}
        ></ccg-breadcrumb>
      </div>
      <div class="body">${this.renderBody()}</div>
      <footer class="footer"><div class="footer-inner">♣ Classic Card Games Collection</div></footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-blog-post': CcgBlogPost
  }
}
