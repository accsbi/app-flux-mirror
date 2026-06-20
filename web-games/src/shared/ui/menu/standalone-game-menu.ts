import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { buildGameAssetUrl } from '../../infra/game-asset-url'
import { sharedGameHostStyles, sharedGameStageStyles } from '../styles/shared-game-layout-styles'
import { menuBaseStyles } from './menu-base.styles'
import { ensureClassicFont } from '../classic-font'
import { applyStageScale } from '../styles/stage-layout'
import '../chrome/coin-balance-display'

@customElement('standalone-game-menu')
export class StandaloneGameMenu extends LitElement {
  @property({ type: String }) title = ''
  // タイトル横のコイン残高。未指定(-1)なら共有コインストアから読み出す。ハブなど残高が動的に
  // 変わる画面では呼び出し側が現在値を渡して即時反映させる。
  @property({ type: Number }) coin = -1
  @property({ type: String, attribute: 'background-image-src' }) backgroundImageSrc = buildGameAssetUrl('images/background.webp')
  @property({ type: String, attribute: 'hero-image-src' }) heroImageSrc = ''
  @property({ type: String, attribute: 'hero-image-alt' }) heroImageAlt = ''
  @property({ type: String, attribute: 'start-label' }) startLabel = 'START'
  @property({ type: String, attribute: 'guide-label' }) guideLabel = 'Guide'
  @property({ type: String, attribute: 'settings-label' }) settingsLabel = 'Settings'
  @property({ type: String, attribute: 'back-label' }) backLabel = 'Back'
  @property({ type: String, attribute: 'extra-action-label' }) extraActionLabel = ''
  @property({ type: String, attribute: 'store-notice' }) storeNotice = ''
  @property({ type: String, attribute: 'store-title' }) storeTitle = ''
  @property({ type: String, attribute: 'store-url' }) storeUrl = ''
  @property({ type: String, attribute: 'store-badge-src' }) storeBadgeSrc = ''
  @property({ type: String, attribute: 'store-badge-alt' }) storeBadgeAlt = 'Google Play'
  @property({ type: String, attribute: 'youtube-url' }) youtubeUrl = ''
  @property({ type: String, attribute: 'youtube-badge-src' }) youtubeBadgeSrc = ''
  @property({ type: String, attribute: 'youtube-badge-alt' }) youtubeBadgeAlt = 'YouTube'
  @property({ type: String, attribute: 'news-label' }) newsLabel = ''
  @property({ type: String, attribute: 'news-url' }) newsUrl = ''
  // 「別のカードゲーム」(Android のみ)。外部リンク（News と同じ <a> パターン）。
  @property({ type: String, attribute: 'other-games-label' }) otherGamesLabel = ''
  @property({ type: String, attribute: 'other-games-url' }) otherGamesUrl = ''
  // 外部リンク系ボタン(広告を削除 / 別のカードゲーム / お知らせ・更新)に付ける外部リンクアイコン。
  // 空なら非表示（WEB は空＝アイコン無し）。
  @property({ type: String, attribute: 'external-icon-src' }) externalIconSrc = ''
  // News ボタン下に出す「アイコン＝外部リンク」の小さな説明文（Android のみ）。
  @property({ type: String, attribute: 'external-note' }) externalNote = ''
  @property({ type: String, attribute: 'version' }) version = ''

  connectedCallback(): void {
    super.connectedCallback()
    ensureClassicFont()
    window.addEventListener('resize', this.updateScale)
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    super.disconnectedCallback()
  }

  firstUpdated(): void {
    this.updateScale()
  }

  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  private emit(name: 'menu-back' | 'menu-start' | 'menu-guide' | 'menu-settings' | 'menu-extra'): void {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }))
  }

  render() {
    const hasHeroImage = this.heroImageSrc.trim().length > 0
    const hasBackButton = this.backLabel.trim().length > 0
    const hasExtraAction = this.extraActionLabel.trim().length > 0
    const hasNewsLink = this.newsLabel.trim().length > 0 && this.newsUrl.trim().length > 0
    const hasOtherGames = this.otherGamesLabel.trim().length > 0 && this.otherGamesUrl.trim().length > 0
    const extIcon = this.externalIconSrc.trim().length > 0
      ? html`<img class="menu-btn-icon" src=${this.externalIconSrc} alt="" aria-hidden="true" />`
      : null
    const hasStoreLink = this.storeUrl.trim().length > 0 && this.storeBadgeSrc.trim().length > 0
    const hasYoutubeLink = this.youtubeUrl.trim().length > 0 && this.youtubeBadgeSrc.trim().length > 0
    const hasPromotionSection = hasStoreLink || hasYoutubeLink
    const hasVersion = this.version.trim().length > 0
    const stageStyle = `background-image: url('${this.backgroundImageSrc}')`

    return html`
      <div class="screen-bg">
        <section class="stage" style=${stageStyle}>
          <div class="menu-layout">
            <div class="menu-card">
              <header class="menu-header">
                <div class="menu-topbar">
                  ${hasBackButton
        ? html`<button class="back-btn" @click=${() => this.emit('menu-back')}><span class="menu-btn-text back-btn-text">${this.backLabel}</span></button>`
        : html`<span class="topbar-spacer"></span>`}
                  <coin-balance-display class="menu-coin" hide-label .coin=${this.coin}></coin-balance-display>
                </div>
                <div class="menu-title-row">
                  <h1>${this.title}</h1>
                </div>
              </header>

              ${hasHeroImage
        ? html`
                    <div class="feature-wrap">
                      <img class="feature-image" src=${this.heroImageSrc} alt=${this.heroImageAlt || this.title} />
                    </div>
                  `
        : null}

              <div class="menu-buttons">
                <button class="menu-btn" @click=${() => this.emit('menu-start')}><span class="menu-btn-text">${this.startLabel}</span></button>
                <button class="menu-btn" @click=${() => this.emit('menu-guide')}><span class="menu-btn-text">${this.guideLabel}</span></button>
                <button class="menu-btn" @click=${() => this.emit('menu-settings')}><span class="menu-btn-text">${this.settingsLabel}</span></button>
                ${hasExtraAction
        ? html`<button class="menu-btn" @click=${() => this.emit('menu-extra')}><span class="menu-btn-text">${this.extraActionLabel}</span></button>`
        : null}
                ${hasOtherGames
        ? html`<a class="menu-btn news-btn" href=${this.otherGamesUrl} target="_blank" rel="noopener noreferrer">${extIcon}<span class="menu-btn-text">${this.otherGamesLabel}</span></a>`
        : null}
                ${hasNewsLink
        ? html`<a class="menu-btn news-btn" href=${this.newsUrl}><span class="menu-btn-text">${this.newsLabel}</span></a>`
        : null}
              </div>

              ${this.externalIconSrc.trim().length > 0 && this.externalNote.trim().length > 0
        ? html`<p class="external-note"><img class="external-note-icon" src=${this.externalIconSrc} alt="" aria-hidden="true" />${this.externalNote}</p>`
        : null}

              ${hasPromotionSection
        ? html`
                    <section class="store-section">
                      ${this.storeNotice
            ? html`<p class="store-notice">${this.storeNotice}</p>`
            : null}
                      ${this.storeTitle
            ? html`<p class="store-title">${this.storeTitle}</p>`
            : null}
                      <div class="store-links">
                        ${hasStoreLink
            ? html`
                              <a class="store-link store-link-google" href=${this.storeUrl} target="_blank" rel="noopener noreferrer">
                                <img class="store-badge store-badge-google" src=${this.storeBadgeSrc} alt=${this.storeBadgeAlt} />
                              </a>
                            `
            : null}
                        ${hasYoutubeLink
            ? html`
                              <a class="store-link store-link-youtube" href=${this.youtubeUrl} target="_blank" rel="noopener noreferrer">
                                <img class="store-badge store-badge-youtube" src=${this.youtubeBadgeSrc} alt=${this.youtubeBadgeAlt} />
                              </a>
                            `
            : null}
                      </div>
                    </section>
                  `
        : null}

            </div>
          </div>
          ${hasVersion
        ? html`<div class="meta-area"><p class="version-text">Ver : ${this.version}</p></div>`
        : null}
        </section>
      </div>
    `
  }

  static styles = [
    sharedGameHostStyles,
    sharedGameStageStyles,
    menuBaseStyles,
    css`
      :host {
        width: 100vw;
        height: 100vh;
        border-radius: 0 !important;
        overflow: hidden;
      }

      .screen-bg,
      .stage {
        border-radius: 0 !important;
        clip-path: inset(0 round 0);
      }

      /* レスポンシブ：パーツ(header/hero/buttons)を縦方向の中央に寄せ、画面が高くても
         下に大きな余白を作らない。バージョンは枠(menu-card)内の右下に固定して中央寄せから外す。
         （menu-base の grid 配置を flex 中央寄せで上書き。全ゲーム共通＝再発防止の単一ソース） */
      .menu-card {
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
      }

      /* ヘッダー内構成のみ（card/hero/buttons の体裁は menu-base.styles を単一ソースで参照） */
      .menu-header {
        width: min(496px, 100%);
        margin: 0 auto 16px;
        text-align: left;
        box-sizing: border-box;
        display: grid;
        gap: 8px;
      }

      /* h1 は menu-base.styles（基準=3in1値）を参照。ここでは再定義しない。 */

      /* 上段: 左に戻る・右端にコイン（タイトルとは別行＝コインが切れない）。 */
      .menu-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        margin-bottom: 8px;
      }
      .topbar-spacer {
        flex: 1 1 auto;
      }

      /* タイトルは全幅（コインと取り合わない＝長くても切れにくい・コインも切れない）。 */
      .menu-title-row {
        display: flex;
        align-items: center;
        width: 100%;
      }
      .menu-title-row h1 {
        width: 100%;
      }

      .menu-coin {
        flex: 0 0 auto;
        margin-left: auto;
        /* 戻る/BACK ボタンの文字（back-btn-text）と同じ大きさに揃える。 */
        --coin-font-size: clamp(18px, 4.4vw, 24px);
      }

      /* 戻るボタンもクラシック（金×緑）。menu-btn を小型化した版。
         外枠1本線のみ＋深緑系(08)で menu-btn と統一。 */
      .back-btn {
        --gold-light: #f4cf7a;
        --gold-main: #b77a28;
        --gold-dark: #4e2d09;
        --green-light: #153523;
        --green-main: #0d2417;
        --green-dark: #07170f;
        justify-self: start;
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 92px;
        min-height: 48px;
        padding: 8px 22px;
        box-sizing: border-box;
        border: 2px solid var(--gold-main);
        border-radius: 999px;
        color: var(--gold-light);
        background:
          radial-gradient(ellipse at 50% 20%, rgb(255 255 255 / 7%), transparent 48%),
          linear-gradient(180deg, var(--green-light) 0%, var(--green-main) 38%, var(--green-dark) 100%);
        box-shadow:
          0 2px 0 #07140d,
          0 5px 9px rgb(0 0 0 / 45%),
          inset 0 2px 1px rgb(255 255 255 / 6%);
        cursor: pointer;
        transition: transform 150ms ease, filter 150ms ease;
      }
      .back-btn:hover {
        filter: brightness(1.12);
        transform: translateY(-2px);
      }
      .back-btn:active {
        filter: brightness(0.9);
        transform: translateY(2px);
      }
      .back-btn:focus-visible {
        outline: 3px solid #f4cf7a;
        outline-offset: 4px;
      }
      .back-btn-text {
        font-size: clamp(18px, 4.4vw, 24px);
      }

      .news-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
      }

      /* 外部リンクボタンの先頭アイコン（Android のみ・externalIconSrc 指定時） */
      .menu-btn-icon {
        width: 24px;
        height: 24px;
        margin-right: 10px;
        flex: 0 0 auto;
        vertical-align: middle;
      }

      /* バージョンは枠(menu-card)の外＝stage 下部の余白に置く（ボタンと重ねない）。 */
      .meta-area {
        position: absolute;
        right: 16px;
        bottom: 6px;
        width: auto;
        margin: 0;
        text-align: right;
        z-index: 2;
      }

      /* News ボタン下：アイコン＝外部リンクの小さな説明（枠内・Android のみ）。
         アイコンは暗色(#1a1a1a)なので暗い枠内では invert して見せる。 */
      .external-note {
        width: min(496px, 100%);
        margin: 10px auto 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 14px;
        line-height: 1.3;
        color: rgba(238, 244, 245, 0.82);
        text-align: center;
      }
      .external-note-icon {
        width: 15px;
        height: 15px;
        flex: 0 0 auto;
        filter: invert(1);
        opacity: 0.85;
      }

      .version-text {
        margin: 0;
        color: #d7dcdd;
        font-size: 16px;
        letter-spacing: 0.02em;
        min-height: 16px;
        white-space: nowrap;
      }

      .store-section {
        display: grid;
        justify-items: center;
        gap: 8px;
        color: #f2f6f7;
        margin-top: 8px;
      }

      .store-notice,
      .store-title {
        margin: 0;
        text-align: center;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      }

      .store-notice { font-size: 18px; line-height: 1.35; }
      .store-title { font-size: 20px; line-height: 1.35; font-weight: 700; }
      .store-link { display: inline-flex; align-items: center; justify-content: center; }

      .store-links {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        justify-items: center;
        gap: 10px;
        width: min(100%, 500px);
        align-items: center;
      }

      .store-badge { display: block; height: auto; }
      .store-badge-google { width: 130px; max-width: 100%; }
      .store-badge-youtube { width: auto; max-width: 100%; height: 40px; object-fit: contain; }

      @media (max-width: 420px), (max-height: 740px) {
        .store-links { grid-template-columns: 1fr; width: min(100%, 240px); }
      }
    `
  ]
}
