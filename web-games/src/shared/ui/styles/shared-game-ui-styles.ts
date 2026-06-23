import { css } from 'lit'

export const sharedOverlayStyles = css`
  /* 設定/ガイド等のモーダル枠（全ゲーム共通の唯一の正・Memory 基準に統一）。
     ここを変えると blackjack/poker/casino-war/memory/high-low すべてに反映される。 */
  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(5, 10, 11, 0.78);
    display: grid;
    place-items: center;
    padding: 12px;
    box-sizing: border-box;
    overflow: auto;
    z-index: 30;
  }

  .modal {
    width: min(100%, 680px);
    max-height: calc(100% - 24px);
    overflow: auto;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(10, 23, 25, 0.98);
    padding: 14px;
    box-sizing: border-box;
  }

  .modal h3,
  .modal p {
    margin: 0;
    line-height: 1.5;
  }

  .confirm-overlay {
    z-index: 35;
  }

  .bet-overlay {
    z-index: 26;
    background: rgba(6, 10, 11, 0.76);
    /* 上部の紋章/アーチ（bet-selector-panel の Classic 装飾）が切れないよう余白を確保。 */
    padding: 56px 12px 16px;
  }
`

export const sharedBetStatusStyles = css`
  .bet-status {
    /* アイコン(SVG)＋テキストを 1 行に並べる。grid だと SVG とテキストが
       別セルに入って改行されるため flex 横並びにする。 */
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    gap: 0.3em;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    padding: 2px 8px 6px;
    white-space: nowrap;
    text-align: center;
  }
`

export const sharedCoinRecoveryStyles = css`
  .coin-recovery-modal {
    width: min(90%, 460px);
    display: grid;
    gap: 10px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.22);
    border-radius: 14px;
    background: rgba(10, 23, 25, 0.95);
  }

  .coin-recovery-modal h3 {
    margin: 0;
    font-size: 30px;
    color: #f2e8a2;
  }

  .coin-recovery-modal p {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #f2f6f7;
    line-height: 1.35;
  }

  .recovery-ok-btn {
    min-height: 64px;
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.28);
    background: linear-gradient(180deg, #a06a34, #5e3818);
    color: #f4fbff;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.08em;
    cursor: pointer;
  }

  /* Web版（タブレット以上）では少し小さめでOK */
  @media (min-width: 768px) {
    .recovery-ok-btn {
      min-height: 56px;
    }
  }
`

export const sharedResultBannerStyles = css`
  .status-headline {
    min-height: 34px;
    margin: 0;
    color: #ffd730;
    font-size: 24px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: 0.02em;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    text-shadow:
      0 0 8px rgba(255, 222, 74, 0.85),
      0 0 18px rgba(255, 206, 35, 0.75),
      0 3px 8px rgba(0, 0, 0, 0.5);
  }

  .status-headline.placeholder {
    opacity: 0;
    pointer-events: none;
  }

  .hand-role-banner {
    min-height: 56px;
    margin: 0;
    color: #ffd730;
    font-size: 42px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: 0.02em;
    text-shadow:
      0 0 8px rgba(255, 222, 74, 0.85),
      0 0 18px rgba(255, 206, 35, 0.75),
      0 3px 8px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  .hand-role-banner.placeholder {
    opacity: 0;
    pointer-events: none;
  }

  .status-headline.is-glow,
  .hand-role-banner.is-glow {
    animation: hand-role-glow 1.2s ease-in-out infinite;
  }

  @keyframes hand-role-glow {
    0% {
      text-shadow:
        0 0 6px rgba(255, 222, 74, 0.72),
        0 0 14px rgba(255, 206, 35, 0.62),
        0 3px 8px rgba(0, 0, 0, 0.5);
    }
    50% {
      text-shadow:
        0 0 12px rgba(255, 236, 120, 1),
        0 0 24px rgba(255, 216, 72, 0.92),
        0 3px 8px rgba(0, 0, 0, 0.5);
    }
    100% {
      text-shadow:
        0 0 6px rgba(255, 222, 74, 0.72),
        0 0 14px rgba(255, 206, 35, 0.62),
        0 3px 8px rgba(0, 0, 0, 0.5);
    }
  }
`
