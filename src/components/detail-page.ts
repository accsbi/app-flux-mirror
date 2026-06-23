import { LitElement, css, html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import {
  getGame,
  iconImageUrl,
  infoImageUrl,
  MAX_INFO_IMAGES,
  type GameEntry,
  type Lang,
} from '../data/games-catalog'
import { getTranslation, SITE_TITLE } from '../i18n/translations'
import { renderMarkdown } from '../lib/markdown'
import './site-header'
import './breadcrumb'
import { utilities } from '../styles/utilities'

// 各ゲームの詳細画面。命名規約に沿って画像（feat / icon / info1..8）を組み立て表示する。
// info 画像は存在するものだけ出す（規約パスを順に読み込み、404 は除外）。
@customElement('ccg-detail-page')
export class CcgDetailPage extends LitElement {
  @property({ type: String }) lang: Lang = 'en'
  @property({ type: String }) game = ''
  @state() private entry?: GameEntry
  @state() private notFound = false
  @state() private infoImages: string[] = []

  static styles = [utilities, css`
    :host {
      display: block;
      background: var(--canvas);
    }
    .wrap {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 24px 24px 64px;
    }
    /* ── product header card ── */
    .header-card {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      gap: 24px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-dark) 100%);
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-card);
      /* game-card と同じ金ヘアライン額縁で統一 */
      box-shadow: var(--shadow-card),
        inset 0 0 0 3px var(--surface),
        inset 0 0 0 4px rgba(156, 122, 46, 0.55);
      padding: 24px;
    }
    @media (max-width: 760px) {
      .header-card {
        grid-template-columns: 1fr;
      }
    }
    .feat {
      width: 100%;
      border: 1px solid var(--gold-deep);
      border-radius: 8px;
      aspect-ratio: 1024 / 500;
      object-fit: cover;
      background: var(--ceramic);
    }
    .head-main {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon {
      width: 56px;
      height: 56px;
      border: 1px solid var(--gold-deep);
      border-radius: 14px;
      object-fit: cover;
      box-shadow: var(--shadow-card);
      background: var(--ceramic);
    }
    h1 {
      font-family: var(--font-display);
      font-size: 1.6rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--green);
      line-height: 1.2;
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
    /* バッジは金で統一（Mobile=金の塗り / Web=金のアウトライン） */
    .badge-mobile {
      background: linear-gradient(180deg, var(--gold-bright), var(--gold));
      color: #2e1a0d;
    }
    .badge-web {
      background: transparent;
      color: var(--gold-deep);
    }
    .lead {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--text-soft);
    }
    .cta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: auto;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 7px 20px;
      border-radius: var(--radius-pill);
      font-size: 0.92rem;
      font-weight: 600;
      letter-spacing: var(--tracking);
      text-decoration: none;
      white-space: nowrap;
      transition: transform 0.2s ease;
    }
    .pill:active {
      transform: scale(var(--button-active-scale));
    }
    .pill-primary {
      background: var(--green-accent);
      color: var(--on-dark);
      border: 1px solid var(--green-accent);
    }
    .pill-outline {
      background: transparent;
      color: var(--green-accent);
      border: 1px solid var(--green-accent);
    }
    /* 近日公開: リンクではなく CSS 文字のみ（破線・くすんだ色） */
    .pill-comingsoon {
      background: var(--neutral-cool);
      color: var(--text-soft);
      border: 1px dashed var(--border);
      cursor: default;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.82rem;
    }
    /* ── sections ── */
    section {
      margin-top: 40px;
    }
    h2 {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--green);
      margin-bottom: 16px;
    }
    /* スクリーンショット = 縦長(720x1280)の info 画像を横スクロールで並べる */
    .shots {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(180px, 220px);
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .shot {
      width: 100%;
      border-radius: var(--radius-card);
      aspect-ratio: 720 / 1280;
      object-fit: cover;
      background: var(--ceramic);
      box-shadow: var(--shadow-card);
    }
    .desc-section h3 {
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--green);
      margin: 20px 0 6px;
    }
    .desc-section p {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--text);
    }
    /* ── markdown 本文（.md を分解せずそのまま描画） ── */
    .md-body {
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--text);
    }
    .md-body .md-p {
      margin: 0 0 8px;
    }
    .md-body .md-h {
      font-weight: 700;
      color: var(--green);
      margin: 14px 0 4px;
    }
    .md-body .md-li {
      display: grid;
      grid-template-columns: 1.3em 1fr;
      column-gap: 4px;
      align-items: start;
      margin: 0 0 4px;
    }
    .md-body .md-mark {
      color: var(--green);
    }
    .md-body .md-num {
      font-variant-numeric: tabular-nums;
    }
    .md-body .md-hr {
      border: 0;
      height: 1px;
      margin: 12px 0;
      background: color-mix(in srgb, var(--text) 18%, transparent);
    }
    .md-body .md-link {
      color: var(--green);
      text-decoration: underline;
      word-break: break-all;
    }
    /* ダウンロード（末尾）: クラシックなクリーム額縁カード。SVG バッジは大きめ。 */
    .download-section {
      margin-top: 28px;
      padding: 28px 24px;
      border: 1px solid var(--gold-deep);
      border-radius: var(--radius-card);
      background: var(--ceramic);
      box-shadow: var(--shadow-card);
      text-align: center;
    }
    .download-section h2 {
      margin: 0 0 18px;
      font-family: var(--font-display);
      color: var(--green);
      letter-spacing: var(--tracking);
    }
    .store-links-lg {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .store-link-lg {
      display: inline-flex;
      align-items: center;
      height: 60px;
      transition: transform 0.1s ease;
    }
    .store-link-lg:active {
      transform: scale(var(--button-active-scale));
    }
    .store-icon-lg {
      display: block;
      height: 100%;
      width: auto;
      object-fit: contain;
    }
    .not-found {
      padding: 80px 0;
      text-align: center;
      color: var(--text-soft);
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
  `]

  connectedCallback(): void {
    super.connectedCallback()
    const entry = getGame(this.lang, this.game)
    if (!entry) {
      this.notFound = true
      return
    }
    this.entry = entry
    // タブ名も CSV 由来のタイトルに（静的 <title> に依存しない・単一ソース）。
    document.title = `${entry.title} - ${SITE_TITLE}`
    void this.probeInfoImages(entry.fileName)
  }

  // 命名規約のパスを info1..8 まで順に読み込み、実在するものだけ集める。
  private async probeInfoImages(slug: string) {
    const found: string[] = []
    for (let n = 1; n <= MAX_INFO_IMAGES; n++) {
      const url = infoImageUrl(slug, n)
      const ok = await new Promise<boolean>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = url
      })
      if (ok) found.push(url)
      else break // 連番なので最初の欠番で打ち切り
    }
    this.infoImages = found
  }

  render() {
    const t = getTranslation(this.lang)
    if (this.notFound || !this.entry) {
      return html`
        <ccg-site-header .lang=${this.lang} current="games-apps"></ccg-site-header>
        <div class="wrap"><p class="not-found">${t.detail.notFound}</p></div>
      `
    }
    const g = this.entry
    const lead = g.description
    // 詳細ページに出すのは「サイト向け」セクション。site_description_md（タグ無し＝移行済み）
    // site_description_md はタグ無し（移行済み）。targets が無い節も受理する。
    const bodySections = g.sections.filter((s) => s.targets.includes('site_description') || s.targets.includes('web') || s.targets.length === 0)

    return html`
      <ccg-site-header
        .lang=${this.lang}
        current="games-apps"
        langPath=${`games-apps/${g.fileName}/`}
      ></ccg-site-header>
      <div class="wrap">
        <ccg-breadcrumb
          .items=${[
            { label: t.detail.home, href: `/${this.lang}/` },
            { label: g.title },
          ]}
        ></ccg-breadcrumb>

        <div class="header-card">
          <img class="feat" src=${g.featImage} alt=${g.title} />
          <div class="head-main">
            <div class="title-row">
              <img
                class="icon"
                src=${iconImageUrl(g.fileName)}
                alt=""
                @error=${(e: Event) => ((e.target as HTMLElement).style.display = 'none')}
              />
              <h1>${g.title}</h1>
            </div>
            <div class="badges">
              <span class="badge badge-mobile">${t.catalog.badgeMobile}</span>
              <span class="badge badge-web">${t.catalog.badgeWeb}</span>
            </div>
            ${lead ? html`<p class="lead">${lead}</p>` : nothing}
            <div class="cta-row">
              ${g.webPublished
                ? html`<a class="pill pill-primary" href=${g.webGameHref}
                    >🎮 ${t.catalog.browserGame}</a
                  >`
                : nothing}
              ${g.storeState === 'button' && g.googlePlayUrl
                ? html`<a
                    class="pill pill-outline"
                    href=${g.googlePlayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    >${t.detail.getOnGooglePlay}</a
                  >`
                : g.storeState === 'comingsoon'
                  ? html`<span class="pill pill-comingsoon">${t.catalog.comingSoon}</span>`
                  : nothing}
              ${g.youtubePublished && g.youtubeUrl
                ? html`<a
                    class="pill pill-outline"
                    href=${g.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    >${t.detail.watchOnYoutube}</a
                  >`
                : nothing}
            </div>
          </div>
        </div>

        ${this.infoImages.length > 0
          ? html`<section>
              <h2>${t.detail.screenshots}</h2>
              <div class="shots">
                ${this.infoImages.map(
                  (src) => html`<img class="shot" src=${src} alt=${g.title} loading="lazy" />`,
                )}
              </div>
            </section>`
          : nothing}

        ${bodySections.length > 0
          ? html`<section class="desc-section">
              ${bodySections.map(
                (s) => html`<h3>${s.heading}</h3>
                  <div class="md-body">${renderMarkdown(s.body)}</div>`,
              )}
            </section>`
          : nothing}

        ${(g.storeState === 'button' && g.googlePlayUrl) || (g.youtubePublished && g.youtubeUrl)
          ? html`<section class="download-section">
              <h2>${t.detail.downloadTitle}</h2>
              <div class="store-links-lg">
                ${g.storeState === 'button' && g.googlePlayUrl
                  ? html`<a
                      class="store-link-lg"
                      href=${g.googlePlayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Google Play"
                    >
                      <img class="store-icon-lg" src="/site-assets/images/google-play.svg" alt="Google Play" loading="lazy" />
                    </a>`
                  : g.storeState === 'comingsoon'
                    ? html`<span class="pill pill-comingsoon">${t.catalog.comingSoon}</span>`
                    : nothing}
                ${g.youtubePublished && g.youtubeUrl
                  ? html`<a
                      class="store-link-lg"
                      href=${g.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                    >
                      <img class="store-icon-lg" src="/site-assets/images/youtube.svg" alt="YouTube" loading="lazy" />
                    </a>`
                  : nothing}
              </div>
            </section>`
          : nothing}
      </div>

      <footer class="footer">
        <div class="footer-inner">♣ Classic Card Games Collection</div>
      </footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-detail-page': CcgDetailPage
  }
}
