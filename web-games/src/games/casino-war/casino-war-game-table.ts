import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { SUITS, cardValueFromNumber, createCard } from '../../shared/domain/card'
import type { Card } from '../../shared/domain/types'
import { MathRandomSource } from '../../shared/infra/random'
import { DEFAULT_SHARED_COIN, ensurePlayableSharedCoin, loadSharedCoin, saveSharedCoin } from '../../shared/infra/shared-coin-store'
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
import { sharedOverlayStyles, sharedBetStatusStyles, sharedCoinRecoveryStyles, sharedResultBannerStyles } from '../../shared/ui/styles/shared-game-ui-styles'
import { sharedGameHostStyles, sharedGameStageStyles } from '../../shared/ui/styles/shared-game-layout-styles'
import { utilities } from '../../shared/ui/styles/utilities'
import { classicBlueActionButtonStyles } from '../../shared/ui/classic-button.styles'
import { recoverSharedCoin, runNoMoreBetSequence, scheduleCoinRecoveryDialogIfZero, sharedNoMoreBetStyles, sharedResultOverlayStyles } from '../../shared/ui/styles/shared'
import { runToolbarSizeCheck } from '../../shared/ui/chrome/toolbar-size-check'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import { playTrackedEffect } from '../../shared/infra/submit-sound'
import '../../shared/ui/chrome/game-top-header'
import { renderSettingsPanel } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'
import '../../shared/ui/chrome/game-footer-bar'
import '../../shared/ui/chrome/game-feedback'
import type { GameFeedback } from '../../shared/ui/chrome/game-feedback'
import '../../shared/ui/panels/numpad-dialog-panel'
import '../../shared/ui/panels/remove-ads-dialog-panel'
import { coinIcon } from '../../shared/ui/icons/coin-icon'

const CASINO_WAR_GAME_ID = 'casino-war'
const REVEAL_STEP_MS = 260
const WAR_REVEAL_STEP_MS = 260

type WarRoundResult = 'WIN' | 'LOSE' | 'TIE'
type WarPhase = 'ready' | 'dealing' | 'tie_choice' | 'war_dealing' | 'result'
type ConfirmAction = 'reset-points' | 'clear-cache' | 'go-home' | null
type RoundMode = 'normal' | 'surrender' | 'war_win' | 'war_lose' | 'war_tie'
type DebugTieMode = 'normal' | 'deal_tie_once' | 'deal_and_war_tie'

@customElement('casino-war-game-table')
export class CasinoWarGameTable extends LitElement {
  private readonly random = new MathRandomSource()
  private revealTimerIds: number[] = []
  private coinRecoveryDialogTimerId: number | null = null
  private pendingStake = 0
  private lastResultDelta = 0
  private lastTiePayout = 0
  private roundMode: RoundMode = 'normal'

  @state()
  private coin = 100

  @state()
  private anteBet = 0

  @state()
  private tieBet = 0

  @state()
  private phase: WarPhase = 'ready'

  @state()
  private playerCard: Card | null = null

  @state()
  private dealerCard: Card | null = null

  @state()
  private warPlayerCard: Card | null = null

  @state()
  private warDealerCard: Card | null = null

  @state()
  private revealedCardCount = 0

  @state()
  private warRevealedCardCount = 0

  @state()
  private roundResult: WarRoundResult | null = null

  @state()
  private tieHit = false

  @state()
  private isSoundEnabled = true

  @state()
  private isBgmEnabled = false

  @state()
  private selectedLanguage: AppLanguage = 'en'

  @state()
  private appConfig: AppConfigRoot | null = null

  @state()
  private activePanel: 'settings' | 'guide' | null = null

  @state()
  private confirmAction: ConfirmAction = null

  @state()
  private isCoinRecoveryDialogOpen = false

  @state()
  private isNoMoreBetVisible = false

  @state()
  private warBet = 0

  @state()
  private initialTieActive = false

  @state()
  private debugTieMode: DebugTieMode = 'normal'

  @state()
  private betInputDialogType: 'ante' | 'tie' | null = null

  private holdTimer: ReturnType<typeof setTimeout> | null = null
  private holdInterval: ReturnType<typeof setInterval> | null = null
  private isRepeating = false
  private touchActive = false

  @state()
  private isDebugDialogOpen = false

  @state()
  private debugGameCount = 0
  @state() private adMockOpen = false
  @state() private soundHelpOpen = false
  private adMockCount = 0

  @state()
  private placedAnteBets: number[] = []

  @state()
  private placedTieBets: number[] = []

  private totalSelectedBet(): number {
    return this.anteBet + this.tieBet
  }

  private displayCoin(): number {
    return this.coin
  }

  connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('resize', this.updateScale)
    this.loadSettings()
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    this.clearRevealTimers()
    this.clearCoinRecoveryDialogTimer()
    super.disconnectedCallback()
  }

  firstUpdated(): void {
    this.updateScale()
    requestAnimationFrame(() => runToolbarSizeCheck(this, 'casino-war'))
    this.coin = ensurePlayableSharedCoin()
    this.restoreCoinFromPendingStakeIfNeeded()
    void this.loadConfig()
    this.prepareRound()
  }

  public handleSystemBack(): boolean {
    if (this.confirmAction === 'go-home') {
      return true
    }
    if (this.confirmAction) {
      this.cancelConfirmAction()
      return true
    }
    if (this.activePanel) {
      this.closePanel()
      return true
    }
    this.onHomeClick()
    return true
  }

  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  private loadSettings(): void {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY)
    const savedBgm = localStorage.getItem(BGM_ENABLED_KEY)
    this.isSoundEnabled = saved !== 'false'
    this.isBgmEnabled = savedBgm === null || savedBgm.trim() === '' ? true : savedBgm === 'true'
    console.log('[CASINO-WAR loadSettings]', { saved, isSoundEnabled: this.isSoundEnabled, savedBgm, isBgmEnabled: this.isBgmEnabled })
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    if (savedLanguage === 'ja' || savedLanguage === 'zh' || savedLanguage === 'en') {
      this.selectedLanguage = savedLanguage
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      this.appConfig = await loadAppConfig('casino-war')
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

  private restoreCoinFromPendingStakeIfNeeded(): void {
    const pending = takePendingStake(CASINO_WAR_GAME_ID)
    if (pending <= 0) {
      return
    }
    this.pendingStake = 0
    this.coin = saveSharedCoin(this.coin + pending)
  }

  private assetUrl(relativePath: string): string {
    return buildGameAssetUrl(relativePath)
  }

  private prepareRound(): void {
    this.clearRevealTimers()
    this.pendingStake = 0
    clearPendingStake(CASINO_WAR_GAME_ID)
    this.playerCard = null
    this.dealerCard = null
    this.warPlayerCard = null
    this.warDealerCard = null
    this.revealedCardCount = 0
    this.warRevealedCardCount = 0
    this.roundResult = null
    this.tieHit = false
    this.roundMode = 'normal'
    this.initialTieActive = false
    this.warBet = 0
    this.warPlayerCard = null
    this.warDealerCard = null
    this.warRevealedCardCount = 0
    this.lastResultDelta = 0
    this.lastTiePayout = 0
    this.roundMode = 'normal'
    this.warBet = 0
    this.initialTieActive = false
    this.isNoMoreBetVisible = false
    this.placedAnteBets = []
    this.placedTieBets = []
    this.normalizeBets()
    this.phase = 'ready'
  }

  private normalizeBets(): void {
    if (this.coin <= 0) {
      this.anteBet = 0
      this.tieBet = 0
      return
    }
    if (this.anteBet < 0) {
      this.anteBet = 0
    }
    if (this.anteBet > this.coin) {
      this.anteBet = this.coin
    }
    const maxTie = Math.max(0, this.coin - this.anteBet)
    if (this.tieBet < 0) {
      this.tieBet = 0
    }
    if (this.tieBet > maxTie) {
      this.tieBet = maxTie
    }
  }

  private increaseAnteBet(): void {
    if (!this.isBetSpotEditable() || this.coin <= 0) {
      return
    }
    const total = this.anteBet + this.tieBet
    if (total >= this.coin) {
      return
    }
    if (!this.isRepeating) {
      this.playEffect('submit')
    }
    this.anteBet = Math.min(this.coin, this.anteBet + 1)
    const maxTie = Math.max(0, this.coin - this.anteBet)
    if (this.tieBet > maxTie) {
      this.tieBet = maxTie
    }
  }

  private decreaseAnteBet(): void {
    if (!this.isBetSpotEditable() || this.anteBet <= 0) {
      return
    }
    if (!this.isRepeating) {
      this.playEffect('submit')
    }
    this.anteBet = Math.max(0, this.anteBet - 1)
  }

  private increaseTieBet(): void {
    if (!this.isBetSpotEditable()) {
      return
    }
    const maxTie = Math.max(0, this.coin - this.anteBet)
    if (this.tieBet >= maxTie) {
      return
    }
    if (!this.isRepeating) {
      this.playEffect('submit')
    }
    this.tieBet = Math.min(maxTie, this.tieBet + 1)
  }

  private decreaseTieBet(): void {
    if (!this.isBetSpotEditable() || this.tieBet <= 0) {
      return
    }
    if (!this.isRepeating) {
      this.playEffect('submit')
    }
    this.tieBet = Math.max(0, this.tieBet - 1)
  }

  private startHold(callback: () => void, event?: Event): void {
    if (event?.type.startsWith('mouse') && this.touchActive) {
      return
    }
    if (event?.type.startsWith('touch')) {
      this.touchActive = true
      event.preventDefault()
    }
    this.stopHold()
    this.isRepeating = false
    callback()
    this.holdTimer = setTimeout(() => {
      this.isRepeating = true
      this.holdInterval = setInterval(() => {
        callback()
      }, 100)
    }, 500)
  }

  private stopHold(event?: Event): void {
    if (event?.type.startsWith('mouse') && this.touchActive) {
      return
    }
    if (event?.type === 'touchend' || event?.type === 'touchcancel') {
      setTimeout(() => {
        this.touchActive = false
      }, 300)
    }
    this.isRepeating = false
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer)
      this.holdTimer = null
    }
    if (this.holdInterval !== null) {
      clearInterval(this.holdInterval)
      this.holdInterval = null
    }
  }

  private openBetInputDialog(type: 'ante' | 'tie'): void {
    if (!this.isBetSpotEditable()) {
      return
    }
    this.betInputDialogType = type
  }

  private closeBetInputDialog(): void {
    this.betInputDialogType = null
  }

  private onNumpadConfirm(event: CustomEvent<{ value: number }>): void {
    const value = event.detail.value
    if (this.betInputDialogType === 'ante') {
      this.anteBet = Math.min(value, this.coin)
    } else if (this.betInputDialogType === 'tie') {
      const maxTie = Math.max(0, this.coin - this.anteBet)
      this.tieBet = Math.min(value, maxTie)
    }
    this.normalizeBets()
    this.closeBetInputDialog()
  }

  private canDeal(): boolean {
    return this.anteBet > 0 && this.tieBet >= 0 && this.totalSelectedBet() <= this.coin
  }

  private startDeal(): void {
    if (this.phase === 'dealing') {
      return
    }
    this.normalizeBets()
    if (this.anteBet <= 0) {
      console.error('Cannot DEAL when ANTE is 0.')
      return
    }
    if (!this.canDeal()) {
      if (this.coin <= 0) {
        this.isCoinRecoveryDialogOpen = true
      }
      return
    }
    this.playEffect('submit')
    const totalStake = this.anteBet + this.tieBet
    this.coin = saveSharedCoin(this.coin - totalStake)
    this.placedAnteBets = [this.anteBet]
    this.placedTieBets = this.tieBet > 0 ? [this.tieBet] : []
    this.pendingStake = totalStake
    savePendingStake(CASINO_WAR_GAME_ID, totalStake)
    const initialCards = this.drawInitialCards()
    this.playerCard = initialCards.player
    this.dealerCard = initialCards.dealer
    this.roundResult = null
    this.tieHit = false
    this.lastResultDelta = 0
    this.revealedCardCount = 0
    this.phase = 'dealing'
    this.isNoMoreBetVisible = false
    this.clearRevealTimers()
    runNoMoreBetSequence({
      schedule: (callback, delayMs) => this.scheduleRevealTimer(callback, delayMs),
      setVisible: (visible) => {
        this.isNoMoreBetVisible = visible
      },
      playEffect: (name) => this.playEffect(name),
      onComplete: () => this.startRevealAnimation()
    })
  }

  private drawCard(): Card {
    const number = this.random.nextInt(13) + 1
    const suit = SUITS[this.random.nextInt(SUITS.length)]
    return createCard(suit, cardValueFromNumber(number), number)
  }

  private drawInitialCards(): { player: Card; dealer: Card } {
    if (this.debugTieMode === 'normal') {
      return {
        player: this.drawCard(),
        dealer: this.drawCard()
      }
    }
    return this.drawForcedTieCards()
  }

  private drawWarCards(): { player: Card; dealer: Card } {
    if (this.debugTieMode !== 'deal_and_war_tie') {
      return {
        player: this.drawCard(),
        dealer: this.drawCard()
      }
    }
    return this.drawForcedTieCards()
  }

  private drawForcedTieCards(): { player: Card; dealer: Card } {
    const number = this.random.nextInt(13) + 1
    const playerSuit = SUITS[this.random.nextInt(SUITS.length)]
    const dealerSuit = SUITS[this.random.nextInt(SUITS.length)]
    return {
      player: createCard(playerSuit, cardValueFromNumber(number), number),
      dealer: createCard(dealerSuit, cardValueFromNumber(number), number)
    }
  }

  private startRevealAnimation(): void {
    this.clearRevealTimers()
    for (let i = 0; i < 2; i += 1) {
      this.scheduleRevealTimer(() => {
        this.revealedCardCount = i + 1
        this.playEffect('hit')
        if (i === 1) {
          this.resolveRound()
        }
      }, REVEAL_STEP_MS * (i + 1))
    }
  }

  private cardRank(card: Card): number {
    return card.number === 1 ? 14 : card.number
  }

  private resolveRound(): void {
    if (!this.playerCard || !this.dealerCard) {
      return
    }
    const playerRank = this.cardRank(this.playerCard)
    const dealerRank = this.cardRank(this.dealerCard)
    this.tieHit = this.playerCard.number === this.dealerCard.number
    if (playerRank > dealerRank) {
      this.roundResult = 'WIN'
    } else if (playerRank < dealerRank) {
      this.roundResult = 'LOSE'
    } else {
      this.roundResult = 'TIE'
    }

    if (this.roundResult === 'TIE') {
      this.settleTieSideOnInitialTie()
      this.initialTieActive = true
      this.phase = 'tie_choice'
      this.playEffect('push')
      return
    }

    const tiePayout = 0
    const antePayout = this.roundResult === 'WIN' ? this.anteBet * 2 : 0
    const totalStake = this.anteBet + this.tieBet
    const totalPayout = antePayout + tiePayout
    this.lastTiePayout = tiePayout
    this.lastResultDelta = totalPayout - totalStake
    this.coin = saveSharedCoin(this.coin + totalPayout)
    this.normalizeBets()
    this.pendingStake = 0
    clearPendingStake(CASINO_WAR_GAME_ID)
    this.phase = 'result'
    this.roundMode = 'normal'
    this.scheduleCoinRecoveryDialogIfZero()

    if (this.roundResult === 'LOSE') {
      this.playEffect('lose')
    } else {
      this.playEffect('payout')
    }
    this.showAdMockIfNeeded()
  }

  private settleTieSideOnInitialTie(): void {
    const tiePayout = this.tieBet * 12
    this.lastTiePayout = tiePayout
    if (tiePayout > 0) {
      this.coin = saveSharedCoin(this.coin + tiePayout)
    }
    this.pendingStake = this.anteBet
    savePendingStake(CASINO_WAR_GAME_ID, this.pendingStake)
  }

  private canSelectWar(): boolean {
    return this.coin >= this.anteBet
  }

  private onSurrender(): void {
    if (this.phase !== 'tie_choice') {
      return
    }
    this.playEffect('submit')
    const tiePayout = this.lastTiePayout
    const anteRefund = Math.floor(this.anteBet / 2)
    const totalPayout = tiePayout + anteRefund
    const totalStake = this.anteBet + this.tieBet
    this.lastResultDelta = totalPayout - totalStake
    this.coin = saveSharedCoin(this.coin + anteRefund)
    this.pendingStake = 0
    clearPendingStake(CASINO_WAR_GAME_ID)
    this.phase = 'result'
    this.roundMode = 'surrender'
    this.normalizeBets()
    this.scheduleCoinRecoveryDialogIfZero()
    this.showAdMockIfNeeded()
  }

  private onWar(): void {
    if (this.phase !== 'tie_choice') {
      return
    }
    if (!this.canSelectWar()) {
      return
    }
    this.playEffect('submit')
    this.warBet = this.anteBet
    this.coin = saveSharedCoin(this.coin - this.warBet)
    this.placedAnteBets = [...this.placedAnteBets, this.warBet]
    this.pendingStake += this.warBet
    savePendingStake(CASINO_WAR_GAME_ID, this.pendingStake)
    const warCards = this.drawWarCards()
    this.warPlayerCard = warCards.player
    this.warDealerCard = warCards.dealer
    this.warRevealedCardCount = 0
    this.phase = 'war_dealing'
    this.startWarRevealAnimation()
  }

  private startWarRevealAnimation(): void {
    this.clearRevealTimers()
    for (let i = 0; i < 2; i += 1) {
      this.scheduleRevealTimer(() => {
        this.warRevealedCardCount = i + 1
        this.playEffect('hit')
        if (i === 1) {
          this.resolveWarRound()
        }
      }, WAR_REVEAL_STEP_MS * (i + 1))
    }
  }

  private resolveWarRound(): void {
    if (!this.warPlayerCard || !this.warDealerCard) {
      return
    }
    const playerRank = this.cardRank(this.warPlayerCard)
    const dealerRank = this.cardRank(this.warDealerCard)
    const tiePayout = this.lastTiePayout
    this.lastTiePayout = tiePayout
    const totalStake = this.anteBet + this.tieBet + this.warBet

    let finalPayout = 0
    if (playerRank > dealerRank) {
      this.roundResult = 'WIN'
      this.roundMode = 'war_win'
      finalPayout += this.anteBet + this.warBet * 2
    } else if (playerRank < dealerRank) {
      this.roundResult = 'LOSE'
      this.roundMode = 'war_lose'
    } else {
      this.roundResult = 'TIE'
      this.roundMode = 'war_tie'
      // Consecutive tie in WAR: pay BONUS as 4x of initial ANTE.
      finalPayout += this.anteBet * 4
    }

    this.lastResultDelta = tiePayout + finalPayout - totalStake
    this.coin = saveSharedCoin(this.coin + finalPayout)
    this.pendingStake = 0
    clearPendingStake(CASINO_WAR_GAME_ID)
    this.phase = 'result'
    this.normalizeBets()
    this.scheduleCoinRecoveryDialogIfZero()
    if (this.roundResult === 'LOSE') {
      this.playEffect('lose')
    } else {
      this.playEffect('payout')
    }
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

  private onHomeClick(): void {
    if (this.confirmAction === 'go-home') {
      return
    }
    this.playEffect('submit')
    this.confirmAction = 'go-home'
  }

  private openPanel(panel: 'settings' | 'guide'): void {
    this.playEffect('submit')
    this.activePanel = panel
  }

  private closePanel(): void {
    this.playEffect('submit')
    this.activePanel = null
  }

  private setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
    console.log('[CASINO-WAR setSoundEnabled]', { enabled, saved: localStorage.getItem(SOUND_ENABLED_KEY) })
  }

  private setBgmEnabled(enabled: boolean): void {
    this.isBgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
  }

  private cancelConfirmAction(): void {
    this.playEffect('submit')
    this.confirmAction = null
  }

  private confirmCurrentAction(): void {
    this.playEffect('submit')
    const action = this.confirmAction
    this.confirmAction = null
    if (action === 'go-home') {
      this.refundPendingStakeIfNeeded()
      this.dispatchEvent(
        new CustomEvent('go-home', {
          bubbles: true,
          composed: true
        })
      )
      return
    }
    if (action === 'reset-points') {
      this.pendingStake = 0
      clearPendingStake(CASINO_WAR_GAME_ID)
      this.coin = saveSharedCoin(DEFAULT_SHARED_COIN)
      this.normalizeBets()
      return
    }
    if (action === 'clear-cache') {
      this.pendingStake = 0
      clearPendingStake(CASINO_WAR_GAME_ID)
      const coin = loadSharedCoin()
      clearLocalStoragePreservingProgress([
        { key: LANGUAGE_KEY, value: this.selectedLanguage },
        { key: SOUND_ENABLED_KEY, value: String(this.isSoundEnabled) }
      ])
      saveBgmEnabledSetting(this.isBgmEnabled)
      this.coin = saveSharedCoin(coin)
      this.normalizeBets()
    }
  }

  private refundPendingStakeIfNeeded(): void {
    if (this.pendingStake <= 0) {
      clearPendingStake(CASINO_WAR_GAME_ID)
      return
    }
    this.coin = saveSharedCoin(this.coin + this.pendingStake)
    this.pendingStake = 0
    clearPendingStake(CASINO_WAR_GAME_ID)
  }

  private confirmCoinRecovery(): void {
    this.playEffect('submit')
    this.clearCoinRecoveryDialogTimer()
    this.coin = recoverSharedCoin()
    this.normalizeBets()
    this.isCoinRecoveryDialogOpen = false
    this.prepareRound()
    window.setTimeout(() => {
      const bridge = getAndroidBillingBridge()
      bridge?.showRecoveryInterstitialAd?.() ?? bridge?.showInterstitialAd?.()
    }, 0)
  }

  private clearCoinRecoveryDialogTimer(): void {
    if (this.coinRecoveryDialogTimerId !== null) {
      window.clearTimeout(this.coinRecoveryDialogTimerId)
      this.coinRecoveryDialogTimerId = null
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

  private playEffect(name: string): void {
    if (!this.isSoundEnabled) {
      return
    }
    // 再生/追跡/一括停止は共有 submit-sound に集約（ホーム戻り時 stopAllEffects で止まる）。
    playTrackedEffect(this.assetUrl(`effects/${name}.mp3`))
  }

  private clearRevealTimers(): void {
    this.revealTimerIds.forEach((id) => window.clearTimeout(id))
    this.revealTimerIds = []
  }

  private scheduleRevealTimer(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.revealTimerIds = this.revealTimerIds.filter((timerId) => timerId !== id)
      callback()
    }, delayMs)
    this.revealTimerIds = [...this.revealTimerIds, id]
  }

  private isCardVisible(index: number): boolean {
    return this.revealedCardCount > index
  }

  private isWarCardVisible(index: number): boolean {
    return this.warRevealedCardCount > index
  }

  private uiText() {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.selectedLanguage) : undefined
    const overview = block?.overview_info
    const settings = block?.settings
    const common = block?.common
    const game = block?.game
    const chrome = getSharedChromeText(this.selectedLanguage)
    const customGuideContent = getLocalizedString(overview, 'guide_content')
    if (overview && !customGuideContent) {
      throw new Error('guide_content がありません。build_content.py で生成してください（直書きフォールバック禁止）。')
    }
    const guideLines = splitTextLines(customGuideContent).filter((line) => line.length > 0)
    return {
      title: getLocalizedString(game, 'casino_war_title') || 'CASINO WAR',
      home: chrome.home,
      settings: chrome.settings,
      guide: chrome.guide,
      settingsTitle: chrome.settings,
      languageLabel: getLocalizedString(settings, 'language') || 'Language',
      effectLabel: getLocalizedString(settings, 'sound_effect') || 'Effect',
      bgmLabel: getLocalizedString(settings, 'bgm') || 'BGM',
      clearStatsLabel: getLocalizedString(settings, 'reset_points') || 'Reset Points',
      clearCacheLabel: getLocalizedString(settings, 'clear_cache') || 'Clear Cache',
      guideTitle: chrome.guideOverview,
      guideLines,
      okLabel: chrome.ok,
      confirmTitle: getLocalizedString(common, 'confirm') || 'Confirm',
      confirmCancel: chrome.cancel,
      leaveTitle: chrome.leaveTitle,
      leaveGameConfirmMessage: chrome.leaveMessage,
      resetConfirmMessage: getLocalizedString(settings, 'reset_points_confirm_message') || 'Reset points to 100?',
      clearCacheConfirmMessage: getLocalizedString(settings, 'clear_cache_confirm_message') || 'Clear local cache?',
      anteLabel: getLocalizedString(game, 'casino_war_ante') || 'ANTE',
      tieLabel: getLocalizedString(game, 'casino_war_tie') || 'TIE',
      dealLabel: getLocalizedString(game, 'casino_war_deal') || 'DEAL',
      continueLabel: getLocalizedString(game, 'casino_war_continue') || 'CONTINUE',
      statusReady: getLocalizedString(game, 'casino_war_status_ready') || 'Tap ANTE/TIE to adjust bets, then tap DEAL.',
      statusDealing: getLocalizedString(game, 'casino_war_status_dealing') || 'Dealing cards...',
      tieChoiceMessage: getLocalizedString(game, 'casino_war_tie_choice_message') || 'Tie. Choose WAR or SURRENDER.',
      warDealingMessage: getLocalizedString(game, 'casino_war_war_dealing_message') || 'War dealing...',
      statusWin: getLocalizedString(game, 'casino_war_status_win') || 'WIN',
      statusLose: getLocalizedString(game, 'casino_war_status_lose') || 'LOSE',
      statusTie: getLocalizedString(game, 'casino_war_status_tie') || 'TIE',
      playerWinLabel: getLocalizedString(game, 'casino_war_player_win') || 'PLAYER WIN',
      playerLoseLabel: getLocalizedString(game, 'casino_war_player_lose') || 'PLAYER LOSE',
      playerTieLabel: getLocalizedString(game, 'casino_war_player_tie') || 'PUSH',
      tieHitLabel: getLocalizedString(game, 'casino_war_tie_hit') || 'TIE HIT',
      tieMissLabel: getLocalizedString(game, 'casino_war_tie_miss') || 'TIE MISS',
      playerLabel: getLocalizedString(game, 'casino_war_player') || 'PLAYER',
      dealerLabel: getLocalizedString(game, 'casino_war_dealer') || 'DEALER',
      noMoreBetLabel: getLocalizedString(game, 'casino_war_no_more_bets') || 'No more Bets.',
      debugTieTitle: getLocalizedString(game, 'casino_war_debug_tie_title') || 'Debug',
      debugTieNormal: getLocalizedString(game, 'casino_war_debug_tie_normal') || 'Normal',
      debugTieOnce: getLocalizedString(game, 'casino_war_debug_tie_once') || 'Initial tie only',
      debugTieTwice: getLocalizedString(game, 'casino_war_debug_tie_twice') || 'Initial + war tie',
      warLabel: getLocalizedString(game, 'casino_war_war') || 'WAR',
      bonusLabel: getLocalizedString(game, 'casino_war_bonus') || 'BONUS',
      surrenderLabel: getLocalizedString(game, 'casino_war_surrender') || 'SURRENDER',
      warWinLabel: getLocalizedString(game, 'casino_war_result_war_win') || 'WAR WIN',
      warLoseLabel: getLocalizedString(game, 'casino_war_result_war_lose') || 'WAR LOSE',
      warTieLabel: getLocalizedString(game, 'casino_war_result_war_tie') || 'WAR TIE',
      coinRecoveryTitle: getLocalizedString(game, 'casino_war_coin_recovery_title') || 'COIN Recovery',
      coinRecoveryLine1: getLocalizedString(game, 'casino_war_coin_recovery_line1') || 'COIN reached 0.',
      coinRecoveryLine2:
        (getLocalizedString(game, 'casino_war_coin_recovery_line2') || 'COIN will be reset to {coin} and the game will restart.')
          .replace('{coin}', String(DEFAULT_SHARED_COIN))
    }
  }

  private onFooterAction(event: CustomEvent<{ action: 'debug' | 'demo' }>): void {
    this.playEffect('submit')
    if (event.detail?.action === 'debug') {
      this.debugGameCount = peekGameCount(WEB_AD_COUNT_KEY)
      this.isDebugDialogOpen = true
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

  private statusMessage(t: ReturnType<CasinoWarGameTable['uiText']>): string {
    if (this.phase === 'ready') {
      return t.statusReady
    }
    if (this.phase === 'dealing') {
      return ''
    }
    if (this.phase === 'tie_choice') {
      return t.tieChoiceMessage
    }
    if (this.phase === 'war_dealing') {
      return ''
    }
    if (!this.roundResult) {
      return ''
    }
    const deltaToLabel = (value: number): string => {
      if (value > 0) {
        return `+${value}`
      }
      if (value < 0) {
        return `${value}`
      }
      return '0'
    }
    const totalLabel =
      this.lastResultDelta > 0 ? `COIN +${this.lastResultDelta}` : this.lastResultDelta < 0 ? `COIN ${this.lastResultDelta}` : 'EVEN 0 COIN'
    const toTwoLineEquation = (line: string): string => `${line}\n= ${totalLabel}`

    if (this.roundMode === 'war_tie') {
      const bonusLabel = `TIEx2 ${t.bonusLabel} +${this.anteBet * 4}`
      const mainBetTotal = this.anteBet + this.warBet
      if (this.tieBet > 0) {
        return toTwoLineEquation(`${bonusLabel} | ${t.tieLabel} +${this.tieBet * 11} | BET-${mainBetTotal}`)
      }
      return toTwoLineEquation(`${bonusLabel} | BET-${mainBetTotal}`)
    }

    if (this.tieBet <= 0) {
      return totalLabel
    }

    let anteDelta = 0
    let warDelta = 0
    if (this.roundMode === 'surrender') {
      anteDelta = -this.anteBet + Math.floor(this.anteBet / 2)
    } else if (this.roundMode === 'war_win') {
      anteDelta = 0
      warDelta = this.warBet
    } else if (this.roundMode === 'war_lose') {
      anteDelta = -this.anteBet
      warDelta = -this.warBet
    } else {
      anteDelta = this.roundResult === 'WIN' ? this.anteBet : -this.anteBet
    }
    const tieDelta = this.tieHit ? this.tieBet * 11 : -this.tieBet

    const equationParts = [`${t.anteLabel} ${deltaToLabel(anteDelta)}`]
    if (this.roundMode === 'war_win' || this.roundMode === 'war_lose') {
      equationParts.push(`${t.warLabel} ${deltaToLabel(warDelta)}`)
    }
    equationParts.push(`${t.tieLabel} ${deltaToLabel(tieDelta)}`)
    const tieResultLabel = this.tieHit ? t.tieHitLabel : t.tieMissLabel
    return toTwoLineEquation(`${tieResultLabel} / ${equationParts.join(' ')}`)
  }

  private onDebugTieModeChange(event: Event): void {
    const target = event.currentTarget
    if (!(target instanceof HTMLInputElement)) {
      return
    }
    if (target.value === 'normal' || target.value === 'deal_tie_once' || target.value === 'deal_and_war_tie') {
      this.debugTieMode = target.value
    }
  }

  private renderPlacedChips(values: number[], minSlots = 1): unknown {
    if (values.length <= 0) {
      return Array.from({ length: minSlots }, () => html`<div class="chip display-chip placeholder-chip"></div>`)
    }
    const chips = values.map((value) => html`<div class="chip display-chip">${value}</div>`)
    if (values.length >= minSlots) {
      return chips
    }
    return [...chips, html`<div class="chip display-chip placeholder-chip"></div>`]
  }

  private isBetSpotEditable(): boolean {
    return this.phase === 'ready'
  }

  private onContinue(): void {
    if (this.phase !== 'result') {
      return
    }
    this.playEffect('submit')
    this.prepareRound()
  }

  private winnerClass(target: 'dealer' | 'player'): string {
    if (this.phase !== 'result' || !this.roundResult) {
      return ''
    }
    if (this.roundResult === 'TIE') {
      return 'is-winner'
    }
    if (this.roundResult === 'WIN' && target === 'player') {
      return 'is-winner'
    }
    if (this.roundResult === 'LOSE' && target === 'dealer') {
      return 'is-winner'
    }
    return ''
  }

  private resultMessageImage(target: 'dealer' | 'player'): 'win' | 'lose' | 'tie' | null {
    if (this.phase === 'tie_choice') {
      return 'tie'
    }
    if (this.phase !== 'result' || !this.roundResult) {
      return null
    }
    if (this.roundResult === 'TIE') {
      return 'tie'
    }
    if (this.roundResult === 'WIN') {
      return target === 'player' ? 'win' : 'lose'
    }
    return target === 'dealer' ? 'win' : 'lose'
  }

  private isResultGlowEnabled(): boolean {
    return this.phase === 'result'
  }

  render() {
    const stageStyle = `background-image: url('${this.assetUrl('images/background.webp')}')`
    const t = this.uiText()
    const statusHeadline = this.statusMessage(t)
    const shouldGlow = this.isResultGlowEnabled()
    const canDeal = this.canDeal()
    const canDealAction = this.phase === 'ready' && canDeal
    const canContinue = this.phase === 'result'
    const dealerResultImage = this.resultMessageImage('dealer')
    const playerResultImage = this.resultMessageImage('player')
    const canEditBet = this.isBetSpotEditable()
    const displayCoin = this.displayCoin()
    const creditAnteValue = canEditBet ? this.anteBet : 0
    const creditTieValue = canEditBet ? this.tieBet : 0
    return html`
      <div class="screen-bg">
        <div class="stage" style=${stageStyle}>
          <div class="table">
            <section class="region-header">
              <game-top-header
                home-label=${t.home}
                settings-label=${t.settings}
                guide-label=${t.guide}
                .coin=${displayCoin}
                @header-home=${this.onHomeClick}
                @header-settings=${() => this.openPanel('settings')}
                @header-guide=${() => this.openPanel('guide')}
              ></game-top-header>
              <header class="bet-status war-bet-status">
                ${coinIcon()} COIN ${displayCoin}
              </header>
            </section>

            <section class="region-cards">
              <div class="bet-spots ${canEditBet ? 'is-editable' : 'is-locked'}">
                <div class="bet-spot ${canEditBet ? 'is-editable' : ''}">
                  <span class="bet-label">${t.anteLabel}</span>
                  <div class="bet-control-row">
                    <button class="bet-adjust-btn" @mousedown=${(e: Event) => this.startHold(() => this.decreaseAnteBet(), e)} @mouseup=${(e: Event) => this.stopHold(e)} @mouseleave=${(e: Event) => this.stopHold(e)} @touchstart=${(e: Event) => this.startHold(() => this.decreaseAnteBet(), e)} @touchend=${(e: Event) => this.stopHold(e)} @touchcancel=${(e: Event) => this.stopHold(e)} ?disabled=${!canEditBet || this.anteBet <= 0}>-</button>
                    <div class="bet-input" @click=${canEditBet ? () => this.openBetInputDialog('ante') : undefined}>${creditAnteValue}</div>
                    <button class="bet-adjust-btn" @mousedown=${(e: Event) => this.startHold(() => this.increaseAnteBet(), e)} @mouseup=${(e: Event) => this.stopHold(e)} @mouseleave=${(e: Event) => this.stopHold(e)} @touchstart=${(e: Event) => this.startHold(() => this.increaseAnteBet(), e)} @touchend=${(e: Event) => this.stopHold(e)} @touchcancel=${(e: Event) => this.stopHold(e)} ?disabled=${!canEditBet || this.totalSelectedBet() >= this.coin}>+</button>
                  </div>
                </div>
                <div class="bet-spot ${canEditBet ? 'is-editable' : ''}">
                  <span class="bet-label">${t.tieLabel}</span>
                  <div class="bet-control-row">
                    <button class="bet-adjust-btn" @mousedown=${(e: Event) => this.startHold(() => this.decreaseTieBet(), e)} @mouseup=${(e: Event) => this.stopHold(e)} @mouseleave=${(e: Event) => this.stopHold(e)} @touchstart=${(e: Event) => this.startHold(() => this.decreaseTieBet(), e)} @touchend=${(e: Event) => this.stopHold(e)} @touchcancel=${(e: Event) => this.stopHold(e)} ?disabled=${!canEditBet || this.tieBet <= 0}>-</button>
                    <div class="bet-input" @click=${canEditBet ? () => this.openBetInputDialog('tie') : undefined}>${creditTieValue}</div>
                    <button class="bet-adjust-btn" @mousedown=${(e: Event) => this.startHold(() => this.increaseTieBet(), e)} @mouseup=${(e: Event) => this.stopHold(e)} @mouseleave=${(e: Event) => this.stopHold(e)} @touchstart=${(e: Event) => this.startHold(() => this.increaseTieBet(), e)} @touchend=${(e: Event) => this.stopHold(e)} @touchcancel=${(e: Event) => this.stopHold(e)} ?disabled=${!canEditBet || this.tieBet >= Math.max(0, this.coin - this.anteBet)}>+</button>
                  </div>
                </div>
              </div>
              
              <div class="card-lane">
                <div class="card-row dealer-row">
                  <div class="card-stack">
                    <h3 class=${this.winnerClass('dealer')}>${t.dealerLabel}</h3>
                    <div class="card-layer">
                      ${dealerResultImage
        ? html`<img
                            class="result-overlay-image ${dealerResultImage === 'tie' ? 'is-tie' : ''}"
                            src=${this.assetUrl(`messages/${dealerResultImage}.png`)}
                            alt=${dealerResultImage}
                          />`
        : null}
                      ${this.dealerCard && this.isCardVisible(1)
        ? html`<img
                            class=${this.initialTieActive ? 'tie-base-card' : ''}
                            src=${this.assetUrl(`cards/${this.dealerCard.imagePath}`)}
                            alt="dealer card"
                            loading="lazy"
                          />`
        : html`<img src=${this.assetUrl('cards/back_card.png')} alt="card back" loading="lazy" />`}
                      ${this.warDealerCard && this.isWarCardVisible(1)
        ? html`<img class="war-card" src=${this.assetUrl(`cards/${this.warDealerCard.imagePath}`)} alt="dealer war card" loading="lazy" />`
        : null}
                    </div>
                  </div>
                </div>
                <div class="inline-result-banner">
                  ${statusHeadline.length > 0
        ? html`<div class="status-headline ${shouldGlow ? 'is-glow' : ''}">${statusHeadline}</div>`
        : html`<div class="status-headline placeholder" aria-hidden="true"></div>`}
                  <div class="hand-role-banner placeholder" aria-hidden="true"></div>
                </div>
                ${null /* Temporary fallback: keep old message box for rollback
                <div class="inline-message-panel message-panel">
                  <p>${this.statusMessage(t)}</p>
                </div>
                */}
                <div class="card-row player-row">
                  <aside class="player-bet-display ${canEditBet ? '' : 'is-locked'}">
                    <div class="display-chip-row">
                      <span>${t.anteLabel}</span>
                      <div class="display-chip-track">
                        ${this.renderPlacedChips(this.placedAnteBets, 2)}
                      </div>
                    </div>
                    <div class="display-chip-row">
                      <span>${t.tieLabel}</span>
                      <div class="display-chip-track">
                        ${this.renderPlacedChips(this.placedTieBets, 1)}
                      </div>
                    </div>
                  </aside>
                  <div class="card-stack">
                    <h3 class=${this.winnerClass('player')}>${t.playerLabel}</h3>
                    <div class="card-layer">
                      ${playerResultImage
        ? html`<img
                            class="result-overlay-image ${playerResultImage === 'tie' ? 'is-tie' : ''}"
                            src=${this.assetUrl(`messages/${playerResultImage}.png`)}
                            alt=${playerResultImage}
                          />`
        : null}
                      ${this.playerCard && this.isCardVisible(0)
        ? html`<img
                            class=${this.initialTieActive ? 'tie-base-card' : ''}
                            src=${this.assetUrl(`cards/${this.playerCard.imagePath}`)}
                            alt="player card"
                            loading="lazy"
                          />`
        : html`<img src=${this.assetUrl('cards/back_card.png')} alt="card back" loading="lazy" />`}
                      ${this.warPlayerCard && this.isWarCardVisible(0)
        ? html`<img class="war-card" src=${this.assetUrl(`cards/${this.warPlayerCard.imagePath}`)} alt="player war card" loading="lazy" />`
        : null}
                    </div>
                  </div>
                  <div class="player-side-spacer" aria-hidden="true"></div>
                </div>
              </div>
              ${this.isNoMoreBetVisible
        ? html`
                    <div class="no-more-bet">
                      <img class="no-more-bet-image" src=${this.assetUrl('messages/no_more_bets.png')} alt="No More Bets" />
                    </div>
                  `
        : null}
              ${this.phase === 'tie_choice'
        ? html`
                    <div class="tie-choice-panel">
                      <button @click=${this.onWar} ?disabled=${!this.canSelectWar()}>${t.warLabel}</button>
                      <button @click=${this.onSurrender}>${t.surrenderLabel}</button>
                    </div>
                  `
        : null}
            </section>

            <section class="region-actions actions">
              <div class="actions-row">
                <button @click=${this.startDeal} ?disabled=${!canDealAction}>${t.dealLabel}</button>
                <button class=${canContinue ? '' : 'is-disabled'} @click=${this.onContinue}>${t.continueLabel}</button>
              </div>
            </section>

            <section class="region-footer" aria-label="Footer Area">
              <game-footer-bar
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
                      <fieldset class="debug-mode-group">
                        <label class="debug-mode-option">
                          <input
                            type="radio"
                            name="debug-tie-mode"
                            value="normal"
                            .checked=${this.debugTieMode === 'normal'}
                            @change=${this.onDebugTieModeChange}
                          />
                          <span>${t.debugTieNormal}</span>
                        </label>
                        <label class="debug-mode-option">
                          <input
                            type="radio"
                            name="debug-tie-mode"
                            value="deal_tie_once"
                            .checked=${this.debugTieMode === 'deal_tie_once'}
                            @change=${this.onDebugTieModeChange}
                          />
                          <span>${t.debugTieOnce}</span>
                        </label>
                        <label class="debug-mode-option">
                          <input
                            type="radio"
                            name="debug-tie-mode"
                            value="deal_and_war_tie"
                            .checked=${this.debugTieMode === 'deal_and_war_tie'}
                            @change=${this.onDebugTieModeChange}
                          />
                          <span>${t.debugTieTwice}</span>
                        </label>
                      </fieldset>
                      <button class="debug-close-btn" @click=${this.closeDebugDialog}>CLOSE</button>
                    </div>
                  </section>
                `
        : null}
            ${this.activePanel === 'settings'
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

            ${this.activePanel === 'guide'
        ? html`
                  <section class="overlay">
                    <div class="modal">
                      <guide-overview-panel
                        .title=${t.guideTitle}
                        .lines=${t.guideLines}
                        .okLabel=${'OK'}
                        @guide-close=${this.closePanel}
                      ></guide-overview-panel>
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
                        .message=${this.confirmAction === 'reset-points'
            ? t.resetConfirmMessage
            : this.confirmAction === 'clear-cache'
              ? t.clearCacheConfirmMessage
              : t.leaveGameConfirmMessage}
                        .cancelLabel=${t.confirmCancel}
                        .okLabel=${t.okLabel}
                        @confirm-accept=${this.confirmCurrentAction}
                        @confirm-cancel=${this.cancelConfirmAction}
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

            ${this.betInputDialogType
        ? html`
                  <numpad-dialog-panel
                    .title=${this.betInputDialogType === 'ante' ? t.anteLabel : t.tieLabel}
                    .maxValue=${this.betInputDialogType === 'ante' ? this.coin : Math.max(0, this.coin - this.anteBet)}
                    .initialValue=${this.betInputDialogType === 'ante' ? this.anteBet : this.tieBet}
                    @numpad-cancel=${this.closeBetInputDialog}
                    @numpad-confirm=${this.onNumpadConfirm}
                  ></numpad-dialog-panel>
                `
        : null}

          </div>
        </div>

        <!-- フィードバックは拡大ステージ(.stage)の transform 外に置く＝position:fixed が viewport 基準で
             効き、スマホのキーボードでも縮まず文字も実 px。Memory と同じ配置（共通部品 game-feedback）。 -->
        <game-feedback
          .lang=${this.selectedLanguage}
          gameTitle="casino-war-game"
          @feedback-interact=${() => this.playEffect('submit')}
        ></game-feedback>
      </div>
    `
  }

  static styles = [sharedOverlayStyles, sharedBetStatusStyles, sharedCoinRecoveryStyles, sharedResultBannerStyles, sharedNoMoreBetStyles, sharedResultOverlayStyles, sharedGameHostStyles, sharedGameStageStyles, utilities, css`
    :host {
      width: 100%;
      height: 100%;
      /* Tune this (%) to move all center status messages up/down together. */
      --war-status-offset-y: 2%;
      --footer-height-rate: 8%;
      --table-row-gap: 8px;
    }

    .table {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--table-row-gap);
      /* 左右インセットは 8px グリッド規約に統一（blackjack/high-low/memory と同値）。 */
      padding: 0 8px 0;
      position: relative;
      box-sizing: border-box;
    }

    .region-header {
      display: grid;
      gap: 8px;
      padding-top: 4px;
      flex: 0 0 auto;
    }

    .war-bet-status {
      pointer-events: none;
      line-height: 1;
    }

    .debug-mode-group {
      margin: 0;
      padding: 6px 10px;
      border: 1px solid rgba(255, 255, 255, 0.32);
      border-radius: 10px;
      justify-self: center;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      background: rgba(6, 24, 20, 0.44);
      flex-wrap: nowrap;
      overflow-x: auto;
    }

    .debug-mode-option {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #f2f6f7;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      user-select: none;
      white-space: nowrap;
    }

    .debug-mode-option input {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: #f0d533;
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
      .debug-close-btn {
        min-height: 48px;
      }
    }

    .debug-close-btn:disabled {
      cursor: default;
      opacity: 0.25;
    }

    .region-cards {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 12px;
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
    }

    .bet-spots {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .bet-spots.is-locked .bet-spot {
      border-color: rgba(167, 174, 182, 0.56);
      background: rgba(54, 60, 66, 0.7);
      opacity: 0.62;
      filter: grayscale(0.88);
    }

    .bet-spot {
      min-height: 88px;
      border: 2px dashed rgba(240, 215, 51, 0.76);
      border-radius: 16px;
      display: grid;
      grid-template-rows: auto 1fr;
      align-items: center;
      justify-items: center;
      gap: 4px;
      background: rgba(8, 34, 24, 0.7);
      color: #f0d533;
      padding: 6px 6px;
      box-sizing: border-box;
    }

    .bet-label {
      font-size: 16px;
      font-weight: 800;
      color: #f0d533;
      line-height: 1;
    }

    .bet-spot.is-editable {
      animation: betPanelPulse 1800ms ease-in-out infinite;
    }

    @keyframes betPanelPulse {
      0% {
        border-color: rgba(240, 215, 51, 0.42);
      }
      50% {
        border-color: rgba(240, 215, 51, 0.98);
      }
      100% {
        border-color: rgba(240, 215, 51, 0.42);
      }
    }

    .chip {
      min-width: 44px;
      min-height: 40px;
      padding: 0 10px;
      border-radius: 999px;
      background: radial-gradient(circle at 35% 30%, #fff2b8, #f1b743 55%, #ab5f11);
      color: #241b05;
      font-size: 20px;
      font-weight: 800;
      display: grid;
      place-items: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
    }

    .bet-control-row {
      display: grid;
      grid-template-columns: auto auto auto;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }

    .bet-adjust-btn {
      min-width: 48px;
      min-height: 56px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.34);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f4fbff;
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: grid;
      place-items: center;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .bet-adjust-btn {
        min-height: 48px;
      }
    }

    .bet-adjust-btn:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .bet-input {
      width: 100px;
      max-width: 100px;
      min-height: 56px;
      padding: 0 4px;
      border-radius: 10px;
      border: 2px solid rgba(240, 215, 51, 0.6);
      background: radial-gradient(circle at 35% 30%, #fff2b8, #f1b743 55%, #ab5f11);
      color: #241b05;
      font-size: 18px;
      font-weight: 800;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      display: grid;
      place-items: center;
      overflow: hidden;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .bet-input {
        min-height: 48px;
      }
    }

    .card-lane {
      display: grid;
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
      min-height: 0;
      position: relative;
    }

    .card-row {
      min-height: 0;
      display: grid;
    }

    .dealer-row {
      justify-items: center;
      align-items: start;
      padding-top: 8px;
    }

    .player-row {
      grid-template-columns: minmax(0, 1fr) 170px minmax(0, 1fr);
      align-items: end;
      justify-items: center;
      column-gap: 8px;
      padding-bottom: 8px;
    }

    .player-bet-display {
      grid-column: 1;
      width: 112px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(8, 34, 24, 0.36);
      padding: 6px 4px;
      display: grid;
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 6px;
      transition: opacity 180ms ease;
    }

    .player-side-spacer {
      grid-column: 3;
      width: 112px;
      min-height: 1px;
    }

    .player-bet-display {
      animation: none;
    }

    .player-bet-display.is-locked {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(8, 34, 24, 0.36);
      opacity: 1;
      filter: none;
    }

    .display-chip-row {
      min-height: 0;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(5, 20, 16, 0.34);
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 4px;
      color: #f0d533;
      font-size: 14px;
      font-weight: 800;
      padding: 4px 3px;
      box-sizing: border-box;
    }

    .display-chip-track {
      min-height: 30px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .display-chip {
      min-width: 34px;
      min-height: 26px;
      padding: 0 6px;
      font-size: 14px;
      border-radius: 999px;
      border: none;
      background: radial-gradient(circle at 35% 30%, #fff2b8, #f1b743 55%, #ab5f11);
      color: #241b05;
      box-shadow: none;
    }

    .placeholder-chip {
      background: transparent;
      border: none;
      color: transparent;
    }

    .card-stack {
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 6px;
      width: 170px;
    }

    .card-stack h3 {
      margin: 0;
      font-size: 24px;
      letter-spacing: 0.02em;
      color: #f2f6f7;
      line-height: 1;
      text-transform: uppercase;
    }

    .card-stack h3.is-winner {
      animation: winnerBlink 720ms ease-in-out infinite;
    }

    @keyframes winnerBlink {
      0% {
        color: #f2f6f7;
        text-shadow: 0 0 0 rgba(255, 215, 48, 0);
      }
      50% {
        color: #ffd730;
        text-shadow: 0 0 12px rgba(255, 215, 48, 0.9);
      }
      100% {
        color: #f2f6f7;
        text-shadow: 0 0 0 rgba(255, 215, 48, 0);
      }
    }

    .card-stack img:not(.result-overlay-image) {
      width: min(100%, 170px);
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.45));
    }

    .card-layer {
      position: relative;
      width: min(100%, 170px);
      min-height: 190px;
      display: grid;
      place-items: center;
    }

    .card-layer > img:not(.result-overlay-image) {
      width: 100%;
      height: auto;
    }

    .tie-base-card {
      transform: translateX(30%) rotate(90deg) scale(0.88);
      transform-origin: center center;
      opacity: 0.96;
    }

    .war-card {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 92%;
      filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.55));
    }

    /* NO MORE BETS は共有(shared-game-flow.ts)の統一サイズを使用（blackjack と同じ）。
       WIN/LOSE/TIE は casino-war は1枚勝負なので大きく見せる（共有の小さめ既定を上書き）。
       ※ blackjack は手札の数字が隠れないよう共有の控えめサイズのまま。 */
    .result-overlay-image {
      width: min(380px, 132%);
      max-height: 150px;
      z-index: 5;
    }
    /* TIE は両者のカードに被って見えづらいので、元の小さいサイズ（共有 .is-tie）に戻す。
       上の大きい既定を TIE のときだけ打ち消す。WIN/LOSE は大きいまま。 */
    .result-overlay-image.is-tie {
      width: min(320px, 76%);
      max-height: 108px;
    }

    .tie-choice-panel {
      position: absolute;
      left: 50%;
      top: 46%;
      transform: translate(-50%, -50%);
      z-index: 6;
      width: min(94%, 420px);
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 10px;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.24);
      background: rgba(7, 16, 18, 0.86);
      box-sizing: border-box;
    }

    .tie-choice-panel button {
      min-height: 56px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f2f6f7;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.06em;
      cursor: pointer;
    }

    .tie-choice-panel button:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .region-actions {
      flex: 0 0 auto;
    }

    .region-footer {
      display: grid;
      align-items: end;
      flex: 0 0 var(--footer-height-rate);
      margin-top: auto;
      min-height: 0;
    }

    .inline-result-banner {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, calc(-50% + var(--war-status-offset-y)));
      width: min(96%, 520px);
      min-height: 88px;
      display: grid;
      grid-template-rows: auto 0;
      row-gap: 0;
      align-content: center;
      justify-items: center;
      pointer-events: none;
      z-index: 4;
    }
    
    .inline-result-banner .status-headline {
      white-space: pre-line;
      line-height: 1.3;
      font-size: 26px;
      text-align: center;
      background: rgba(0, 0, 0, 0.52);
      border: none;
      border-radius: 12px;
      padding: 12px 16px;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .inline-result-banner .hand-role-banner.placeholder {
      display: none;
    }

    .actions-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .actions-row button {
      width: 100%;
      min-height: 56px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f2f6f7;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.08em;
      cursor: pointer;
      line-height: 1;
      padding: 0 8px;
      box-sizing: border-box;
    }

    .actions-row button:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .actions-row button.is-disabled {
      opacity: 0.45;
      cursor: default;
    }

    /* Temporary fallback: keep old message panel style for rollback
    .message-panel {
      margin: 0;
      border: 2px solid rgba(255, 255, 255, 0.42);
      border-radius: 12px;
      background: rgba(22, 25, 30, 0.9);
      min-height: 74px;
      display: grid;
      place-items: center;
      padding: 8px 12px;
      box-sizing: border-box;
    }

    .message-panel p {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.25;
      color: #f2f6f7;
      text-align: center;
    }
    */

  `, classicBlueActionButtonStyles]
}


