import { css } from 'lit'

/**
 * メニューの見た目の唯一の基準（3in1 ハブ = playingcardshub の値）。
 * ハブ(casino-games-hub-app)と各ゲーム(standalone-game-menu)の双方がこれを参照する。
 * ここを変えれば全メニューが一括で変わる。各コンポーネントでこれらのクラスを再定義しないこと
 * （= ソースの使い回し・二重定義は禁止。単一ソース）。
 * card/hero/buttons の体裁のみを規定。ヘッダー内の構成（戻る/コイン/タイトル）は各コンポーネント側。
 */
export const menuBaseStyles = css`
  .menu-layout {
    height: calc(100% - 36px);
    width: 100%;
    display: grid;
    place-items: center;
    padding: 8px;
    box-sizing: border-box;
    position: relative;
  }

  .menu-card {
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    text-align: center;
    padding: 16px 16px 24px;
    box-sizing: border-box;
    margin: 0;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(9, 22, 24, 0.52);
    box-shadow: none;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
  }

  /* メニュータイトル（h1）も基準=3in1の値で単一ソース化。
     各コンポーネントで .menu-header h1 等を再定義しないこと。
     クラシック感に合わせフォントは Cinzel（全ゲーム共通。Cinzel は ensureClassicFont で読込済み）。 */
  h1 {
    margin: 0;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.01em;
    color: #f2f6f7;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 枠は feat 画像(1024x500=2.048:1)と同じ縦横比にし、レターボックス無し＝角丸が綺麗に出る。
     画像比率と枠比率が一致するので cover でも左右が切れない。 */
  .feature-wrap {
    width: min(496px, 100%);
    aspect-ratio: 1024 / 500;
    height: auto;
    margin: 0 auto 16px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
    display: block;
    background: transparent;
  }

  /* 枠を埋めて角丸を綺麗に見せる（比率一致なので切れない）。 */
  .feature-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 20px;
  }

  .menu-buttons {
    display: grid;
    grid-auto-rows: minmax(72px, auto);
    align-content: start;
    gap: 16px;
    width: min(496px, 100%);
    max-width: 100%;
    margin: 16px auto 0;
    padding-top: 8px;
    box-sizing: border-box;
  }

  /* クラシック（金×緑）ボタン。全ゲーム共通＝ここが唯一の基準。
     START / Guide / Settings / Details(news) すべてこのクラスを使う。 */
  .menu-btn {
    --gold-light: #f4cf7a;
    --gold-main: #b77a28;
    --gold-dark: #4e2d09;
    /* 深緑系(08): #153523 → #07170f */
    --green-light: #153523;
    --green-main: #0d2417;
    --green-dark: #07170f;

    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 100%;
    min-height: 72px;
    padding: 12px 28px;
    box-sizing: border-box;

    color: var(--gold-light);
    text-decoration: none;

    /* 外枠1本線のみ（多重インセット枠は廃止）＝ツールバー/classic-btn と統一。 */
    border: 2px solid var(--gold-main);
    border-radius: 999px;

    background:
      radial-gradient(ellipse at 50% 20%, rgb(255 255 255 / 7%), transparent 48%),
      linear-gradient(180deg, var(--green-light) 0%, var(--green-main) 38%, var(--green-dark) 100%);

    box-shadow:
      0 3px 0 #07140d,
      0 6px 12px rgb(0 0 0 / 45%),
      inset 0 2px 1px rgb(255 255 255 / 6%);

    cursor: pointer;
    transition: transform 150ms ease, filter 150ms ease, box-shadow 150ms ease;
  }

  /* ボタンのラベルは金グラデの文字（背景クリップ）。ラベルは必ず span.menu-btn-text で包む。 */
  .menu-btn-text {
    position: relative;
    z-index: 2;
    display: block;
    max-width: 100%;
    text-align: center;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    font-size: clamp(22px, 4.6vw, 32px);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    color: transparent;
    background: linear-gradient(180deg, #fff0ad 0%, #e2b95d 30%, #a96820 63%, #f0ce75 100%);
    background-clip: text;
    -webkit-background-clip: text;
    filter: drop-shadow(0 2px 0 #3f2108);
  }

  .menu-btn:hover {
    filter: brightness(1.12);
    transform: translateY(-2px);
  }
  .menu-btn:active {
    filter: brightness(0.9);
    transform: translateY(2px);
  }
  .menu-btn:focus-visible {
    outline: 3px solid #f4cf7a;
    outline-offset: 5px;
  }

  @media (max-width: 420px), (max-height: 740px) {
    .menu-layout {
      padding: 8px;
    }
    .menu-buttons {
      gap: 12px;
    }
    .menu-btn {
      min-height: 64px;
      padding: 10px 20px;
    }
    .menu-btn-text {
      font-size: clamp(20px, 6vw, 28px);
    }
  }
`
