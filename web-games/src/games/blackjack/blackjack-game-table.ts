import { LitElement, css, html } from 'lit'
import type { PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { GameEngine } from './game-engine'
import { GameResult } from '../../shared/domain/types'
import type { Card, GameState } from '../../shared/domain/types'
import { getCardScore } from '../../shared/domain/card'
import { MathRandomSource } from '../../shared/infra/random'
import { LocalStorageStatsRepository } from './stats-repository'
import { DEFAULT_SHARED_COIN, ensurePlayableSharedCoin, saveSharedCoin } from '../../shared/infra/shared-coin-store'
import { BGM_ENABLED_KEY, saveBgmEnabledSetting } from '../../shared/infra/bgm-setting'
import { SOUND_ENABLED_KEY, LANGUAGE_KEY } from '../../shared/config/storage-keys'
import { countGameForAd, WEB_AD_COUNT_KEY, peekGameCount, notifyNativeGameEnd } from '../../shared/infra/web-ad-mock'
import '../../shared/ui/panels/ad-mock-dialog'
import { getAndroidBillingBridge } from '../../shared/infra/android-billing-bridge'
import { clearPendingStake, savePendingStake, takePendingStake } from '../../shared/infra/pending-stake-store'
import { clearLocalStoragePreservingProgress } from '../../shared/infra/storage-utils'
import {
  type AppConfigRoot,
  type AppLanguage,
  getDefaultLanguage,
  getLanguageBlock,
  getLocalizedString,
  loadAppConfig,
  splitTextLines
} from '../../shared/config/app-config'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import { applyStageScale } from '../../shared/ui/styles/stage-layout'
import {
  sharedOverlayStyles,
  sharedBetStatusStyles,
  sharedCoinRecoveryStyles,
  sharedResultBannerStyles
} from '../../shared/ui/styles/shared-game-ui-styles'
import { sharedGameHostStyles, sharedGameStageStyles } from '../../shared/ui/styles/shared-game-layout-styles'
import { utilities } from '../../shared/ui/styles/utilities'
import { classicBlueActionButtonStyles } from '../../shared/ui/classic-button.styles'
import { recoverSharedCoin, runNoMoreBetSequence, scheduleCoinRecoveryDialogIfZero, sharedNoMoreBetStyles, sharedResultOverlayStyles } from '../../shared/ui/styles/shared'
import { runToolbarSizeCheck } from '../../shared/ui/chrome/toolbar-size-check'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import '../../shared/ui/chrome/game-top-header'
import { renderSettingsPanel } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'
import '../../shared/ui/panels/bet-selector-panel'
import '../../shared/ui/panels/remove-ads-dialog-panel'
import '../../shared/ui/chrome/game-footer-bar'
import '../../shared/ui/chrome/game-feedback'
import type { GameFeedback } from '../../shared/ui/chrome/game-feedback'
import { coinIcon } from '../../shared/ui/icons/coin-icon'

const DEALER_TURN_DELAY_MS = 600
const INITIAL_DEAL_START_DELAY_MS = 1000
const INITIAL_DEAL_STEP_MS = 280
const STATS_STORAGE_KEY = 'BlackjackStatsWeb'
const CARD_ASSET_REV = '20260210'
const BLACKJACK_GAME_ID = 'blackjack'
const MIN_BET = 1
// MAX_BET removed - now unlimited
const CARD_OVERLAP_MAX_PX = 150
const DEFAULT_DEMO_PLAY_COUNT = 1
const DEMO_DEFAULT_BET = 10
const DEMO_ACTION_DELAY_MS = 520
const DEMO_RECOVERY_DELAY_MS = 360

@customElement('blackjack-game-table')
export class BlackjackGameTable extends LitElement {
  private readonly engine = new GameEngine(new MathRandomSource(), new LocalStorageStatsRepository())
  private dealerTurnTimerId: number | null = null
  private dealRevealTimerIds: number[] = []
  private noMoreBetTimerIds: number[] = []
  private coinRecoveryDialogTimerId: number | null = null
  private demoActionTimerId: number | null = null
  private pendingBetStake = 0
  private isInitialized = false

  @property({ type: Boolean, attribute: 'demo-available' })
  demoAvailable = true

  @property({ type: Number, attribute: false })
  demoPlayCount = DEFAULT_DEMO_PLAY_COUNT

  @property({ type: Number, attribute: false })
  demoLaunchToken = 0

  @state()
  private gameState: GameState = this.engine.getState()

  @state()
  private isDevMode = false

  @state()
  private devHitCardNumberInput = ''

  @state()
  private isDebugDialogOpen = false

  @state()
  private debugGameCount = 0
  @state() private adMockOpen = false
  @state() private soundHelpOpen = false
  private adMockCount = 0

  @state()
  private activePanel: 'settings' | 'guide' | 'remove-ads' | null = null

  @state()
  private isSoundEnabled = true

  @state()
  private isBgmEnabled = false

  @state()
  private selectedLanguage: AppLanguage = 'en'

  @state()
  private appConfig: AppConfigRoot | null = null

  @state()
  private isInitialDealAnimating = false

  @state()
  private initialDealStep = 0

  @state()
  private confirmAction: 'clear-stats' | 'clear-cache' | 'go-home' | null = null


  @state()
  private coin = 100

  @state()
  private currentBet = 10

  @state()
  private isBetDialogOpen = true

  @state()
  private isCoinRecoveryDialogOpen = false

  @state()
  private isNoMoreBetVisible = false

  @state()
  private isStandTransitioning = false

  @state()
  private isDemoActive = false

  @state()
  private demoCompletedRounds = 0

  @state()
  private demoConfirmMode: 'start' | 'unavailable' | null = null

  connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('resize', this.updateScale)
    this.loadSettings()
    this.initializeState()
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    this.clearDealerTurnTimer()
    this.clearDealRevealTimers()
    this.clearNoMoreBetTimers()
    this.clearCoinRecoveryDialogTimer()
    this.clearDemoActionTimer()
    super.disconnectedCallback()
  }

  firstUpdated(): void {
    this.updateScale()
    requestAnimationFrame(() => runToolbarSizeCheck(this, 'blackjack'))
    void this.loadConfig()
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('demoLaunchToken') && this.demoLaunchToken > 0) {
      window.setTimeout(() => this.startDemoMode(), 0)
    }
    if (
      changedProperties.has('isDemoActive') ||
      changedProperties.has('demoCompletedRounds') ||
      changedProperties.has('isBetDialogOpen') ||
      changedProperties.has('isCoinRecoveryDialogOpen') ||
      changedProperties.has('isInitialDealAnimating') ||
      changedProperties.has('isStandTransitioning') ||
      changedProperties.has('gameState')
    ) {
      this.syncDemoProgress()
    }
  }

  private initializeState(): void {
    if (this.isInitialized) {
      return
    }
    this.isInitialized = true
    this.coin = ensurePlayableSharedCoin()
    this.restoreCoinFromPendingStakeIfNeeded()
    this.normalizeBetForCoin()
    this.isBetDialogOpen = true
  }

  private setGameState(nextState: GameState): void {
    const previousPhase = this.gameState.phase
    this.gameState = nextState
    const enteredRoundEnd = previousPhase !== 'round_end' && nextState.phase === 'round_end'
    if (!enteredRoundEnd) {
      return
    }
    if (this.isDemoActive) {
      this.demoCompletedRounds += 1
    }
    this.playRoundEndEffect(nextState.result)
    this.applyPayoutForRoundEnd()
    this.scheduleCoinRecoveryDialogIfZero()
    this.showAdMockIfNeeded()
  }

  private showAdMockIfNeeded(): void {
    if ((window as Window & { __ANDROID_APP__?: boolean }).__ANDROID_APP__) {
      // Android: 1ゲーム終了を native へ通知するだけ。7回カウント/課金/ネット/実広告表示は native。
      notifyNativeGameEnd()
      return
    }
    // WEB(ブラウザ確認用): 7回ごとにモック。ネット/課金確認はしない（PCなので不要）。
    const { count, show } = countGameForAd(WEB_AD_COUNT_KEY)
    this.debugGameCount = count
    if (show) {
      this.adMockCount = count
      this.adMockOpen = true
    }
  }

  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  private assetUrl(relativePath: string): string {
    return buildGameAssetUrl(relativePath)
  }

  // 結果バナー: win/lose/tie/push/blackjack(=「21」)はすべて全カードゲーム共通(common/messages)。
  private resultImageUrl(name: string): string {
    return this.assetUrl(`messages/${name}.png`)
  }

  private openRemoveAdsStore(): void {
    const storeUrl = this.appConfig?.app_info?.play_store_url ?? ''
    if (!storeUrl) {
      return
    }
    window.open(storeUrl, '_blank', 'noopener,noreferrer')
  }

  private onHit(): void {
    if (this.isInitialDealAnimating) {
      return
    }
    this.playEffect('hit')
    if (this.isDevMode && this.devHitCardNumberInput === 'bj') {
      this.setGameState(this.engine.forcePlayerBlackjackInCurrentRound())
      return
    }

    this.setGameState(this.engine.hit(this.forcedDevHitCardNumber(), true))
    if (this.gameState.phase === 'dealer_turn') {
      this.scheduleDealerTurn()
    }
  }

  private onStand(): void {
    if (this.isInitialDealAnimating || this.isStandTransitioning) {
      return
    }
    this.playEffect('stand')
    this.clearNoMoreBetTimers()
    this.isNoMoreBetVisible = false
    this.isStandTransitioning = true
    runNoMoreBetSequence({
      schedule: (callback, delayMs) => this.scheduleNoMoreBetTimer(callback, delayMs),
      setVisible: (visible) => {
        this.isNoMoreBetVisible = visible
      },
      playEffect: (name) => this.playEffect(name),
      onComplete: () => {
        this.isStandTransitioning = false
        this.setGameState(this.engine.stand(true))
        if (this.gameState.phase === 'dealer_turn') {
          this.scheduleDealerTurn()
        }
      }
    })
  }

  private onContinue(): void {
    if (this.gameState.phase !== 'round_end') {
      return
    }
    this.clearDealerTurnTimer()
    this.playEffect('submit')
    this.normalizeBetForCoin()
    this.isBetDialogOpen = true
  }

  private confirmCoinRecovery(): void {
    this.playEffect('submit')
    this.clearCoinRecoveryDialogTimer()
    this.coin = recoverSharedCoin()
    this.normalizeBetForCoin()
    this.isCoinRecoveryDialogOpen = false
    this.isBetDialogOpen = true
    window.setTimeout(() => {
      const bridge = getAndroidBillingBridge()
      bridge?.showRecoveryInterstitialAd?.() ?? bridge?.showInterstitialAd?.()
    }, 0)
  }

  private scheduleDealerTurn(): void {
    this.clearDealerTurnTimer()
    this.dealerTurnTimerId = window.setTimeout(() => {
      this.setGameState(this.engine.advanceDealerTurn())
      this.dealerTurnTimerId = null
    }, DEALER_TURN_DELAY_MS)
  }

  private clearDealerTurnTimer(): void {
    if (this.dealerTurnTimerId !== null) {
      window.clearTimeout(this.dealerTurnTimerId)
      this.dealerTurnTimerId = null
    }
  }

  private clearDealRevealTimers(): void {
    this.dealRevealTimerIds.forEach((id) => window.clearTimeout(id))
    this.dealRevealTimerIds = []
  }

  private clearCoinRecoveryDialogTimer(): void {
    if (this.coinRecoveryDialogTimerId !== null) {
      window.clearTimeout(this.coinRecoveryDialogTimerId)
      this.coinRecoveryDialogTimerId = null
    }
  }

  private clearDemoActionTimer(): void {
    if (this.demoActionTimerId !== null) {
      window.clearTimeout(this.demoActionTimerId)
      this.demoActionTimerId = null
    }
  }

  private normalizedDemoPlayCount(): number {
    const value = Math.floor(Number(this.demoPlayCount))
    if (!Number.isFinite(value) || value < 1) {
      return DEFAULT_DEMO_PLAY_COUNT
    }
    return value
  }

  private scheduleDemoAction(callback: () => void, delayMs = DEMO_ACTION_DELAY_MS): void {
    this.clearDemoActionTimer()
    this.demoActionTimerId = window.setTimeout(() => {
      this.demoActionTimerId = null
      if (!this.isDemoActive) {
        return
      }
      callback()
    }, delayMs)
  }

  private startDemoMode(): void {
    if (!this.demoAvailable || this.isDemoActive) {
      return
    }
    if (!this.isBetDialogOpen) {
      return
    }
    this.isDebugDialogOpen = false
    this.activePanel = null
    this.confirmAction = null
    this.currentBet = Math.min(this.coin, DEMO_DEFAULT_BET)
    this.normalizeBetForCoin()
    this.demoCompletedRounds = 0
    this.isDemoActive = true
  }

  private stopDemoMode(): void {
    this.clearDemoActionTimer()
    this.isDemoActive = false
    this.demoCompletedRounds = 0
  }

  private demoPlayerScore(): number {
    const { min, max } = this.gameState.playerScoreRange
    return max <= 21 ? max : min
  }

  private syncDemoProgress(): void {
    this.clearDemoActionTimer()
    if (!this.isDemoActive) {
      return
    }
    if (this.isInitialDealAnimating || this.isStandTransitioning) {
      return
    }
    if (this.isCoinRecoveryDialogOpen) {
      this.scheduleDemoAction(() => this.confirmCoinRecovery(), DEMO_RECOVERY_DELAY_MS)
      return
    }
    if (this.coin <= 0) {
      return
    }
    const targetRounds = this.normalizedDemoPlayCount()
    if (this.demoCompletedRounds >= targetRounds) {
      this.stopDemoMode()
      return
    }
    if (this.isBetDialogOpen) {
      this.currentBet = Math.min(this.coin, DEMO_DEFAULT_BET)
      this.normalizeBetForCoin()
      this.scheduleDemoAction(() => this.placeBetAndDeal())
      return
    }
    if (this.gameState.phase === 'player_turn') {
      if (this.demoPlayerScore() <= 16) {
        this.scheduleDemoAction(() => this.onHit())
        return
      }
      this.scheduleDemoAction(() => this.onStand())
      return
    }
    if (this.gameState.phase === 'round_end') {
      this.scheduleDemoAction(() => this.onContinue())
    }
  }

  private scheduleCoinRecoveryDialogIfZero(): void {
    this.clearCoinRecoveryDialogTimer()
    this.coinRecoveryDialogTimerId = scheduleCoinRecoveryDialogIfZero({
      coin: this.coin,
      setOpen: (open) => {
        this.isCoinRecoveryDialogOpen = open
      },
      schedule: (callback, delayMs) =>
        window.setTimeout(() => {
          this.coinRecoveryDialogTimerId = null
          callback()
        }, delayMs)
    })
  }

  private clearNoMoreBetTimers(): void {
    this.noMoreBetTimerIds.forEach((id) => window.clearTimeout(id))
    this.noMoreBetTimerIds = []
    this.isNoMoreBetVisible = false
    this.isStandTransitioning = false
  }

  private scheduleDealRevealTimer(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.dealRevealTimerIds = this.dealRevealTimerIds.filter((timerId) => timerId !== id)
      callback()
    }, delayMs)
    this.dealRevealTimerIds = [...this.dealRevealTimerIds, id]
  }

  private scheduleNoMoreBetTimer(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.noMoreBetTimerIds = this.noMoreBetTimerIds.filter((timerId) => timerId !== id)
      callback()
    }, delayMs)
    this.noMoreBetTimerIds = [...this.noMoreBetTimerIds, id]
  }

  private startNewRoundWithOpeningDeal(): void {
    this.clearDealRevealTimers()
    this.clearNoMoreBetTimers()
    this.pendingBetStake = this.currentBet
    savePendingStake(BLACKJACK_GAME_ID, this.currentBet)
    this.coin = saveSharedCoin(this.coin - this.currentBet)
    this.isBetDialogOpen = false
    this.setGameState(this.engine.startNewGame(false, true))
    this.isInitialDealAnimating = true
    this.initialDealStep = 0

    this.scheduleDealRevealTimer(() => {
      this.initialDealStep = 1
      this.playEffect('hit')
    }, INITIAL_DEAL_START_DELAY_MS)

    this.scheduleDealRevealTimer(() => {
      this.initialDealStep = 2
      this.playEffect('hit')
    }, INITIAL_DEAL_START_DELAY_MS + INITIAL_DEAL_STEP_MS)

    this.scheduleDealRevealTimer(() => {
      this.initialDealStep = 3
      this.playEffect('hit')
    }, INITIAL_DEAL_START_DELAY_MS + INITIAL_DEAL_STEP_MS * 2)

    this.scheduleDealRevealTimer(() => {
      this.initialDealStep = 4
      this.playEffect('hit')
      this.isInitialDealAnimating = false
      this.setGameState(this.engine.resolveInitialPlayerOutcomeIfNeeded())
    }, INITIAL_DEAL_START_DELAY_MS + INITIAL_DEAL_STEP_MS * 3)
  }

  private playEffect(name: string): void {
    if (!this.isSoundEnabled) {
      return
    }
    const audio = new Audio(this.assetUrl(`effects/${name}.mp3`))
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  }

  private loadSettings(): void {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY)
    this.isSoundEnabled = saved !== 'false'
    const savedBgm = localStorage.getItem(BGM_ENABLED_KEY)
    this.isBgmEnabled = savedBgm === null || savedBgm.trim() === '' ? true : savedBgm === 'true'
    console.log('[BLACKJACK loadSettings]', { saved, isSoundEnabled: this.isSoundEnabled, savedBgm, isBgmEnabled: this.isBgmEnabled })
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    if (savedLanguage === 'ja' || savedLanguage === 'zh' || savedLanguage === 'en') {
      this.selectedLanguage = savedLanguage
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      this.appConfig = await loadAppConfig('blackjack')
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
      if (savedLanguage === 'en' || savedLanguage === 'ja' || savedLanguage === 'zh') {
        this.selectedLanguage = savedLanguage
      } else {
        const defaultLanguage = getDefaultLanguage(this.appConfig)
        this.selectedLanguage = defaultLanguage
        localStorage.setItem(LANGUAGE_KEY, defaultLanguage)
      }
    } catch {
      this.appConfig = null
    }
  }

  private setSoundEnabled(enabled: boolean): void {
    const wasEnabled = this.isSoundEnabled
    this.isSoundEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
    console.log('[BLACKJACK setSoundEnabled]', { enabled, saved: localStorage.getItem(SOUND_ENABLED_KEY) })
    if (!wasEnabled && enabled) {
      this.playEffect('submit')
    }
  }

  private setBgmEnabled(enabled: boolean): void {
    this.playEffect('submit')
    this.isBgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
  }

  private openPanel(panel: 'settings' | 'guide' | 'remove-ads', force = false): void {
    if (!force && this.isBetDialogOpen) {
      return
    }
    this.playEffect('submit')
    this.activePanel = panel
  }

  private closePanel(): void {
    this.activePanel = null
    if (this.pendingBetStake <= 0 && this.gameState.phase !== 'player_turn' && this.gameState.phase !== 'dealer_turn') {
      this.isBetDialogOpen = true
    }
  }

  private closePanelWithSubmit(): void {
    this.playEffect('submit')
    this.activePanel = null
    if (this.pendingBetStake <= 0 && this.gameState.phase !== 'player_turn' && this.gameState.phase !== 'dealer_turn') {
      this.isBetDialogOpen = true
    }
  }

  private onHomeClick(force = false): void {
    if (!force && this.isBetDialogOpen) {
      return
    }
    this.playEffect('submit')
    if (this.confirmAction === 'go-home') {
      return
    }
    this.confirmAction = 'go-home'
  }

  private openPanelFromBet(panel: 'settings' | 'guide'): void {
    if (!this.isBetDialogOpen) {
      this.openPanel(panel)
      return
    }
    this.playEffect('submit')
    this.isBetDialogOpen = false
    this.openPanel(panel, true)
  }

  private onHomeFromBet(): void {
    if (!this.isBetDialogOpen) {
      this.onHomeClick()
      return
    }
    this.isBetDialogOpen = false
    this.onHomeClick(true)
  }

  private playRoundEndEffect(result: GameResult | null): void {
    switch (result) {
      case GameResult.PLAYER_BLACKJACK:
        this.playEffect('win')
        return
      case GameResult.DEALER_BLACKJACK:
        this.playEffect('lose')
        return
      case GameResult.PLAYER_WIN:
      case GameResult.DEALER_BUST:
        this.playEffect('win')
        return
      case GameResult.DEALER_WIN:
      case GameResult.PLAYER_BUST:
        this.playEffect('lose')
        return
      case GameResult.PUSH:
      case GameResult.BOTH_BUST:
        this.playEffect('push')
        return
      default:
        return
    }
  }

  private onDevModeChange(event: Event): void {
    const checkbox = event.currentTarget as HTMLInputElement
    this.isDevMode = checkbox.checked
  }

  private onDevCardNumberInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement
    const normalized = input.value.trim().toLowerCase()

    if (normalized === '' || /^\d{1,2}$/.test(normalized) || normalized === 'b' || normalized === 'bj') {
      this.devHitCardNumberInput = normalized
    }
  }

  private forcedDevHitCardNumber(): number | undefined {
    if (!this.isDevMode) {
      return undefined
    }

    const value = Number(this.devHitCardNumberInput)
    if (!Number.isInteger(value) || value < 1 || value > 13) {
      return undefined
    }

    return value
  }

  private cardsClass(cardCount: number): string {
    return cardCount >= 3 ? 'cards compact' : 'cards'
  }

  private cardsStyle(cardCount: number, forDealer = false): string {
    if (cardCount < 3) {
      return ''
    }

    const cappedCount = Math.min(cardCount, 10)
    const extraCards = cappedCount - 3
    const baseOverlap = Math.min(CARD_OVERLAP_MAX_PX, 62 + extraCards * 6)
    const boostStart = forDealer ? 5 : 6
    const fixedStart = forDealer ? 7 : 8
    if (cappedCount >= fixedStart) {
      const baseOverlapAtFixedStart = Math.min(CARD_OVERLAP_MAX_PX, 62 + (fixedStart - 3) * 6)
      const boostedOverlapForFixedStartPlus = Math.min(CARD_OVERLAP_MAX_PX, Math.round(baseOverlapAtFixedStart * 1.3))
      return `--card-overlap:${boostedOverlapForFixedStartPlus}px;`
    }
    if (cappedCount >= boostStart) {
      const boostedOverlap = Math.min(CARD_OVERLAP_MAX_PX, Math.round(baseOverlap * 1.2))
      return `--card-overlap:${boostedOverlap}px;`
    }
    return `--card-overlap:${baseOverlap}px;`
  }

  private visibleDealerCardCount(): number {
    return this.gameState.dealerHand.filter((_, index) => this.shouldRenderDealerCard(index)).length
  }

  private visiblePlayerCardCount(): number {
    return this.gameState.playerHand.filter((_, index) => this.shouldRenderPlayerCard(index)).length
  }

  private scoreForDealerLabel(): string {
    if (this.isInitialDealAnimating) {
      return ''
    }

    if (this.gameState.isDealerCardRevealed) {
      if (this.engine.isDealerBlackjack()) {
        return '21'
      }
      return String(this.gameState.dealerScore)
    }

    return this.gameState.dealerHand[1] ? String(getCardScore(this.gameState.dealerHand[1])) : '0'
  }

  private playerScoreLabel(): string {
    if (this.isInitialDealAnimating) {
      return ''
    }

    const { min, max } = this.gameState.playerScoreRange
    if (max > 21) {
      return String(min)
    }

    if (this.engine.isPlayerBlackjack()) {
      return '21'
    }

    if (this.gameState.isStandClicked || min === max) {
      return String(max)
    }

    return `${min} OR ${max}`
  }

  private dealerHeaderLabel(): string {
    const score = this.scoreForDealerLabel()
    if (score === '') {
      return score
    }
    const numeric = Number(score)
    if (Number.isFinite(numeric) && numeric >= 22) {
      return `${score} BUST`
    }
    return score
  }

  private playerHeaderLabel(): string {
    const score = this.playerScoreLabel()
    if (score === '') {
      return score
    }
    if (this.engine.isPlayerBust()) {
      return `${score} BUST`
    }
    return score
  }

  private dealerScoreBannerLabel(): string {
    // Keep only the top dealer title row to avoid duplicated dealer labels.
    return ''
  }

  private coinDeltaBannerLabel(): string {
    if (this.gameState.phase !== 'round_end') {
      return ''
    }
    const payout = this.roundUpCoin(this.currentBet * this.payoutMultiplierForResult(this.gameState.result))
    const delta = payout - this.currentBet
    if (this.gameState.result === GameResult.PLAYER_BLACKJACK) {
      return `BJ BONUS x1.5 / COIN +${delta}`
    }
    if (delta > 0) {
      return `COIN +${delta}`
    }
    if (delta < 0) {
      return `COIN ${delta}`
    }
    return 'EVEN 0 COIN'
  }

  private resultMessageImage(result: GameResult | null, side: 'player' | 'dealer'): string | null {
    switch (result) {
      case GameResult.PLAYER_BLACKJACK:
        return side === 'player' ? 'blackjack' : 'lose'
      case GameResult.DEALER_BLACKJACK:
        return side === 'dealer' ? 'blackjack' : 'lose'
      case GameResult.BOTH_BUST:
      case GameResult.PUSH:
        return 'push'
      case GameResult.PLAYER_BUST:
        return side === 'player' ? 'lose' : 'win'
      case GameResult.DEALER_BUST:
        return side === 'dealer' ? 'lose' : 'win'
      case GameResult.PLAYER_WIN:
        return side === 'player' ? 'win' : 'lose'
      case GameResult.DEALER_WIN:
        return side === 'dealer' ? 'win' : 'lose'
      default:
        return null
    }
  }

  private renderCard(card: Card, hidden = false): unknown {
    const baseSrc = hidden ? this.assetUrl('cards/back_card.png') : this.assetUrl(`cards/${card.imagePath}`)
    const src = `${baseSrc}?rev=${CARD_ASSET_REV}`
    const text = hidden ? 'HIDDEN' : `${card.suit} ${card.value}`

    return html`
      <div class="card">
        <img src=${src} alt=${text} loading="lazy" @error=${this.onCardImageError} />
        <div class="fallback">${text}</div>
      </div>
    `
  }

  private onCardImageError(event: Event): void {
    const image = event.currentTarget as HTMLImageElement
    image.style.display = 'none'
  }

  private winRate(): number {
    const total = this.gameState.stats.playerWins + this.gameState.stats.playerLosses
    if (total === 0) {
      return 0
    }
    return Math.floor((this.gameState.stats.playerWins * 100) / total)
  }

  private shouldRenderPlayerCard(index: number): boolean {
    if (!this.isInitialDealAnimating) {
      return true
    }
    if (index === 0) {
      return this.initialDealStep >= 1
    }
    if (index === 1) {
      return this.initialDealStep >= 3
    }
    return true
  }

  private shouldRenderDealerCard(index: number): boolean {
    if (!this.isInitialDealAnimating) {
      return true
    }
    if (index === 1) {
      return this.initialDealStep >= 2
    }
    if (index === 0) {
      return this.initialDealStep >= 4
    }
    return true
  }

  private shouldHideDealerCard(index: number): boolean {
    if (this.gameState.isDealerCardRevealed) {
      return false
    }
    if (index === 0) {
      return true
    }
    return false
  }

  public handleSystemBack(): boolean {
    if (this.activePanel) {
      this.closePanel()
      return true
    }
    if (this.confirmAction) {
      this.cancelConfirmAction()
      return true
    }
    this.onHomeClick()
    return true
  }

  private clearStats(): void {
    const stats = { playerWins: 0, playerLosses: 0, pushes: 0 }
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats))
    this.setGameState({ ...this.gameState, stats })
    this.activePanel = null
    this.dispatchEvent(
      new CustomEvent('go-home', {
        detail: { force: true },
        bubbles: true,
        composed: true
      })
    )
  }

  private clearCacheExceptStats(): void {
    this.pendingBetStake = 0
    clearPendingStake(BLACKJACK_GAME_ID)
    const statsRaw = localStorage.getItem(STATS_STORAGE_KEY)
    clearLocalStoragePreservingProgress([
      ...(statsRaw !== null ? [{ key: STATS_STORAGE_KEY, value: statsRaw }] : []),
      { key: LANGUAGE_KEY, value: this.selectedLanguage },
      { key: SOUND_ENABLED_KEY, value: String(this.isSoundEnabled) }
    ])
    saveBgmEnabledSetting(this.isBgmEnabled)
    this.coin = ensurePlayableSharedCoin()
  }

  private uiText() {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.selectedLanguage) : undefined
    const menu = block?.menu
    const overview = block?.overview_info
    const settings = block?.settings
    const common = block?.common
    const ads = block?.ads
    const game = block?.game
    const chrome = getSharedChromeText(this.selectedLanguage)

    const customGuideContent = getLocalizedString(overview, 'guide_content')
    if (overview && !customGuideContent) {
      throw new Error('guide_content がありません。build_content.py で生成してください（直書きフォールバック禁止）。')
    }
    const guideLines = splitTextLines(customGuideContent).filter((line) => line.length > 0)

    return {
      home: chrome.home,
      settings: chrome.settings,
      guide: chrome.guide,
      removeAds: getLocalizedString(game, 'toolbar_remove_ads') || getLocalizedString(menu, 'remove_ads') || 'Remove Ads',
      settingsTitle: chrome.settings,
      languageLabel: getLocalizedString(settings, 'language') || 'Language',
      effectLabel: getLocalizedString(settings, 'sound_effect') || 'Effect',
      bgmLabel: getLocalizedString(settings, 'bgm') || 'BGM',
      clearStatsLabel: getLocalizedString(settings, 'reset_points') || 'Reset Points',
      clearCacheLabel: getLocalizedString(settings, 'clear_cache') || 'Clear Cache',
      guideTitle: chrome.guideOverview,
      guideLines,
      removeAdsTitle: getLocalizedString(menu, 'remove_ads'),
      removeAdsLines: [
        getLocalizedString(ads, 'web_store_message') ||
        'Remove Ads is available only in the Android app. Please download the app from Google Play and enjoy the full version there.'
      ],
      removeAdsWebStoreMessage:
        getLocalizedString(ads, 'web_store_message') ||
        'Remove Ads is available only in the Android app. Please download the app from Google Play and enjoy the full version there.',
      removeAdsWebStoreButton: getLocalizedString(ads, 'web_store_button') || 'Open in Google Play',
      okLabel: chrome.ok,
      confirmTitle: getLocalizedString(common, 'confirm') || 'Confirm',
      confirmCancel: chrome.cancel,
      leaveTitle: chrome.leaveTitle,
      leaveGameMessage: chrome.leaveMessage,
      resetConfirmMessage: getLocalizedString(settings, 'reset_points_confirm_message'),
      clearCacheConfirmMessage: getLocalizedString(settings, 'clear_cache_confirm_message'),
      coinRecoveryTitle: getLocalizedString(game, 'blackjack_coin_recovery_title') || 'COIN Recovery',
      coinRecoveryLine1: getLocalizedString(game, 'blackjack_coin_recovery_line1') || 'COIN reached 0.',
      coinRecoveryLine2:
        (getLocalizedString(game, 'blackjack_coin_recovery_line2') || 'COIN will be reset to {coin} and the game will restart.')
          .replace('{coin}', String(DEFAULT_SHARED_COIN)),
      noMoreBetLabel: getLocalizedString(game, 'casino_war_no_more_bets') || 'No more Bets.',
      betAvailableLabel: getLocalizedString(game, 'bet_available_label') || 'COIN:',
      betInstruction: getLocalizedString(game, 'bet_instruction') || '',
      demoStartMessage: getLocalizedString(game, 'demo_start_message') || 'Start demo mode?',
      demoUnavailableMessage: getLocalizedString(game, 'demo_unavailable_message') || 'Demo mode is available only in single-game mode.'
    }
  }

  private onFooterAction(event: CustomEvent<{ action: 'debug' | 'demo' }>): void {
    this.playEffect('submit')
    const action = event.detail?.action
    if (action === 'debug') {
      this.debugGameCount = peekGameCount(WEB_AD_COUNT_KEY)
      this.isDebugDialogOpen = true
      return
    }
    if (action === 'demo') {
      this.demoConfirmMode = this.demoAvailable ? 'start' : 'unavailable'
    }
  }

  private onFooterFeedback(): void {
    this.playEffect('submit')
    this.renderRoot.querySelector<GameFeedback>('game-feedback')?.open()
  }

  private closeDebugDialog(): void {
    this.playEffect('submit')
    this.isDebugDialogOpen = false
  }

  private cancelDemoConfirm(): void {
    this.playEffect('submit')
    this.demoConfirmMode = null
  }

  private confirmDemoStart(): void {
    this.playEffect('submit')
    const mode = this.demoConfirmMode
    this.demoConfirmMode = null
    if (mode !== 'start') {
      return
    }
    this.dispatchEvent(
      new CustomEvent('go-home', {
        bubbles: true,
        composed: true
        ,
        detail: {
          force: true,
          demoReset: true
        }
      })
    )
  }

  private cancelConfirmAction(): void {
    this.playEffect('submit')
    const action = this.confirmAction
    this.confirmAction = null
    if (
      action === 'go-home' &&
      this.pendingBetStake <= 0 &&
      this.gameState.phase !== 'player_turn' &&
      this.gameState.phase !== 'dealer_turn'
    ) {
      this.isBetDialogOpen = true
    }
  }

  private confirmCurrentAction(): void {
    this.playEffect('submit')
    const action = this.confirmAction
    this.confirmAction = null
    if (action === 'clear-stats') {
      this.clearStats()
      return
    }
    if (action === 'clear-cache') {
      this.clearCacheExceptStats()
      return
    }
    if (action === 'go-home') {
      this.clearDealerTurnTimer()
      this.refundPendingBetIfNeeded()
      this.dispatchEvent(
        new CustomEvent('go-home', {
          bubbles: true,
          composed: true
        })
      )
    }
  }

  private restoreCoinFromPendingStakeIfNeeded(): void {
    const pending = takePendingStake(BLACKJACK_GAME_ID)
    if (pending <= 0) {
      return
    }
    this.pendingBetStake = 0
    this.coin = saveSharedCoin(this.coin + pending)
  }

  private normalizeBetForCoin(): void {
    const maxAllowedBet = this.coin
    if (maxAllowedBet < MIN_BET) {
      this.currentBet = MIN_BET
      return
    }
    if (this.currentBet < MIN_BET) {
      this.currentBet = MIN_BET
    }
    if (this.currentBet > maxAllowedBet) {
      this.currentBet = maxAllowedBet
    }
  }

  private increaseBet(event?: CustomEvent<{ isRepeating?: boolean }>): void {
    const maxAllowedBet = this.coin
    if (maxAllowedBet < MIN_BET) {
      this.currentBet = MIN_BET
      return
    }
    if (this.currentBet >= maxAllowedBet) {
      return
    }
    if (!event?.detail?.isRepeating) {
      this.playEffect('submit')
    }
    this.currentBet = Math.min(maxAllowedBet, this.currentBet + 1)
  }

  private decreaseBet(event?: CustomEvent<{ isRepeating?: boolean }>): void {
    if (this.currentBet <= MIN_BET) {
      return
    }
    if (!event?.detail?.isRepeating) {
      this.playEffect('submit')
    }
    this.currentBet = Math.max(MIN_BET, this.currentBet - 1)
  }

  private onBetValueChange(event: CustomEvent<{ value: number }>): void {
    const value = event.detail.value
    if (value >= MIN_BET && value <= this.coin) {
      this.currentBet = value
    }
  }

  private placeBetAndDeal(): void {
    this.normalizeBetForCoin()
    if (this.coin < MIN_BET || this.coin < this.currentBet) {
      return
    }
    this.playEffect('submit')
    this.startNewRoundWithOpeningDeal()
  }

  private payoutMultiplierForResult(result: GameResult | null): number {
    if (result === GameResult.PLAYER_BLACKJACK) {
      return 2.5
    }
    if (result === GameResult.PLAYER_WIN || result === GameResult.DEALER_BUST) {
      return 2
    }
    if (result === GameResult.PUSH || result === GameResult.BOTH_BUST) {
      return 1
    }
    return 0
  }

  private roundUpCoin(value: number): number {
    if (value <= 0) {
      return 0
    }
    return Math.ceil(value)
  }

  private applyPayoutForRoundEnd(): void {
    if (this.pendingBetStake <= 0) {
      clearPendingStake(BLACKJACK_GAME_ID)
      return
    }
    const payout = this.roundUpCoin(this.currentBet * this.payoutMultiplierForResult(this.gameState.result))
    if (payout > 0) {
      this.coin = saveSharedCoin(this.coin + payout)
    }
    this.pendingBetStake = 0
    clearPendingStake(BLACKJACK_GAME_ID)
  }

  private refundPendingBetIfNeeded(): void {
    if (this.pendingBetStake <= 0) {
      clearPendingStake(BLACKJACK_GAME_ID)
      return
    }
    this.coin = saveSharedCoin(this.coin + this.pendingBetStake)
    this.pendingBetStake = 0
    clearPendingStake(BLACKJACK_GAME_ID)
  }

  render() {
    const canPlay = this.gameState.phase === 'player_turn' && !this.isInitialDealAnimating && !this.isBetDialogOpen && !this.isStandTransitioning
    const canContinue = this.gameState.phase === 'round_end' && !this.isBetDialogOpen
    const dealerCardCount = this.visibleDealerCardCount()
    const playerCardCount = this.visiblePlayerCardCount()
    const dealerResultImage = this.resultMessageImage(this.gameState.result, 'dealer')
    const playerResultImage = this.resultMessageImage(this.gameState.result, 'player')
    const dealerBanner = this.dealerScoreBannerLabel()
    const coinDeltaBanner = this.coinDeltaBannerLabel()
    const stageStyle = `background-image: url('${this.assetUrl('images/background.webp')}')`
    const showToolbox = true
    const t = this.uiText()

    return html`
      <div class="screen-bg">
        <div class="stage" style=${stageStyle}>
          <div class="table">
            ${showToolbox
        ? html`
                  <game-top-header
                    home-label=${t.home}
                    settings-label=${t.settings}
                    guide-label=${t.guide}
                    .toolsDisabled=${this.isBetDialogOpen}
                    .coin=${this.coin}
                    @header-home=${this.onHomeClick}
                    @header-settings=${() => this.openPanel('settings')}
                    @header-guide=${() => this.openPanel('guide')}
                  ></game-top-header>
                  <header class="bet-status">${coinIcon()} COIN ${this.coin} / BET ${this.currentBet}</header>
                `
        : null}
            <header class="stats-panel legacy-hidden" aria-hidden="true">
              <div>・滓ｨ｣繝ｻ:${this.gameState.stats.playerWins}</div>
              <div>髫ｨ・ｶ郢晢ｽｻ${this.gameState.stats.playerLosses}</div>
              <div>・滓ｩｸ・ｽ・､郢晢ｽｻ${this.gameState.stats.pushes}</div>
              <div>・滓ｫ・ｽｭ繝ｻ${this.winRate()}%</div>
            </header>

            <section class="hand-section dealer ${canContinue ? 'result' : ''}">
              <div class="title-row">
                <h2 class="hand-title">
                  <span class="hand-title-prefix">DEALER:</span>
                  <span class="hand-title-score">${this.dealerHeaderLabel()}</span>
                </h2>
              </div>
              <div
                class=${this.cardsClass(dealerCardCount)}
                style=${this.cardsStyle(dealerCardCount, true)}
              >
                ${dealerBanner.length > 0
        ? html`<div class="status-headline score-banner">${dealerBanner}</div>`
        : html`<div class="status-headline placeholder score-banner" aria-hidden="true"></div>`}
                ${dealerResultImage
        ? html`<img
                      class="result-overlay-image"
                      src=${this.resultImageUrl(dealerResultImage)}
                      alt=${dealerResultImage}
                    />`
        : null}
                ${this.gameState.dealerHand.map((card, index) =>
          this.shouldRenderDealerCard(index) ? this.renderCard(card, this.shouldHideDealerCard(index)) : null
        )}
              </div>
            </section>

            <section class="hand-section player ${canContinue ? 'result' : ''}">
              <div class="title-row">
                <h2 class="hand-title">
                  <span class="hand-title-prefix">PLAYER:</span>
                  <span class="hand-title-score">${this.playerHeaderLabel()}</span>
                </h2>
              </div>
              <div
                class=${this.cardsClass(playerCardCount)}
                style=${this.cardsStyle(playerCardCount)}
              >
                ${coinDeltaBanner.length > 0
        ? html`<div class="hand-role-banner is-glow coin-delta-banner">${coinDeltaBanner}</div>`
        : null}
                ${playerResultImage
        ? html`<img
                      class="result-overlay-image"
                      src=${this.resultImageUrl(playerResultImage)}
                      alt=${playerResultImage}
                    />`
        : null}
                ${this.gameState.playerHand.map((card, index) =>
          this.shouldRenderPlayerCard(index) ? this.renderCard(card) : null
        )}
              </div>
              <div class="actions">
                ${canContinue
        ? html`
                      <div class="continue-row">
                        <button
                          class="continue-btn"
                          @click=${this.onContinue}
                        >
                          CONTINUE
                        </button>
                      </div>
                    `
        : null}
                <div class="action-buttons">
                  <button @click=${this.onHit} ?disabled=${!canPlay}>HIT</button>
                  <button
                    @click=${this.onStand}
                    ?disabled=${!canPlay}
                  >
                    STAND
                  </button>
                </div>
              </div>
            </section>
            ${this.isNoMoreBetVisible
        ? html`
                  <div class="no-more-bet">
                    <img class="no-more-bet-image" src=${this.assetUrl('messages/no_more_bets.png')} alt="No More Bets" />
                  </div>
                `
        : null}
            <section class="region-footer" aria-label="Footer Area">
              <game-footer-bar
                .showDebug=${!this.isDemoActive}
                .showDemo=${this.demoAvailable && !this.isDemoActive}
                showFeedback
                @footer-action=${this.onFooterAction}
                @footer-feedback=${this.onFooterFeedback}
              ></game-footer-bar>
            </section>
            ${this.adMockOpen ? html`
              <ad-mock-dialog
                .count=${this.adMockCount}
                @ad-mock-close=${() => { this.playEffect('submit'); this.adMockOpen = false }}
              ></ad-mock-dialog>` : null}
            ${this.isDebugDialogOpen
        ? html`
                  <section class="overlay">
                    <div class="modal debug-modal">
                      <h3>Debug</h3>
                      <p class="debug-count">現在 ${this.debugGameCount} ゲーム</p>
                      <div class="dev-controls">
                        <label class="dev-toggle">
                          <input type="checkbox" .checked=${this.isDevMode} @change=${this.onDevModeChange} />
                          <span>DEV MODE</span>
                        </label>
                        <input
                          class="dev-input"
                          type="text"
                          inputmode="text"
                          placeholder="1-13 or bj"
                          .value=${this.devHitCardNumberInput}
                          @input=${this.onDevCardNumberInput}
                          ?disabled=${!this.isDevMode}
                        />
                      </div>
                      <button class="debug-close-btn" @click=${this.closeDebugDialog}>CLOSE</button>
                    </div>
                  </section>
                `
        : null}
            ${showToolbox && this.activePanel === 'settings'
        ? html`
                  <section class="overlay">
                    <div class="modal">
                      ${renderSettingsPanel({
            language: this.selectedLanguage,
            effectEnabled: this.isSoundEnabled,
            bgmEnabled: this.isBgmEnabled,
            soundHelpOpen: this.soundHelpOpen,
            showClearCache: false,
            onClose: () => this.closePanel(),
            onEffectChange: (enabled) => this.setSoundEnabled(enabled),
            onBgmChange: (enabled) => this.setBgmEnabled(enabled),
            onLanguageChange: (next) => {
              this.selectedLanguage = next
              localStorage.setItem(LANGUAGE_KEY, next)
            },
            onOpenSoundHelp: () => { this.soundHelpOpen = true },
            onCloseSoundHelp: () => { this.soundHelpOpen = false }
          })}
                    </div>
                  </section>
                `
        : null}
            ${showToolbox && this.activePanel === 'guide'
        ? html`
                  <section class="overlay">
                    <div class="modal">
                      <guide-overview-panel
                        .title=${t.guideTitle}
                        .lines=${t.guideLines}
                        .okLabel=${'OK'}
                        @guide-close=${this.closePanelWithSubmit}
                      ></guide-overview-panel>
                    </div>
                  </section>
                `
        : null}
            ${showToolbox && this.activePanel && this.activePanel !== 'settings' && this.activePanel !== 'guide'
        ? html`
                  <section class="overlay">
                    <div class="modal">
                      <remove-ads-dialog-panel
                        .title=${t.removeAdsTitle}
                        .lines=${t.removeAdsLines}
                        .showPurchase=${false}
                        .showTerms=${false}
                        .linkLabel=${t.removeAdsWebStoreButton}
                        .statusLabel=${t.removeAdsWebStoreMessage}
                        .purchaseLabel=${''}
                        .termsLabel=${''}
                        .priceLabel=${''}
                        @remove-ads-purchase=${this.openRemoveAdsStore}
                        @remove-ads-close=${this.closePanelWithSubmit}
                      ></remove-ads-dialog-panel>
                    </div>
                  </section>
                `
        : null}
            ${this.confirmAction
        ? html`
                  <section class="overlay confirm-overlay">
                    <div class="modal">
                      <confirm-dialog-panel
                        .title=${this.confirmAction === 'go-home' ? t.leaveTitle : t.confirmTitle}
                        .message=${this.confirmAction === 'clear-stats'
            ? t.resetConfirmMessage
            : this.confirmAction === 'clear-cache'
              ? t.clearCacheConfirmMessage
              : t.leaveGameMessage}
                        .okLabel=${t.okLabel}
                        .cancelLabel=${t.confirmCancel}
                        @confirm-accept=${this.confirmCurrentAction}
                        @confirm-cancel=${this.cancelConfirmAction}
                      ></confirm-dialog-panel>
                    </div>
                  </section>
                `
        : null}
            ${this.demoConfirmMode
        ? html`
                  <section class="overlay confirm-overlay">
                    <div class="modal">
                      <confirm-dialog-panel
                        .title=${t.confirmTitle}
                        .message=${this.demoConfirmMode === 'start' ? t.demoStartMessage : t.demoUnavailableMessage}
                        .okLabel=${t.okLabel}
                        .cancelLabel=${t.confirmCancel}
                        @confirm-accept=${this.confirmDemoStart}
                        @confirm-cancel=${this.cancelDemoConfirm}
                      ></confirm-dialog-panel>
                    </div>
                  </section>
                `
        : null}
            ${this.isCoinRecoveryDialogOpen
        ? html`
                  <section class="overlay confirm-overlay">
                    <div class="modal coin-recovery-modal">
                      <h3>${t.coinRecoveryTitle}</h3>
                      <p>${t.coinRecoveryLine1}</p>
                      <p>${t.coinRecoveryLine2}</p>
                      <button class="recovery-ok-btn" @click=${this.confirmCoinRecovery}>${t.okLabel}</button>
                    </div>
                  </section>
                `
        : null}
            ${this.isBetDialogOpen
        ? html`
                  <section class="overlay bet-overlay">
                    <bet-selector-panel
                      title="Select BET"
                      .availableLabel=${t.betAvailableLabel}
                      .availableCoin=${this.coin}
                      .bet=${this.currentBet}
                      start-label="START"
                      .instructionText=${t.betInstruction}
                      .disableDecrease=${this.currentBet <= MIN_BET || this.coin < MIN_BET}
                      .disableIncrease=${this.coin < MIN_BET || this.currentBet >= this.coin}
                      .disableStart=${this.coin < this.currentBet || this.coin < MIN_BET}
                      .showTools=${true}
                      @bet-home=${this.onHomeFromBet}
                      @bet-settings=${() => this.openPanelFromBet('settings')}
                      @bet-guide=${() => this.openPanelFromBet('guide')}
                      @bet-decrease=${this.decreaseBet}
                      @bet-increase=${this.increaseBet}
                      @bet-value-change=${this.onBetValueChange}
                      @bet-start=${this.placeBetAndDeal}
                    ></bet-selector-panel>
                  </section>
                `
        : null}
          </div>
        </div>

        <!-- フィードバックは拡大ステージ(.stage)の transform 外に置く＝position:fixed が viewport 基準で
             効き、スマホのキーボードでも縮まず文字も実 px。Memory と同じ配置（共通部品 game-feedback）。 -->
        <game-feedback
          .lang=${this.selectedLanguage}
          gameTitle="blackjack-game"
          @feedback-interact=${() => this.playEffect('submit')}
        ></game-feedback>
      </div>
    `
  }

  static styles = [sharedOverlayStyles, sharedBetStatusStyles, sharedCoinRecoveryStyles, sharedNoMoreBetStyles, sharedResultOverlayStyles, sharedResultBannerStyles, sharedGameHostStyles, sharedGameStageStyles, utilities, css`
    :host {
      width: 100vw;
      height: 100vh;
      --footer-height-rate: 8%;
      /*
       * Percentage values are converted from the previous 540x960 stage pixel baseline.
       * - row gap: 8px -> 0.833%
       * - header top offset: 4px -> 0.417%
       * - table height: full stage -> 100%
       */
      --table-row-gap: 0.833%;
      /* 左右インセットは 8px グリッド規約に統一（high-low/memory と同値）。
         論理ステージ幅は 540px 固定なので literal 8px がそのまま 8px として効く。 */
      --table-side-padding: 8px;
      --header-top-gap: 0.417%;
      --bj-table-height: 100%;
      --bj-hand-padding-y: 0.625%;
      --bj-hand-padding-x: 1.852%;
      --bj-cards-min-height: 24.6%;
      --bj-actions-padding-bottom: 1.042%;
    }

    .table {
      height: var(--bj-table-height);
      display: flex;
      flex-direction: column;
      gap: var(--table-row-gap);
      padding: 0 var(--table-side-padding) 0;
      position: relative;
    }

    .stats-panel {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      justify-content: center;
      gap: 6px;
      font-size: 18px;
      font-weight: 700;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      padding: 6px 8px;
      white-space: nowrap;
      text-align: center;
    }

    game-top-header {
      margin-top: var(--header-top-gap);
    }

    .legacy-hidden {
      display: none;
    }

    .hand-section {
      background: rgba(9, 22, 24, 0.68);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      padding: var(--bj-hand-padding-y) var(--bj-hand-padding-x);
      display: grid;
      grid-template-rows: auto 1fr;
      align-items: stretch;
      flex: 1 1 0;
      min-height: 0;
    }

    .hand-section.result {
      opacity: 1;
    }

    .hand-section.player {
      grid-template-rows: auto 1fr auto;
      margin-top: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      margin-bottom: 2px;
    }

    h2 {
      font-size: 24px;
      letter-spacing: 0.02em;
      line-height: 1.2;
      margin: 0;
    }

    .hand-title {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      min-height: 34px;
      white-space: nowrap;
    }

    .hand-title-prefix {
      flex: 0 0 auto;
    }

    .hand-title-score {
      display: inline-block;
      min-width: 10ch;
      text-align: left;
    }

    .cards {
      position: relative;
      display: flex;
      flex: 1;
      justify-content: center;
      align-items: center;
      min-height: var(--bj-cards-min-height);
      width: 100%;
      box-sizing: border-box;
      padding-top: 0;
    }

    .score-banner {
      position: absolute;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 5;
      pointer-events: none;
      color: #f2f6f7;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
      animation: none;
    }

    .coin-delta-banner {
      position: absolute;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 5;
      pointer-events: none;
      font-size: 28px;
    }

    .cards.compact {
      justify-content: center;
    }

    .card {
      width: 152px;
      max-width: 152px;
      aspect-ratio: 13 / 18;
      margin-right: calc(-1 * var(--card-overlap, 0px));
      position: relative;
      flex: 0 0 auto;
    }

    .card:last-child {
      margin-right: 0;
    }

    .card img {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 12px;
      border: 0;
      background: transparent;
      object-fit: contain;
      box-shadow: none;
    }

    .fallback {
      position: absolute;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 18px;
      padding: 8px;
      color: #d8f1ff;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: linear-gradient(160deg, #1d3340, #0f1f28);
      box-shadow: 0 8px 14px rgba(0, 0, 0, 0.5);
    }

    .card img[style*='display: none'] + .fallback {
      display: flex;
    }

    .actions {
      display: grid;
      gap: 6px;
      margin-top: -2.2%;
      padding-top: 0;
      position: relative;
    }

    .dev-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }

    .dev-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #d9edf2;
    }

    .dev-input {
      width: 86px;
      min-height: 36px;
      border-radius: 9px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(6, 14, 16, 0.65);
      color: #f4fbff;
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      outline: none;
    }

    .dev-input:disabled {
      opacity: 0.45;
    }

    .debug-modal {
      display: grid;
      gap: 12px;
    }

    .debug-count {
      margin: 0;
      white-space: pre-line;
      line-height: 1.35;
      font-size: 20px;
      font-weight: 700;
      color: #f2f6f7;
    }

    .debug-close-btn {
      min-height: 48px;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      width: 100%;
      padding: 0 0 var(--bj-actions-padding-bottom);
      box-sizing: border-box;
    }

    .region-footer {
      display: grid;
      align-items: end;
      flex: 0 0 var(--footer-height-rate);
      margin-top: auto;
      min-height: 0;
    }

    .continue-row {
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(100% + 12px);
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .continue-btn {
      width: calc((100% - 8px) / 2);
      min-width: 0;
      min-height: 64px;
      font-size: 20px;
      box-sizing: border-box;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .continue-btn {
        min-height: 56px;
      }
    }

    .action-buttons button {
      width: 100%;
      min-width: 0;
      min-height: 64px;
      font-size: 20px;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .action-buttons button {
        min-height: 56px;
      }
    }

    button {
      min-width: 120px;
      min-height: 56px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f4fbff;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: opacity 120ms ease;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      button {
        min-height: 48px;
      }
    }

    button.is-disabled {
      cursor: default;
      opacity: 0.25;
    }

    button:disabled {
      cursor: default;
      opacity: 0.25;
    }
  `, classicBlueActionButtonStyles]
}


