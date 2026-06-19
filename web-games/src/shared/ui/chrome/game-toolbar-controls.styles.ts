import { css } from 'lit'

export const gameToolbarControlsStyles = css`
  .toolbar-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
    gap: var(--toolbar-gap, 6px);
    width: 100%;
    padding: var(--toolbar-pad-top, 0) var(--toolbar-pad-x, 2px) var(--toolbar-pad-bottom, 0);
    box-sizing: border-box;
  }

  /* クラシック（金×緑）。メニューと統一だが、ここは「外枠1本線のみ」＝インセットの金線は付けない。 */
  .toolbar-btn {
    --gold-light: #f4cf7a;
    --gold-main: #b77a28;
    --gold-dark: #4e2d09;
    --green-light: #173a27;
    --green-main: #092719;
    --green-dark: #03150d;

    width: 100%;
    min-width: 0;
    height: var(--toolbar-btn-height, 54px);
    min-height: var(--toolbar-btn-height, 54px);
    border-radius: 999px;
    /* 外枠1本線だけ（多重インセットなし） */
    border: 2px solid var(--gold-main);
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, var(--green-light) 0%, var(--green-main) 38%, var(--green-dark) 100%);
    color: var(--gold-light);
    box-shadow: 0 2px 0 #2c1806, 0 4px 8px rgb(0 0 0 / 40%);
    line-height: 1;
    white-space: nowrap;
    padding: 0 6px;
    cursor: pointer;
    box-sizing: border-box;
    transition: transform 150ms ease, filter 150ms ease;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  /* ラベルは金グラデ文字（メニューと同じ Cinzel）。 */
  .toolbar-btn-text {
    display: block;
    max-width: 100%;
    text-align: center;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    /* スマホで豆粒にならないよう固定 px（ステージは transform:scale で一様縮小）。 */
    font-size: var(--toolbar-btn-font-size, 20px);
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: transparent;
    background: linear-gradient(180deg, #fff0ad 0%, #e2b95d 30%, #a96820 63%, #f0ce75 100%);
    background-clip: text;
    -webkit-background-clip: text;
    filter: drop-shadow(0 1px 0 #3f2108);
  }

  .toolbar-btn:hover {
    filter: brightness(1.12);
    transform: translateY(-1px);
  }
  .toolbar-btn:active {
    filter: brightness(0.9);
    transform: translateY(1px);
  }

  .toolbar-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
`
