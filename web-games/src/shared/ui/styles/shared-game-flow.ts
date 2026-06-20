import { css } from 'lit'
import { DEFAULT_SHARED_COIN, saveSharedCoin } from '../../infra/shared-coin-store'

export const NO_MORE_BETS_DELAY_MS = 120
export const NO_MORE_BETS_VISIBLE_MS = 780
export const NO_MORE_BETS_EFFECT_NAME = 'no_more_beds'

type ScheduleTimer = (callback: () => void, delayMs: number) => void

type NoMoreBetSequenceParams = {
  schedule: ScheduleTimer
  setVisible: (visible: boolean) => void
  playEffect: (name: string) => void
  onComplete: () => void
}

export function runNoMoreBetSequence(params: NoMoreBetSequenceParams): void {
  const { schedule, setVisible, playEffect, onComplete } = params
  schedule(() => {
    setVisible(true)
    playEffect(NO_MORE_BETS_EFFECT_NAME)
  }, NO_MORE_BETS_DELAY_MS)
  schedule(() => {
    setVisible(false)
    onComplete()
  }, NO_MORE_BETS_DELAY_MS + NO_MORE_BETS_VISIBLE_MS)
}

export const sharedNoMoreBetStyles = css`
  /* 「No More Bets」は .table(高さ可変)ではなく、可視ステージ全体(.stage)の中央に出す。
     .stage は transform/contain を持つので position:fixed の包含ブロックは .stage になり、
     端末(viewport)に依らず常にステージ中央＋ステージと同じ倍率でスケールする（vw/固定px非依存）。
     ※ .table 基準(absolute)だと、端末で変わる表の高さに引きずられてスマホで中央がズレていた。 */
  .no-more-bet {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 4;
  }

  /* サイズは全ゲーム共通（単一ソース）。casino-war で調整した大きさに統一。 */
  .no-more-bet-image {
    display: block;
    width: min(96%, 460px);
    max-width: 100%;
    height: auto;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
  }
`

export const sharedResultOverlayStyles = css`
  /* WIN / LOSE / TIE の既定サイズ（blackjack 用＝控えめ。手札の数字が隠れない大きさ）。
     casino-war は1枚勝負で大きく見せたいので、casino-war 側のローカルで上書きする。 */
  .result-overlay-image {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(280px, 68%);
    max-height: 96px;
    height: auto;
    object-fit: contain;
    z-index: 4;
    pointer-events: none;
  }

  .result-overlay-image.is-tie {
    width: min(320px, 76%);
    max-height: 108px;
  }
`

export const COIN_RECOVERY_DIALOG_DELAY_MS = 1000

type ScheduleCoinRecoveryDialogParams = {
  coin: number
  setOpen: (open: boolean) => void
  schedule: (callback: () => void, delayMs: number) => number
  delayMs?: number
}

export function scheduleCoinRecoveryDialogIfZero(params: ScheduleCoinRecoveryDialogParams): number | null {
  const { coin, setOpen, schedule, delayMs = COIN_RECOVERY_DIALOG_DELAY_MS } = params
  if (coin > 0) {
    return null
  }
  return schedule(() => {
    setOpen(true)
  }, delayMs)
}

export function recoverSharedCoin(): number {
  return saveSharedCoin(DEFAULT_SHARED_COIN)
}
