import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import './numpad-dialog-panel'
import { playSubmitSound } from '../../infra/submit-sound'

const HOME_ICON = '\u{1F3E0}'
const SETTINGS_ICON = '⚙'
const GUIDE_ICON = '\u{1F4D6}'

// SELECT BET モーダル。テンキー(numpad-dialog-panel)と同一の中世風 Classic テーマで統一。
// 参照: catalog/design/tenkey-sample.html / numpad-dialog-panel.ts。挙動・API は不変。
@customElement('bet-selector-panel')
export class BetSelectorPanel extends LitElement {
  @property({ type: String }) title = 'Select BET'
  @property({ type: String, attribute: 'available-label' }) availableLabel = 'COIN:'
  @property({ type: Number, attribute: 'available-coin' }) availableCoin = 0
  @property({ type: Number }) bet = 1
  @property({ type: String, attribute: 'start-label' }) startLabel = 'START'
  @property({ type: Boolean, attribute: 'disable-decrease' }) disableDecrease = false
  @property({ type: Boolean, attribute: 'disable-increase' }) disableIncrease = false
  @property({ type: Boolean, attribute: 'disable-start' }) disableStart = false
  @property({ type: Boolean, attribute: 'show-tools' }) showTools = true
  @property({ type: Boolean, attribute: 'show-cancel' }) showCancel = false
  @property({ type: String, attribute: 'cancel-label' }) cancelLabel = 'Cancel'
  @property({ type: String, attribute: 'instruction-text' }) instructionText = ''

  @state()
  private isNumpadOpen = false

  private holdTimer: ReturnType<typeof setTimeout> | null = null
  private holdInterval: ReturnType<typeof setInterval> | null = null
  private isRepeating = false
  private touchActive = false

  private emit(name: string): void {
    this.dispatchEvent(new CustomEvent(name, { detail: { isRepeating: this.isRepeating }, bubbles: true, composed: true }))
  }

  private startHold(callback: () => void, event?: Event): void {
    if (event?.type.startsWith('mouse') && this.touchActive) {
      return
    }
    if (event?.type.startsWith('touch')) {
      this.touchActive = true
      event.preventDefault()
    }
    this.stopHold()
    this.isRepeating = false
    // 押下開始の1回だけタップ音（長押し連続加減算 isRepeating 中は鳴らさない）。
    playSubmitSound()
    callback()
    this.holdTimer = setTimeout(() => {
      this.isRepeating = true
      this.holdInterval = setInterval(() => {
        callback()
      }, 100)
    }, 500)
  }

  private stopHold(event?: Event): void {
    if (event?.type.startsWith('mouse') && this.touchActive) {
      return
    }
    if (event?.type === 'touchend' || event?.type === 'touchcancel') {
      setTimeout(() => {
        this.touchActive = false
      }, 300)
    }
    this.isRepeating = false
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer)
      this.holdTimer = null
    }
    if (this.holdInterval !== null) {
      clearInterval(this.holdInterval)
      this.holdInterval = null
    }
  }

  private openNumpad(): void {
    playSubmitSound()
    this.isNumpadOpen = true
  }

  private closeNumpad(): void {
    this.isNumpadOpen = false
  }

  private onNumpadConfirm(event: CustomEvent<{ value: number }>): void {
    this.dispatchEvent(new CustomEvent('bet-value-change', { detail: { value: event.detail.value }, bubbles: true, composed: true }))
    this.closeNumpad()
  }

  render() {
    return html`
      <div class="bet-modal">
        <div class="bet-emblem">♜</div>

        ${this.showTools
          ? html`
              <div class="bet-tools">
                <button class="tool-key" aria-label="home" @click=${() => this.emit('bet-home')}>${HOME_ICON}</button>
                <button class="tool-key" aria-label="settings" @click=${() => this.emit('bet-settings')}>${SETTINGS_ICON}</button>
                <button class="tool-key" aria-label="guide" @click=${() => this.emit('bet-guide')}>${GUIDE_ICON}</button>
              </div>
            `
          : null}

        <div class="bet-header">
          <span class="header-line"></span>
          <h2>${this.title}</h2>
          <span class="header-line"></span>
        </div>

        <p class="bet-note">${this.availableLabel}${this.availableCoin}</p>

        <div class="bet-controls">
          <button
            class="key key-step"
            @mousedown=${(e: Event) => this.startHold(() => this.emit('bet-decrease'), e)}
            @mouseup=${(e: Event) => this.stopHold(e)}
            @mouseleave=${(e: Event) => this.stopHold(e)}
            @touchstart=${(e: Event) => this.startHold(() => this.emit('bet-decrease'), e)}
            @touchend=${(e: Event) => this.stopHold(e)}
            @touchcancel=${(e: Event) => this.stopHold(e)}
            ?disabled=${this.disableDecrease}>−</button>
          <button class="bet-display" @click=${this.openNumpad}>${this.bet}</button>
          <button
            class="key key-step"
            @mousedown=${(e: Event) => this.startHold(() => this.emit('bet-increase'), e)}
            @mouseup=${(e: Event) => this.stopHold(e)}
            @mouseleave=${(e: Event) => this.stopHold(e)}
            @touchstart=${(e: Event) => this.startHold(() => this.emit('bet-increase'), e)}
            @touchend=${(e: Event) => this.stopHold(e)}
            @touchcancel=${(e: Event) => this.stopHold(e)}
            ?disabled=${this.disableIncrease}>＋</button>
        </div>

        ${this.instructionText ? html`<p class="bet-instruction">${this.instructionText}</p>` : null}

        <div class="action-grid ${this.showCancel ? 'two' : 'one'}">
          ${this.showCancel
            ? html`<button class="action-button cancel-button" @click=${() => this.emit('bet-cancel')}>${this.cancelLabel}</button>`
            : null}
          <button class="action-button ok-button" @click=${() => this.emit('bet-start')} ?disabled=${this.disableStart}>${this.startLabel}</button>
        </div>
      </div>
      ${this.isNumpadOpen
        ? html`
            <numpad-dialog-panel
              title="Enter BET"
              .maxValue=${this.availableCoin}
              .initialValue=${this.bet}
              @numpad-cancel=${this.closeNumpad}
              @numpad-confirm=${this.onNumpadConfirm}
            ></numpad-dialog-panel>
          `
        : null}
    `
  }

  static styles = css`
    /* テンキー(numpad-dialog-panel)と同一の中世風 Classic テーマ。 */
    :host {
      display: block;
      width: min(100%, 440px);
      --panel-dark: #10291c;
      --panel-middle: #173825;
      --panel-light: #234a32;
      --gold-light: #f5dc8a;
      --gold: #c89a3a;
      --gold-dark: #72501d;
      --button-top: #493525;
      --button-bottom: #251b14;
      --red-top: #7f2c24;
      --red-bottom: #431713;
      --blue-top: #24547e;
      --blue-bottom: #102c48;
      --text-light: #f6e6b3;
      --shadow: rgba(0, 0, 0, 0.65);
    }

    button {
      font: inherit;
    }

    .bet-modal {
      position: relative;
      width: 100%;
      padding: 64px 22px 26px;
      color: var(--text-light);
      font-family: "Cinzel", Georgia, "Times New Roman", serif;
      background:
        linear-gradient(145deg, rgba(255, 255, 255, 0.035), transparent 35%),
        linear-gradient(180deg, var(--panel-light), var(--panel-dark));
      border: 3px solid var(--gold);
      border-radius: 20px;
      box-shadow:
        0 0 0 2px #35250f,
        0 0 0 5px var(--gold-dark),
        0 18px 40px var(--shadow),
        inset 0 0 28px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.16);
      box-sizing: border-box;
    }

    /* 上部のアーチ */
    .bet-modal::before {
      content: "";
      position: absolute;
      top: -24px;
      left: 50%;
      width: 74%;
      height: 48px;
      transform: translateX(-50%);
      background: var(--panel-middle);
      border: 3px solid var(--gold);
      border-bottom: 0;
      border-radius: 50% 50% 0 0 / 90% 90% 0 0;
      box-shadow: 0 -2px 0 #38270f, inset 0 6px 12px rgba(255, 255, 255, 0.035);
    }

    /* 内側の細い金枠 */
    .bet-modal::after {
      content: "";
      position: absolute;
      inset: 12px;
      pointer-events: none;
      border: 1px solid rgba(229, 185, 85, 0.54);
      border-radius: 13px;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
    }

    .bet-emblem {
      position: absolute;
      z-index: 2;
      top: -50px;
      left: 50%;
      width: 76px;
      height: 76px;
      transform: translateX(-50%);
      display: grid;
      place-items: center;
      color: var(--gold-light);
      font-size: 34px;
      line-height: 1;
      background: linear-gradient(145deg, #264c35, #0d2016);
      border: 4px solid var(--gold);
      border-radius: 18px 18px 28px 28px;
      box-shadow:
        0 0 0 2px #3d2b11,
        0 8px 15px rgba(0, 0, 0, 0.55),
        inset 0 0 12px rgba(0, 0, 0, 0.5);
    }

    /* ツール（ホーム/設定/ガイド）= 右上の小さな金枠キー */
    .bet-tools {
      position: absolute;
      z-index: 2;
      top: 16px;
      right: 16px;
      display: inline-flex;
      gap: 6px;
    }

    .tool-key {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      font-size: 18px;
      line-height: 1;
      color: var(--text-light);
      cursor: pointer;
      border: 2px solid var(--gold);
      background: linear-gradient(180deg, var(--button-top), var(--button-bottom));
      box-shadow: 0 0 0 1px #2f200d, 0 3px 0 #120d09, inset 0 1px 0 rgba(255, 255, 255, 0.1);
      clip-path: polygon(
        6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px),
        calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px);
    }
    .tool-key:hover { filter: brightness(1.1); }
    .tool-key:active { transform: translateY(2px); }

    .bet-header {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .bet-header h2 {
      margin: 0;
      color: var(--gold-light);
      font-size: clamp(20px, 5.4vw, 30px);
      font-weight: 700;
      letter-spacing: 0.05em;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 2px 0 #5e4015, 0 4px 7px rgba(0, 0, 0, 0.65);
    }

    .header-line {
      position: relative;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
    }

    .header-line::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      transform: translate(-50%, -50%) rotate(45deg);
      background: var(--panel-dark);
      border: 1px solid var(--gold);
    }

    .bet-note {
      position: relative;
      z-index: 1;
      margin: 0 0 14px;
      text-align: center;
      color: var(--gold-light);
      font-size: 20px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
    }

    .bet-controls {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: stretch;
    }

    .key {
      position: relative;
      min-width: 0;
      border: 2px solid var(--gold);
      color: var(--text-light);
      cursor: pointer;
      background: linear-gradient(180deg, var(--button-top), var(--button-bottom));
      box-shadow:
        0 0 0 1px #2f200d,
        0 6px 0 #120d09,
        0 9px 12px rgba(0, 0, 0, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.11),
        inset 0 -8px 14px rgba(0, 0, 0, 0.18);
      text-shadow: 0 2px 0 #4c3515, 0 3px 5px rgba(0, 0, 0, 0.75);
      transition: transform 120ms ease, filter 120ms ease;
      clip-path: polygon(
        8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px),
        calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
    }

    .key-step {
      min-width: 72px;
      min-height: 72px;
      font-size: clamp(30px, 8vw, 38px);
      font-weight: 800;
    }

    /* キー内側の金ヘアライン */
    .key::before,
    .action-button::before {
      content: "";
      position: absolute;
      inset: 5px;
      pointer-events: none;
      border: 1px solid rgba(247, 218, 137, 0.29);
      clip-path: polygon(
        6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px),
        calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px);
    }

    .key:hover,
    .action-button:hover {
      filter: brightness(1.1);
    }

    .key:active,
    .action-button:active {
      transform: translateY(4px);
      box-shadow:
        0 0 0 1px #2f200d,
        0 2px 0 #120d09,
        inset 0 3px 10px rgba(0, 0, 0, 0.28);
    }

    .key:disabled,
    .action-button:disabled {
      opacity: 0.42;
      cursor: default;
      filter: none;
    }

    /* BET 値の表示（タップでテンキー）。numpad の .bet-display と同じ金枠ディスプレイ意匠。 */
    .bet-display {
      position: relative;
      z-index: 1;
      min-height: 72px;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: var(--gold-light);
      font-size: clamp(34px, 10vw, 46px);
      font-weight: 700;
      background: linear-gradient(180deg, #0a1810, #102619);
      border: 3px solid var(--gold);
      border-radius: 14px;
      box-shadow:
        0 0 0 2px #3e2b10,
        inset 0 0 18px rgba(0, 0, 0, 0.7),
        inset 0 1px 0 rgba(255, 255, 255, 0.06),
        0 8px 12px rgba(0, 0, 0, 0.3);
      text-shadow: 0 2px 0 #6d4b1b, 0 4px 5px rgba(0, 0, 0, 0.65);
      overflow: hidden;
    }
    .bet-display:active { filter: brightness(0.92); }

    .bet-instruction {
      position: relative;
      z-index: 1;
      margin: 10px 0 0;
      text-align: center;
      color: rgba(246, 230, 179, 0.85);
      font-size: 14px;
      line-height: 1.4;
    }

    .action-grid {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }
    .action-grid.one { grid-template-columns: 1fr; }
    .action-grid.two { grid-template-columns: 1fr 1fr; }

    .action-button {
      position: relative;
      min-height: 64px;
      font-size: clamp(18px, 4.8vw, 24px);
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--text-light);
      cursor: pointer;
      border: 2px solid var(--gold);
      background: linear-gradient(180deg, var(--button-top), var(--button-bottom));
      box-shadow:
        0 0 0 1px #2f200d,
        0 6px 0 #120d09,
        0 9px 12px rgba(0, 0, 0, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.11);
      text-shadow: 0 2px 0 #4c3515, 0 3px 5px rgba(0, 0, 0, 0.75);
      transition: transform 120ms ease, filter 120ms ease;
      clip-path: polygon(
        8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px),
        calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
    }

    .ok-button {
      background: linear-gradient(180deg, var(--blue-top), var(--blue-bottom));
    }
    .cancel-button {
      background: linear-gradient(180deg, var(--red-top), var(--red-bottom));
    }
  `
}
