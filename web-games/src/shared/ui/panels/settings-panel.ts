import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classicButtonStyles, classicBlueButtonStyles } from '../classic-button.styles'

type Language = 'en' | 'ja' | 'zh'

@customElement('settings-panel')
export class SettingsPanel extends LitElement {
  @property({ type: Boolean }) effectEnabled = true
  @property({ type: Boolean }) bgmEnabled = true
  @property({ type: String }) language: Language = 'en'
  @property({ type: String }) title = ''
  @property({ type: String }) languageLabel = ''
  @property({ type: String }) clearStatsLabel = ''
  @property({ type: String }) clearCacheLabel = ''
  @property({ type: Boolean }) showClearCache = true
  @property({ type: String }) okLabel = 'OK'
  @property({ type: String }) soundHelpTitle = ''
  @property({ type: String }) soundHelpMessage = ''
  @property({ type: String }) helpLabel = '?'
  @property({ type: String }) soundHelpOkLabel = 'OK'

  @property({ type: Boolean, attribute: 'show-sound-help' }) showSoundHelp = false
  @property({ type: Boolean, attribute: 'sound-help-open' }) soundHelpOpen = false

  @property({ type: String }) effectLabel = 'Effect'
  @property({ type: String }) bgmLabel = 'BGM'

  private emit(name: string, detail?: object): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
  }

  private onLanguageChange(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement
    const next = select.value
    if (next === 'en' || next === 'ja' || next === 'zh') {
      this.emit('settings-language-change', { language: next })
    }
  }

  render() {
    return html`
      <div class="head">
        <h3>${this.title}</h3>
      </div>
      <div class="body">
        <label class="setting-row">
          <span class="label-with-help">
            <span>${this.effectLabel}</span>
            ${this.showSoundHelp
              ? html`<button class="help-btn classic-btn-blue" @click=${() => this.emit('settings-open-sound-help')}>${this.helpLabel}</button>`
              : null}
          </span>
          <div class="binary-toggle">
            <button class="mini-btn classic-btn ${this.effectEnabled ? 'active' : ''}" @click=${() => this.emit('settings-effect-change', { enabled: true })}>
              ON
            </button>
            <button class="mini-btn classic-btn ${!this.effectEnabled ? 'active' : ''}" @click=${() => this.emit('settings-effect-change', { enabled: false })}>
              OFF
            </button>
          </div>
        </label>
        <label class="setting-row">
          <span class="label-with-help">
            <span>${this.bgmLabel}</span>
            ${this.showSoundHelp
              ? html`<button class="help-btn classic-btn-blue" @click=${() => this.emit('settings-open-sound-help')}>${this.helpLabel}</button>`
              : null}
          </span>
          <div class="binary-toggle">
            <button class="mini-btn classic-btn ${this.bgmEnabled ? 'active' : ''}" @click=${() => this.emit('settings-bgm-change', { enabled: true })}>
              ON
            </button>
            <button class="mini-btn classic-btn ${!this.bgmEnabled ? 'active' : ''}" @click=${() => this.emit('settings-bgm-change', { enabled: false })}>
              OFF
            </button>
          </div>
        </label>
        ${this.showClearCache
          ? html`<button class="panel-btn classic-btn-blue" @click=${() => this.emit('settings-clear-cache')}>${this.clearCacheLabel}</button>`
          : null}
        <label class="setting-row language-row">
          <span>${this.languageLabel}</span>
          <select class="language-select" .value=${this.language} @change=${this.onLanguageChange} @input=${this.onLanguageChange}>
            <option value="en">English</option>
            <option value="ja">${'\u65e5\u672c\u8a9e'}</option>
            <option value="zh">${'\u4e2d\u6587'}</option>
          </select>
        </label>
        <button class="panel-btn classic-btn-blue" @click=${() => this.emit('settings-close')}>${this.okLabel}</button>
      </div>
      ${this.soundHelpOpen && this.soundHelpMessage
        ? html`
            <section class="help-overlay" @click=${() => this.emit('settings-close-sound-help')}>
              <div class="help-modal" @click=${(e: Event) => e.stopPropagation()}>
                <h4>${this.soundHelpTitle}</h4>
                <p>${this.soundHelpMessage}</p>
                <button class="panel-btn classic-btn-blue" @click=${() => this.emit('settings-close-sound-help')}>${this.soundHelpOkLabel}</button>
              </div>
            </section>
          `
        : null}
    `
  }

  static styles = [css`
    :host {
      display: grid;
      gap: 8px;
      font-size: var(--panel-font-size, 24px);
      line-height: 1.4;
      color: #f2f6f7;
    }

    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .head h3 {
      margin: 0;
      font-size: var(--panel-title-size, 32px);
      letter-spacing: 0.03em;
    }

    .body {
      display: grid;
      gap: 8px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: var(--panel-row-height, 64px);
      padding: 8px 16px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
    }

    .label-with-help {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
    }

    .help-btn {
      min-width: 36px;
      min-height: 36px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(8, 18, 20, 0.75);
      color: #f2f6f7;
      font-size: 20px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: grid;
      place-items: center;
    }

    .language-row {
      display: grid;
      grid-template-columns: 128px minmax(0, 1fr);
      justify-content: center;
      gap: 8px;
    }

    .binary-toggle {
      display: inline-flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .mini-btn {
      min-width: var(--panel-mini-btn-width, 88px);
      min-height: var(--panel-mini-btn-height, 48px);
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(0, 0, 0, 0.35);
      color: #fff;
      font-size: var(--panel-mini-font-size, 16px);
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
    }

    .mini-btn.active {
      background: #6f4a2e;
      color: #1a1a1a;
      border-color: transparent;
    }

    .language-select {
      width: 100%;
      min-width: 0;
      min-height: var(--panel-row-height, 56px);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      font-size: var(--panel-font-size, 24px);
      font-weight: 700;
      padding: 0 8px;
      outline: none;
    }

    .language-select option {
      color: #0f1517;
    }

    .panel-btn {
      min-height: var(--panel-btn-height, 68px);
      border-radius: 999px;
      border: 0;
      background: #6f4a2e;
      color: #1a1a1a;
      font-size: var(--panel-font-size, 24px);
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
    }

    .help-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 10, 11, 0.78);
      display: grid;
      place-items: center;
      padding: 12px;
      z-index: 40;
    }

    .help-modal {
      width: min(100%, 496px);
      background: rgba(10, 23, 25, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 14px;
      padding: 12px;
      display: grid;
      gap: 8px;
      box-sizing: border-box;
    }

    .help-modal h4,
    .help-modal p {
      margin: 0;
    }

    .help-modal h4 {
      font-size: var(--panel-title-size, 26px);
      line-height: 1.2;
    }

    .help-modal p {
      font-size: var(--panel-font-size, 21px);
      line-height: 1.45;
      white-space: pre-line;
    }
  `, classicButtonStyles, classicBlueButtonStyles]
}
