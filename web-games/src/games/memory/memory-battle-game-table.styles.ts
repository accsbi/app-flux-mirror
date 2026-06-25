import { css } from 'lit'
import { STAGE_HEIGHT, STAGE_WIDTH } from '../../shared/ui/styles/stage-layout'
import { appFontFamily } from '../../shared/ui/styles/fonts'

export const memoryBattleGameTableStyles = css`
  :host {
    display: block;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(90deg, #060a0b 0%, #122126 25%, #122126 75%, #060a0b 100%);
    color: #eef4f9;
    font-family: ${appFontFamily};
  }

  .game-shell {
    width: 100%;
    height: 100%;
    display: block;
    overflow: hidden;
  }

  .stage {
    position: absolute;
    left: 0;
    top: 0;
    width: ${STAGE_WIDTH}px;
    height: var(--stage-logical-height, ${STAGE_HEIGHT}px);
    /* ヘッダー/ステータスの実高さに依存せず、stage-body を残り全部へ広げる縦flex。
       これで枠下端が常にフッター(Feedback)直前まで届く。 */
    display: flex;
    flex-direction: column;
    transform: translate(var(--stage-offset-left, 0px), var(--stage-offset-top, 0px))
      scale(var(--game-scale, 1));
    transform-origin: top left;
    background:
      linear-gradient(180deg, rgba(7, 34, 23, 0.2), rgba(7, 34, 23, 0.3)),
      #163138;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    overflow: hidden;
    contain: layout paint;
  }

  .battle-trace-panel {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 52px;
    max-height: 128px;
    overflow: auto;
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    box-sizing: border-box;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(3, 18, 16, 0.78);
    color: #eafff3;
    font-size: 12px;
    line-height: 1.35;
    text-align: left;
    z-index: 45;
    white-space: normal;
  }

  .battle-trace-panel strong {
    color: #fff7c2;
    font-size: 13px;
  }

  .trace-line.is-match {
    color: #ff7b7b;
    font-weight: 900;
    text-shadow: 0 0 10px rgba(255, 42, 42, 0.45);
  }

  .primary-btn,
  .secondary-btn {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    color: #f4fbff;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }

  /* ヘッダー(game-top-header)・ステータス・フッターの左右インセットを card 系(.table)と統一。
     High&Low 基準=8px。これが無いとヘッダーだけ端まで広がり、ステータス/フッターと不揃いになる。 */
  .stage > game-top-header {
    display: block;
    box-sizing: border-box;
    padding: 4px 8px 0;
    /* BG-1: BET 中も暗幕(.bet-overlay z-index:26)より前面でヘッダーを押せるように。手本=old-maid。 */
    position: relative;
    z-index: 40;
  }

  /* BG-1: bet-overlay の暗幕はクリックを通し、BET パネル自身だけ操作可にする。 */
  .bet-overlay {
    pointer-events: none;
  }
  .bet-overlay bet-selector-panel {
    pointer-events: auto;
  }

  /* GD-2: ガイド/設定表示中はヘッダー/ステータス/フッターを非表示（BG-1 の z-index:40 がモーダルに乗る回帰の解消）。 */
  .stage.chrome-off > game-top-header,
  .stage.chrome-off .status-strip,
  .stage.chrome-off .region-footer {
    display: none;
  }

  /* ステータスは他ゲームと統一した共有 .bet-status（COIN/BET/STAGE）＋右端に敵サムネ。
     flex 1 行で固定し、要素が増えても折り返さない（＝盤面が下に押し出されるスクロール防止）。 */
  .status-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    padding: 0 8px 2px;
  }
  .status-strip .bet-status {
    flex: 1 1 auto;
    min-width: 0;
    padding-bottom: 0;
  }
  .status-copy {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    color: #d5e8dc;
    width: 100%;
    text-align: left;
  }

  /* 敵情報オーバーレイ（ふわっと表示・✕/背景タップで閉じる）。 */
  .enemy-info-overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(5, 10, 11, 0.72);
    animation: enemyInfoFade 0.18s ease-out;
  }
  @keyframes enemyInfoFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .enemy-info-card {
    position: relative;
    width: min(92%, 440px);
    max-height: 88vh;
    overflow-y: auto;
    animation: enemyInfoPop 0.2s ease-out;
  }
  @keyframes enemyInfoPop {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .enemy-info-close {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(8, 18, 20, 0.85);
    color: #f2f6f7;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
  }

  .stage-body {
    /* .stage が縦flexなので、ヘッダー/ステータスの下の残り高さを全部使う。
       下padding 55px = フッター領域56px(下8px・上pad込み)の Feedback ボタン上端(= H-52px)の
       3px 上まで枠を伸ばす。これで枠はボタン直前まで届きつつ接触しない。 */
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 10px 55px;
    box-sizing: border-box;
    display: grid;
    align-items: start;
  }

  .stage-body > .content-card,
  .stage-body > .battle-panel {
    min-height: 100%;
    align-self: stretch;
  }

  .region-footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    /* Feedback ボタンの左右インセット(8px)・下余白(pad-bottom 既定4px)を card 系フッターと統一。
       card 系は .table(padding 0 8px)+ footer pad-bottom 4px。Memory も同値に揃える。
       高さも card 系(blackjack/high-low の region-footer = stage 高の 8%)に統一。
       absolute なので 8% は位置決め祖先 .stage の高さ基準＝card 系と同値。 */
    height: 8%;
    padding: 0 8px;
    box-sizing: border-box;
    display: grid;
    align-items: end;
    /* BG-1: BET 中も暗幕より前面でフッター(FEEDBACK)を押せるように。手本=old-maid。 */
    z-index: 40;
  }

  .content-card,
  .battle-panel {
    width: 100%;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(7, 24, 18, 0.52);
    box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(10px);
    padding: 20px 18px;
    box-sizing: border-box;
  }

  .decision-card {
    display: grid;
    grid-template-rows: auto auto auto auto;
    align-items: start;
    align-content: start;
    gap: 12px;
  }

  .draw-battle-card {
    gap: 8px;
    padding-top: 28px;
  }

  .turn-select-card {
    grid-template-rows: auto minmax(56px, 1fr) auto;
    gap: 0;
  }

  .decision-copy-block {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .draw-battle-card .decision-copy-block {
    gap: 12px;
  }

  .decision-status-block {
    min-height: 56px;
    display: grid;
    align-items: start;
  }

  .decision-status-copy {
    text-align: center;
    justify-self: center;
  }

  .decision-actions {
    align-self: end;
  }

  .decision-spacer {
    min-height: 56px;
  }

  .center-card {
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 12px;
    text-align: center;
  }

  .result-card {
    grid-template-rows: auto auto auto;
    align-content: start;
    justify-items: stretch;
    gap: 0;
  }

  .result-card h2,
  .result-card p {
    width: 100%;
    text-align: left;
    justify-self: stretch;
  }

  /* 練習結果は画像バナーが無く全部テキスト（タイトル/要約/メッセージ/ボタン）。勝敗結果用の
     .result-card は gap:0 のため、そのままだと文字が詰まる。練習結果だけ：
       ・要素間に均等な余白（gap）
       ・カード枠(壁)に文字/ボタンが密着しないよう左右にしっかり余白（padding）
       ・文字は左寄せのまま（中央寄せにしない）／上から並べる
     にして整える（勝敗結果には不干渉）。 */
  .result-card--practice {
    align-content: start;
    gap: 16px;
    padding: 24px;
  }

  .result-card--practice h2 {
    line-height: 1.35;
  }

  .result-card--practice p {
    line-height: 1.6;
  }

  .result-card--practice .stack-actions {
    margin-top: 8px;
  }

  .result-media {
    min-height: 168px;
    display: grid;
    align-items: end;
    justify-items: center;
    padding-top: 8px;
  }

  .result-copy-block {
    display: grid;
    gap: 8px;
    align-content: start;
    padding-top: 16px;
  }

  .result-title-text {
    align-self: center;
    text-align: center !important;
    font-size: 56px !important;
    line-height: 1;
    color: #fff04a;
    text-shadow:
      0 0 10px rgba(255, 240, 74, 0.95),
      0 0 20px rgba(255, 240, 74, 0.5),
      0 10px 18px rgba(0, 0, 0, 0.45);
  }

  .result-spacer {
    min-height: 56px;
  }

  .result-actions {
    align-self: start;
    padding-top: 0;
  }

  .stage-select-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: calc(10px * var(--stage-height-ratio, 1));
  }

  .stage-select-btn {
    min-height: calc(84px * var(--stage-height-ratio, 1));
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(8, 24, 20, 0.62);
    color: #f4fbff;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 10px 8px 16px;
    font-size: clamp(14px, calc(18px * var(--stage-height-ratio, 1)), 20px);
    font-weight: 800;
    text-align: left;
  }

  /* 解放済みステージ＝青系クラシック（濃紺×金）。他ゲームの操作ボタンと色を統一。 */
  .stage-select-btn.is-unlocked {
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, #15233a 0%, #0c1d34 40%, #06101f 100%);
    color: #f4cf7a;
    border: 2px solid #b9933c;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  }

  .stage-select-btn.is-locked {
    background: rgba(9, 16, 18, 0.62);
    color: rgba(244, 251, 255, 0.42);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .stage-select-btn:disabled {
    cursor: default;
  }

  .stage-select-btn--practice {
    grid-column: 1 / -1;
    min-height: calc(76px * var(--stage-height-ratio, 1));
  }

  .stage-select-btn--practice .stage-select-main {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .stage-select-btn--practice .stage-select-copy {
    width: 100%;
    justify-items: center;
  }

  .stage-select-btn--practice .stage-select-label {
    width: 100%;
    font-size: clamp(18px, calc(24px * var(--stage-height-ratio, 1)), 32px);
    text-align: center;
  }

  .stage-select-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) min(calc(56px * var(--stage-height-ratio, 1)), 68px);
    align-items: center;
    column-gap: 10px;
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .stage-select-main--practice {
    grid-template-columns: 1fr;
  }

  .stage-select-label {
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* ステージ番号の下に敵名（村人 等）。小さめ・1行。 */
  .stage-select-enemy-name {
    font-size: clamp(11px, calc(13px * var(--stage-height-ratio, 1)), 15px);
    font-weight: 700;
    line-height: 1.1;
    opacity: 0.92;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .stage-select-copy {
    min-width: 0;
    display: grid;
    justify-items: start;
    align-content: center;
    gap: 8px;
  }

  .stage-select-clear-row {
    width: 100%;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .stage-clear-badge {
    font-size: 12px;
    line-height: 1;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255, 245, 139, 0.18);
    color: #fff7c2;
  }

  .stage-select-thumb {
    width: min(calc(56px * var(--stage-height-ratio, 1)), 68px);
    height: min(calc(56px * var(--stage-height-ratio, 1)), 68px);
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    flex: 0 0 min(calc(56px * var(--stage-height-ratio, 1)), 68px);
  }

  .stage-select-thumb.is-locked-thumb {
    opacity: 0.55;
    filter: saturate(0.75);
  }

  .stage-select-placeholder {
    min-height: 24px;
  }

  .practice-select-block {
    width: 100%;
    display: grid;
    gap: 8px;
    text-align: left;
  }

  .practice-select-label {
    font-size: 18px;
    font-weight: 800;
    color: #f4fbff;
  }

  .practice-select {
    width: 100%;
    min-height: 56px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(8, 24, 20, 0.72);
    color: #f4fbff;
    font-size: 20px;
    font-weight: 700;
    padding: 0 16px;
    box-sizing: border-box;
  }

  .content-card h1,
  .content-card h2,
  .content-card p {
    margin: 0;
  }

  .content-card h1,
  .content-card h2 {
    font-size: 32px;
    line-height: 1.15;
  }

  .content-card p {
    font-size: 20px;
    line-height: 1.45;
    white-space: pre-line;
  }

  /* 練習セットアップの注意（COIN は使わない）。本文より一段控えめに。 */
  .practice-coin-note {
    font-size: 16px;
    color: #ffe08a;
    opacity: 0.85;
  }

  .enemy-name {
    font-size: 26px;
    font-weight: 800;
    color: #fff6b5;
  }

  .enemy-profile-block {
    width: 100%;
    justify-self: stretch;
  }

  .enemy-profile {
    width: 100%;
    text-align: left;
    justify-self: stretch;
  }

  /* 色付き背景の正方形画像を枠いっぱいにきれいに収める（余白なし・角丸クリップ・cover）。 */
  .enemy-portrait-wrap {
    width: min(100%, 280px);
    border-radius: 18px;
    border: 2px solid rgba(220, 203, 66, 0.55);
    overflow: hidden;
    padding: 0;
    box-sizing: border-box;
    box-shadow: 0 14px 22px rgba(0, 0, 0, 0.34);
  }

  .enemy-portrait {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  .primary-btn,
  .secondary-btn {
    min-height: 76px;
    font-size: 22px;
    padding: 0 20px;
    width: 100%;
  }

  /* Web版（タブレット以上）では少し小さめでOK */
  @media (min-width: 768px) {
    .primary-btn,
    .secondary-btn {
      min-height: 68px;
    }
  }

  /* 決定系=青系クラシック（濃紺×金・外枠1本線）。OK/Start/Next/Continue/Retry/先攻後攻 等。 */
  .primary-btn {
    border: 2px solid #b9933c;
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, #15233a 0%, #0c1d34 40%, #06101f 100%);
    color: #f4cf7a;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    text-shadow: 0 1px 0 #05101d;
    box-shadow: 0 2px 0 #04101d, 0 4px 8px rgb(0 0 0 / 40%);
  }

  .primary-btn:hover:not(:disabled) {
    filter: brightness(1.16);
    box-shadow: 0 2px 0 #04101d, 0 4px 10px rgb(0 0 0 / 40%), 0 0 14px rgb(244 207 122 / 45%);
  }

  .primary-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* 副ボタン=緑系クラシック（金×緑・外枠1本線）。戻る/メニュー等。 */
  .secondary-btn {
    border: 2px solid #b77a28;
    background:
      radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / 6%), transparent 50%),
      linear-gradient(180deg, #173a27 0%, #092719 38%, #03150d 100%);
    color: #f4cf7a;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    text-shadow: 0 1px 0 #3f2108;
    box-shadow: 0 2px 0 #2c1806, 0 4px 8px rgb(0 0 0 / 40%);
  }

  .secondary-btn:hover {
    filter: brightness(1.12);
  }

  .stack-actions {
    width: 100%;
    display: grid;
    gap: 16px;
  }

  /* 報酬（報酬:×倍率）＋「報酬について？」ヘルプを横並び・中央。 */
  .enemy-reward-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0;
  }
  .enemy-reward-value {
    font-size: 24px;
    font-weight: 800;
    color: #ffd730;
    white-space: nowrap;
  }
  .reward-help-btn {
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.3);
    color: #f4cf7a;
    font-size: 15px;
    line-height: 1;
    border-radius: 999px;
    padding: 8px 16px;
    cursor: pointer;
  }
  .reward-help-btn:hover {
    filter: brightness(1.15);
  }
  .reward-help-mult {
    font-weight: 800;
    color: #ffd730;
  }

  /* BET ボタン（金枠の決定系。スタートバトルの直前に置く）。 */
  .bet-cta-btn {
    width: 100%;
    min-height: 76px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.04em;
    border: 2px solid #dccb42;
    border-radius: 12px;
    background: linear-gradient(180deg, #a06a34, #5e3818);
    color: #ffe9b0;
    font-family: "Cinzel", "Times New Roman", Georgia, serif;
    cursor: pointer;
    box-shadow: 0 2px 0 #2c1806, 0 4px 8px rgb(0 0 0 / 40%);
  }
  .bet-cta-btn:hover {
    filter: brightness(1.12);
  }
  .bet-cta-btn.is-placed {
    background: linear-gradient(180deg, #2c6f3a, #14411f);
    color: #d8ffcf;
  }


  .stack-actions.is-reserved {
    visibility: hidden;
    pointer-events: none;
  }

  .result-banner {
    width: min(280px, 100%);
    margin: 0 auto;
  }

  .result-banner img {
    display: block;
    width: 100%;
    height: auto;
    filter:
      drop-shadow(0 0 12px rgba(255, 235, 150, 0.95))
      drop-shadow(0 0 24px rgba(255, 235, 150, 0.55))
      drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
  }

  .result-message {
    min-height: 56px;
    display: grid;
    align-items: center;
  }

  .draw-battle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 20px 0 0;
  }

  .draw-card-panel {
    display: grid;
    justify-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 700;
  }

  .draw-card-owner {
    min-height: 32px;
    display: grid;
    place-items: center;
    line-height: 1.1;
    color: #f4fbff;
  }

  .draw-card-owner.is-placeholder {
    visibility: hidden;
  }

  .draw-card-button {
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    transition: transform 180ms ease, filter 180ms ease;
  }

  .draw-card-button:disabled {
    cursor: default;
  }

  .draw-card-button.is-winner {
    filter: drop-shadow(0 0 18px rgba(255, 228, 120, 0.85));
  }

  .draw-card {
    width: 120px;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.4));
  }

  .draw-battle-card .status-copy,
  .turn-select-card .status-copy,
  .decision-copy-block p {
    line-height: 1.6;
  }

  .draw-battle-card .decision-status-block {
    min-height: 40px;
  }

  .draw-battle-card .draw-battle-actions {
    min-height: 142px;
    align-self: start;
  }

  .battle-panel {
    display: grid;
    /* ヘッダー行は敵ポートレート(大)を収める高さ。カードと重ならないようにする。 */
    grid-template-rows: 100px minmax(0, 1fr);
    align-content: start;
    gap: 0;
    /* 上 padding を詰めてカード領域(20枚=5行)の高さを最大化＝スクロール抑止。 */
    padding: 2px 8px 4px;
    overflow: hidden;
  }

  .battle-fixed-head {
    width: min(100%, 470px);
    min-height: 48px;
    margin: 8px auto 0;
  }

  .score-row {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 12px;
  }

  /* 敵（村人）ポートレートを CPU スコアの隣＝行の右端に大きく表示（タップで敵情報）。
     Give Up と YOU/CPU は左寄せのまま、ポートレートは margin-left:auto で右へ寄せる。 */
  /* 敵キャラ（色付き背景の正方形画像）を四角の枠いっぱいにきれいに収める。
     余白なし・角丸クリップ・cover でフレームを埋める（透過にはしない＝画像の色背景をそのまま使う）。 */
  .battle-enemy-portrait {
    flex: 0 0 auto;
    padding: 0;
    border: 2px solid rgba(220, 203, 66, 0.6);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    line-height: 0;
    display: block;
    box-sizing: border-box;
  }
  .battle-enemy-portrait img {
    display: block;
    width: 88px;
    height: 88px;
    object-fit: cover;
  }
  .battle-enemy-portrait.is-active {
    border-color: rgba(255, 221, 120, 0.95);
    box-shadow: 0 0 12px rgba(255, 221, 120, 0.5);
  }

  .score-row.is-practice {
    justify-content: center;
  }

  .score-board {
    display: grid;
    grid-template-columns: 95px 32px 95px;
    align-items: center;
    column-gap: 8px;
    flex: 0 0 auto;
  }

  .quit-battle-btn {
    width: 96px;
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 12px;
    white-space: nowrap;
    border: 1px solid #b77a28;
    border-radius: 999px;
    background: linear-gradient(180deg, #173a27, #092719);
    color: #f4cf7a;
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.22);
    justify-self: start;
  }

  .score-row.is-practice .quit-battle-btn {
    width: 148px;
    min-height: 36px;
    font-size: 14px;
    justify-self: center;
  }

  .score-pill {
    width: 95px;
    min-height: 30px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(8, 24, 20, 0.56);
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }
  /* 手番側のスコア（あなた N / CPU N）も矢印と一緒に光らせる。 */
  .score-pill.is-active {
    color: #fffde1;
    border-color: rgba(255, 228, 84, 0.85);
    box-shadow:
      0 0 10px rgba(255, 228, 84, 0.55),
      inset 0 0 8px rgba(255, 228, 84, 0.25);
  }

  .turn-arrow {
    min-height: 30px;
    display: grid;
    place-items: center;
    font-size: 24px;
    font-weight: 900;
    color: rgba(236, 247, 255, 0.5);
    transition: color 120ms ease, filter 120ms ease;
  }

  .turn-arrow.is-player-turn,
  .turn-arrow.is-cpu-turn {
    color: #fffde1;
    filter:
      drop-shadow(0 0 10px rgba(255, 228, 84, 0.95))
      drop-shadow(0 0 20px rgba(255, 228, 84, 0.55));
  }

  .battle-status {
    min-height: 20px;
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    color: #f4fbff;
    padding: 1px 8px;
    justify-self: center;
  }

  .card-grid-area {
    position: relative;
    min-height: 0;
    display: grid;
    align-items: start;
    box-sizing: border-box;
    /* 枠を広げてもスマホの小さい画面では20枚が収まり切らないことがあるため、
       はみ出した分はこの枠内でスクロールさせる(横は固定)。 */
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .deal-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 20;
  }

  .deal-overlay-image {
    width: min(70%, 360px);
    height: auto;
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
    animation: deal-overlay-pop 0.28s ease-out;
  }

  @keyframes deal-overlay-pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: min(100%, calc(420px * var(--stage-height-ratio, 1)));
    margin: 0 auto;
    column-gap: calc(7px * var(--stage-height-ratio, 1));
    row-gap: calc(5px * var(--stage-height-ratio, 1));
    justify-content: center;
    align-content: start;
    align-items: start;
  }

  .memory-card {
    aspect-ratio: 0.78;
    border: 0;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }

  .memory-card img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.36));
  }

  .memory-card.matched {
    visibility: hidden;
    pointer-events: none;
  }

  /* .overlay / .modal は shared-game-ui-styles.ts の sharedOverlayStyles に集約（唯一の正）。
     ここでは再定義しない。 */

  .match-banner {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(280px, calc(100% - 60px));
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 40;
  }

  .match-banner img {
    display: block;
    width: 100%;
    height: auto;
    filter:
      drop-shadow(0 0 12px rgba(255, 235, 150, 0.95))
      drop-shadow(0 0 24px rgba(255, 235, 150, 0.55))
      drop-shadow(0 12px 24px rgba(0, 0, 0, 0.4));
  }

  /* フィードバックのダイアログ／スタイルは共通部品 <game-feedback> 側に集約。 */
`
