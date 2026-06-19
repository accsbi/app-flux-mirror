import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { LANGS, type Lang } from '../data/games-catalog'
import { getTranslation, SITE_TITLE } from '../i18n/translations'
import { utilities } from '../styles/utilities'

// 言語切替は「コード(en/ja/zh)」ではなく必ずフルラベルで出す（既存 app-flux と同じ）。
const LANG_LABELS: Record<Lang, string> = { en: 'English', ja: '日本語', zh: '中文' }

// サイト共通ヘッダー。app-flux Navigation.astro の構成に合わせる:
//   1段目 = ロゴ(中央)
//   2段目 = ナビリンク(中央) + 言語切替(右・フルラベル)
// フェーズ1では About/Contact/Blog は中身未実装のため無効リンク。
@customElement('ccg-site-header')
export class CcgSiteHeader extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  /** 現在ページ種別。'' = Home(TOP)。ナビのアクティブ表示に使う。 */
  @property({ type: String }) current = ''
  /** /{lang}/ の後ろのパス（言語切替時に同じページへ留まるため）。例: 'games-apps/blackjack/' */
  @property({ type: String }) langPath = ''

  static styles = [utilities, css`
    :host {
      position: sticky;
      top: 0;
      z-index: 100;
      display: block;
      border-bottom: 1px solid var(--gold-deep);
      /* 深紺フェルトの帯 */
      background: linear-gradient(180deg, #1b3358 0%, #0a1c33 100%);
      box-shadow: var(--shadow-nav);
    }
    /* 帯下の金のヘアライン（額縁の演出） */
    :host::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: 2px;
      left: 0;
      height: 1px;
      background: rgba(230, 200, 125, 0.38);
    }
    .nav-content {
      position: relative;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--gold-bright);
      text-decoration: none;
      text-align: center;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
    }
    /* コイン状の金縁クラブマーク */
    .logo .leaf {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid var(--gold);
      border-radius: 50%;
      color: var(--gold-bright);
      font-size: 1.05rem;
      background: radial-gradient(circle at 35% 30%, #244a74, #0a1c33 72%);
      box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
    }
    .nav-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 24px;
    }
    .nav-links {
      display: flex;
      gap: 28px;
      flex: 1;
      justify-content: center;
      flex-wrap: wrap;
    }
    .nav-links a {
      position: relative;
      color: var(--on-dark-soft);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 0.82rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-decoration: none;
      white-space: nowrap;
      transition: color 0.2s ease;
    }
    .nav-links a:hover,
    .nav-links a.active {
      color: var(--gold-bright);
    }
    .nav-links a.active::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--gold);
    }
    .nav-links a.disabled {
      color: var(--on-dark-soft);
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nav-links a.disabled:hover {
      color: var(--on-dark-soft);
    }
    /* 言語切替: フルラベルの金ボーダーピル（コード表記にしない） */
    .langs {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .lang {
      padding: 5px 14px;
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-pill);
      font-family: var(--font-display);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-decoration: none;
      color: var(--gold-bright);
      background: rgba(8, 24, 44, 0.5);
      white-space: nowrap;
      transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease,
        border-color 0.2s ease;
    }
    .lang:hover {
      color: #2e1a0d;
      border-color: var(--gold-bright);
      background: linear-gradient(180deg, var(--gold-bright), var(--gold-deep));
    }
    .lang:active {
      transform: scale(var(--button-active-scale));
    }
    .lang.active {
      color: #2e1a0d;
      border-color: var(--gold-bright);
      background: linear-gradient(180deg, var(--gold-bright), var(--gold));
    }
    @media (max-width: 768px) {
      :host {
        position: static;
      }
      .nav-bottom {
        flex-direction: column;
        gap: 14px;
      }
      .nav-links {
        gap: 16px;
      }
    }
  `]

  render() {
    const t = getTranslation(this.lang)
    const home = `/${this.lang}/`
    return html`
      <div class="nav-content">
        <a class="logo" href=${home} aria-label=${SITE_TITLE}>
          <span class="leaf">♣</span> Classic Card Games Collection
        </a>
        <div class="nav-bottom">
          <nav class="nav-links">
            <a class=${this.current === '' ? 'active' : ''} href=${home}>${t.nav.home}</a>
            <a class=${this.current === 'about' ? 'active' : ''} href=${`/${this.lang}/about/`}
              >${t.nav.about}</a
            >
            <a class=${this.current === 'contact' ? 'active' : ''} href=${`/${this.lang}/contact/`}
              >${t.nav.contact}</a
            >
            <a class=${this.current === 'blog' ? 'active' : ''} href=${`/${this.lang}/blog/`}
              >${t.nav.blog}</a
            >
          </nav>
          <div class="langs">
            ${LANGS.map(
              (l) => html`<a
                class="lang ${l === this.lang ? 'active' : ''}"
                href=${`/${l}/${this.langPath}`}
                hreflang=${l}
                >${LANG_LABELS[l]}</a
              >`,
            )}
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-site-header': CcgSiteHeader
  }
}
