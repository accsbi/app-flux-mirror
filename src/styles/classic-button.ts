import { css } from 'lit'

/**
 * クラシック主 CTA（金の多重額縁 × フェルト中央の押し込みボタン）。唯一ソース。
 *
 * もとは game-card.ts に直書きしていた `.web-link-btn` を共有化したもの。
 * カタログの「ブラウザゲーム」ボタンと About ページの CTA で同一デザインを使う
 * （コピペ・各ページ独自実装の禁止＝CLAUDE.md §1）。
 *
 * 配色は中央フェルトだけ `--cta-felt` で差し替え可能（既定＝濃紺）。
 * 例: 赤系 … style="--cta-felt: linear-gradient(180deg,#a52424 0%,#590d0d 100%)"
 * （金の額縁・艶・押し込みは全色共通。手本＝catalog/design/sample-classic-colors.html）。
 *
 * 使い方:
 *   import { classicButton } from '../styles/classic-button'
 *   static styles = [classicButton, css`...`]
 *   <a class="web-link-btn"><span class="web-link-btn__text">...</span></a>
 */
export const classicButton = css`
  .web-link-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    min-height: 58px;
    padding: 12px 22px;
    box-sizing: border-box;
    border: 2px solid var(--gold-deep);
    border-radius: var(--radius-pill);
    text-decoration: none;
    background: radial-gradient(
        ellipse at 50% 20%,
        rgba(255, 255, 255, 0.07),
        transparent 48%
      ),
      repeating-linear-gradient(
        115deg,
        rgba(255, 255, 255, 0.02) 0,
        rgba(255, 255, 255, 0.02) 1px,
        transparent 1px,
        transparent 5px
      ),
      var(--cta-felt, linear-gradient(180deg, #1b3358 0%, #0a1c33 35%, #06101d 100%));
    /* 金 → 濃紺 → 金 の入れ子フレーム＋上下の艶 */
    box-shadow: 0 3px 0 #05101c, 0 7px 12px rgba(0, 0, 0, 0.42),
      inset 0 0 0 2px var(--gold), inset 0 0 0 4px #142336,
      inset 0 0 0 6px var(--gold-deep),
      inset 0 8px 10px rgba(255, 255, 255, 0.05),
      inset 0 -10px 16px rgba(0, 0, 0, 0.4);
    transition: transform 150ms ease, filter 150ms ease;
  }
  .web-link-btn__icon {
    position: relative;
    z-index: 2;
    font-size: 1.1rem;
    line-height: 1;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
  }
  .web-link-btn__text {
    position: relative;
    z-index: 2;
    font-family: var(--font-display);
    font-size: clamp(15px, 3.6vw, 19px);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.04em;
    white-space: nowrap;
    color: transparent;
    background: linear-gradient(
      180deg,
      #fff0ad 0%,
      #e2b95d 30%,
      #a96820 63%,
      #f0ce75 100%
    );
    background-clip: text;
    -webkit-background-clip: text;
    filter: drop-shadow(0 2px 0 #3f2108);
  }
  .web-link-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
  .web-link-btn:active {
    filter: brightness(0.92);
    transform: translateY(2px);
  }
  .web-link-btn:focus-visible {
    outline: 3px solid var(--gold-bright);
    outline-offset: 4px;
  }
`
