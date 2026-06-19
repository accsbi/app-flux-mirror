import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { loadSharedCoin } from '../../infra/shared-coin-store'
import { coinIcon } from '../icons/coin-icon'

/**
 * 共有コイン残高の共通表示。
 *
 * 表記ルール（唯一の正）:
 *   - 横幅に余裕がある場合: 「[コイン] COIN {数}」
 *   - 幅が狭い場合:         「[コイン] {数} COIN」
 * アイコン（coinIcon の SVG）は常に先頭。COIN と数値の並びだけを幅で入れ替える。
 *
 * 値は省略時に共有コインストア（shared-coin-store）から読み出すため、
 * 各ゲームが残高を渡さなくても共通の残高を表示できる。
 */
@customElement('coin-balance-display')
export class CoinBalanceDisplay extends LitElement {
  /** 表示するコイン数。未指定（負値）の場合は共有ストアから読み出す。 */
  @property({ type: Number }) coin = -1

  /** true のとき「COIN」文字を出さず「[コイン] {数}」だけ表示（タイトル横にスッキリ収める用）。 */
  @property({ type: Boolean, attribute: 'hide-label' }) hideLabel = false

  private resolveCoin(): number {
    return this.coin >= 0 ? this.coin : loadSharedCoin()
  }

  render() {
    const value = this.resolveCoin()
    return html`
      <span class="coin" aria-label=${`COIN ${value}`}>
        <span class="ic" aria-hidden="true">${coinIcon()}</span>
        ${this.hideLabel ? null : html`<span class="label">COIN</span>`}
        <span class="num">${value}</span>
      </span>
    `
  }

  static styles = css`
    :host {
      display: inline-flex;
    }

    .coin {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #ffd76a;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
      white-space: nowrap;
    }

    .ic {
      order: 0;
    }

    /* 余裕がある場合: [コイン] COIN {数} */
    .label {
      order: 1;
    }

    .num {
      order: 2;
    }

    /* 幅が狭い場合: [コイン] {数} COIN */
    @media (max-width: 420px) {
      .num {
        order: 1;
      }

      .label {
        order: 2;
      }
    }
  `
}
