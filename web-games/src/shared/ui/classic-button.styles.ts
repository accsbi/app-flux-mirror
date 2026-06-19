import { css } from 'lit'

// クラシック（金×緑）ボタンの共通スタイル＝唯一の基準。ヘッダー/フッターのツールバーと同じ見た目で
// 「外枠1本線のみ（多重インセットなし）」。設定・ガイド・各種ダイアログの茶系ボタンをこれに統一する。
// 使い方: 各コンポーネントの static styles 配列の最後に classicButtonStyles を入れ（＝brownに勝つ）、
// 対象 <button> に class="classic-btn" を足す。サイズ(min-height/padding/font-size)は各ボタン側の既存指定を尊重。
export const classicButtonStyles = css`
  .classic-btn {
    --gold-light: #f4cf7a;
    --gold-main: #b77a28;
    --green-light: #173a27;
    --green-main: #092719;
    --green-dark: #03150d;

    border: 2px solid var(--gold-main);
    border-radius: 999px;
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, var(--green-light) 0%, var(--green-main) 38%, var(--green-dark) 100%);
    color: var(--gold-light);
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    font-weight: 700;
    text-shadow: 0 1px 0 #3f2108;
    box-shadow: 0 2px 0 #2c1806, 0 4px 8px rgb(0 0 0 / 40%);
    cursor: pointer;
    transition: transform 150ms ease, filter 150ms ease;
  }
  .classic-btn:hover {
    filter: brightness(1.12);
    transform: translateY(-1px);
  }
  .classic-btn:active {
    filter: brightness(0.9);
    transform: translateY(1px);
  }
  /* トグル等の「選択中」は金フィル＝はっきり区別（未選択は緑のまま）。 */
  .classic-btn.active,
  .classic-btn.is-active {
    background: linear-gradient(180deg, #fff0ad 0%, #e2b95d 35%, #b77a28 100%);
    border-color: #4e2d09;
    color: #2a1602;
    text-shadow: none;
  }
`

// 青系（濃紺×金・外枠1本線）のクラシック。カタログ(/ja/)の濃紺フェルト(--green-house #0c1d34)＋金に合わせた
// 「操作ボタン」用。盤面の HIT/STAND・DRAW/SUBMIT・DEAL/CONTINUE と Home確認の OK/キャンセルに使う。
export const classicBlueButtonStyles = css`
  .classic-btn-blue {
    border: 2px solid #b9933c;
    border-radius: 999px;
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, #15233a 0%, #0c1d34 40%, #06101f 100%);
    color: #f4cf7a;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    font-weight: 700;
    text-shadow: 0 1px 0 #05101d;
    box-shadow: 0 2px 0 #04101d, 0 4px 8px rgb(0 0 0 / 40%);
    cursor: pointer;
    /* transform は使わない（中央寄せ transform:translateX(-50%) のボタンがズレるバグの原因）。
       他ボタンと同じく「動かさず・少し光る」だけにする。 */
    transition: filter 150ms ease, box-shadow 150ms ease;
  }
  .classic-btn-blue:hover:not(:disabled) {
    filter: brightness(1.16);
    box-shadow: 0 2px 0 #04101d, 0 4px 10px rgb(0 0 0 / 40%), 0 0 14px rgb(244 207 122 / 45%);
  }
  .classic-btn-blue:active:not(:disabled) {
    filter: brightness(0.92);
  }
  .classic-btn-blue:disabled {
    opacity: 0.45;
    cursor: default;
  }
`

// 盤面のベア <button>（HIT/STAND/DEAL/CONTINUE/SUBMIT/ALL DRAW 等）を青系クラシックにする上書き。
// 各ゲームの static styles 配列の最後に入れる＝既存の茶系 button 規則を要素セレクタの順序で上書き。
// サイズ(min-width/height/font-size)は各ゲームの既存 button 規則を尊重（ここでは見た目だけ上書き）。
// class 付きボタン(.bet-adjust-btn 等)は specificity が高く影響しない。
export const classicBlueActionButtonStyles = css`
  /* ベア button に加え、各ゲームが操作ボタンに使う .actions-row button / .tie-choice-panel button
     (specificity 0,1,1) も同じ指定で上書き（配列の最後に置くので同特異性なら順序で勝つ）。 */
  button,
  .actions-row button,
  .tie-choice-panel button {
    border: 2px solid #b9933c;
    border-radius: 999px;
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, #15233a 0%, #0c1d34 40%, #06101f 100%);
    color: #f4cf7a;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    text-shadow: 0 1px 0 #05101d;
    box-shadow: 0 2px 0 #04101d, 0 4px 8px rgb(0 0 0 / 40%);
    transition: filter 150ms ease, box-shadow 150ms ease;
  }
  /* hover は「動かさず・少し光る」だけ（transform 不使用＝ズレ防止）。 */
  button:hover:not(:disabled),
  .actions-row button:hover:not(:disabled),
  .tie-choice-panel button:hover:not(:disabled) {
    filter: brightness(1.16);
    box-shadow: 0 2px 0 #04101d, 0 4px 10px rgb(0 0 0 / 40%), 0 0 14px rgb(244 207 122 / 45%);
  }
`
