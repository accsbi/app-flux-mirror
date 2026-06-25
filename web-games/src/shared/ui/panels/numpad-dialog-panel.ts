import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { playSubmitSound } from '../../infra/submit-sound'

@customElement('numpad-dialog-panel')
export class NumpadDialogPanel extends LitElement {
  @property({ type: String }) title = ''
  @property({ type: Number }) maxValue = 0
  @property({ type: Number }) initialValue = 0

  @state()
  private displayValue = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.displayValue = String(this.initialValue || 0)
  }

  private appendToInput(digit: string): void {
    playSubmitSound()
    const currentValue = this.displayValue || '0'
    const newValue = currentValue === '0' ? digit : currentValue + digit
    const numValue = parseInt(newValue, 10)
    if (!isNaN(numValue) && numValue <= this.maxValue) {
      this.displayValue = String(numValue)
    }
  }

  private clearInput(): void {
    playSubmitSound()
    this.displayValue = '0'
  }

  private backspaceInput(): void {
    playSubmitSound()
    const currentValue = this.displayValue || '0'
    if (currentValue.length > 1) {
      this.displayValue = currentValue.slice(0, -1)
    } else {
      this.displayValue = '0'
    }
  }

  private setMin(): void {
    playSubmitSound()
    this.displayValue = '1'
  }

  private setMax(): void {
    playSubmitSound()
    this.displayValue = String(this.maxValue)
  }

  private cancel(): void {
    playSubmitSound()
    this.dispatchEvent(new CustomEvent('numpad-cancel', { bubbles: true, composed: true }))
  }

  private confirm(): void {
    playSubmitSound()
    const value = parseInt(this.displayValue, 10)
    if (!isNaN(value) && value >= 0 && value <= this.maxValue) {
      this.dispatchEvent(new CustomEvent('numpad-confirm', { detail: { value }, bubbles: true, composed: true }))
    }
  }

  render() {
    return html`
      <section class="overlay">
        <div class="bet-modal">
          <div class="bet-emblem">♜</div>

          <div class="bet-header">
            <span class="header-line"></span>
            <h2>${this.title}</h2>
            <span class="header-line"></span>
          </div>

          <div class="bet-display">${this.displayValue || '0'}</div>

          <div class="number-grid">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => html`
              <button class="key" type="button" @click=${() => this.appendToInput(String(num))}>${num}</button>
            `)}
            <button class="key key-clear" type="button" @click=${() => this.clearInput()}>C</button>
            <button class="key" type="button" @click=${() => this.appendToInput('0')}>0</button>
            <button class="key key-back" type="button" @click=${() => this.backspaceInput()}>←</button>
          </div>

          <div class="limit-grid">
            <button class="wide-key" type="button" @click=${this.setMin}>♛ <span>MIN</span></button>
            <button class="wide-key" type="button" @click=${this.setMax}><span>MAX</span> ♛</button>
          </div>

          <div class="action-grid">
            <button class="action-button cancel-button" type="button" @click=${this.cancel}>CANCEL</button>
            <button class="action-button ok-button" type="button" @click=${this.confirm}>OK</button>
          </div>
        </div>
      </section>
    `
  }

  static styles = css`
    /* catalog/design/tenkey-sample.html を参考にした中世風UI。挙動は不変。 */
    :host {
      display: block;
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
      --gray-top: #45484a;
      --gray-bottom: #252729;
      --text-light: #f6e6b3;
      --shadow: rgba(0, 0, 0, 0.65);
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 10, 11, 0.85);
      display: grid;
      place-items: center;
      padding: 56px 12px 16px;
      z-index: 100;
      overflow: auto;
    }

    button {
      font: inherit;
    }

    .bet-modal {
      position: relative;
      width: min(100%, 440px);
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

    .bet-header {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
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

    .bet-display {
      position: relative;
      z-index: 1;
      min-height: 86px;
      margin-bottom: 18px;
      display: grid;
      place-items: center;
      color: var(--gold-light);
      font-size: clamp(40px, 12vw, 56px);
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

    .number-grid,
    .limit-grid,
    .action-grid {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 10px;
    }

    .number-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .limit-grid,
    .action-grid {
      grid-template-columns: repeat(2, 1fr);
      margin-top: 12px;
    }

    .key,
    .wide-key,
    .action-button {
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

    .key {
      min-height: 64px;
      font-size: clamp(26px, 7vw, 34px);
      font-weight: 700;
    }

    .wide-key {
      min-height: 60px;
      font-size: clamp(17px, 4.6vw, 23px);
      font-weight: 700;
      letter-spacing: 0.05em;
      background: linear-gradient(180deg, #25462f, #112c1d);
    }

    .wide-key span {
      margin: 0 8px;
    }

    .action-button {
      min-height: 64px;
      font-size: clamp(17px, 4.6vw, 23px);
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .key-clear,
    .cancel-button {
      background: linear-gradient(180deg, var(--red-top), var(--red-bottom));
    }

    .key-back {
      background: linear-gradient(180deg, var(--gray-top), var(--gray-bottom));
    }

    .ok-button {
      background: linear-gradient(180deg, var(--blue-top), var(--blue-bottom));
    }

    /* キー内側の金ヘアライン */
    .key::before,
    .wide-key::before,
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
    .wide-key:hover,
    .action-button:hover {
      filter: brightness(1.1);
    }

    .key:active,
    .wide-key:active,
    .action-button:active {
      transform: translateY(4px);
      box-shadow:
        0 0 0 1px #2f200d,
        0 2px 0 #120d09,
        inset 0 3px 10px rgba(0, 0, 0, 0.28);
    }
  `
}
