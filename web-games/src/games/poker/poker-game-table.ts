import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { SUITS, cardValueFromNumber, createCard } from '../../shared/domain/card'
import { PokerRoundEngine, type PokerEvaluation } from './poker-engine'
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
import {
  sharedOverlayStyles,
  sharedBetStatusStyles,
  sharedCoinRecoveryStyles,
  sharedResultBannerStyles
} from '../../shared/ui/styles/shared-game-ui-styles'
import { sharedGameHostStyles, sharedGameStageStyles } from '../../shared/ui/styles/shared-game-layout-styles'
import { utilities } from '../../shared/ui/styles/utilities'
import { classicBlueActionButtonStyles, classicBlueButtonStyles } from '../../shared/ui/classic-button.styles'
import { recoverSharedCoin, scheduleCoinRecoveryDialogIfZero } from '../../shared/ui/styles/shared'
import { runToolbarSizeCheck } from '../../shared/ui/chrome/toolbar-size-check'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import { playTrackedEffect, registerEffectAudio } from '../../shared/infra/submit-sound'
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

const MIN_BET = 1
const MIN_BET_TO_START = 1
// MAX_BET removed - now unlimited
const DEAL_REVEAL_STEP_MS = 230
const POKER_GAME_ID = 'poker'

type PokerPhase = 'betting' | 'dealing' | 'dealt' | 'drawing' | 'result'

@customElement('poker-game-table')
export class PokerGameTable extends LitElement {
  private readonly engine = new PokerRoundEngine(new MathRandomSource())
  private dealRevealTimerIds: number[] = []
  private pendingBetStake = 0
  private isInitialized = false
  private currentResultAudio: HTMLAudioElement | null = null

  @state()
  private cards: Card[] = []

  @state()
  private selectedCards: boolean[] = [false, false, false, false, false]

  @state()
  private phase: PokerPhase = 'betting'

  @state()
  private evaluation: PokerEvaluation | null = null

  @state()
  private coin = 100

  @state()
  private currentBet = MIN_BET_TO_START

  @state()
  private lastPayout = 0

  @state()
  private isBetDialogOpen = true

  @state()
  private revealedCardCount = 0

  @state()
  private drawRevealIndices: number[] = []

  @state()
  private drawRevealedCount = 0

  @state()
  private isSoundEnabled = true

  @state()
  private isBgmEnabled = false

  @state()
  private selectedLanguage: AppLanguage = 'en'

  @state()
  private appConfig: AppConfigRoot | null = null

  @state()
  private activePanel: 'settings' | 'guide' | 'remove-ads' | null = null

  @state()
  private confirmAction: 'reset-points' | 'clear-cache' | 'go-home' | null = null

  @state()
  private isCoinRecoveryDialogOpen = false

  @state()
  private isDebugDialogOpen = false

  @state()
  private debugGameCount = 0
  @state() private adMockOpen = false
  @state() private soundHelpOpen = false
  private adMockCount = 0

  @state()
  private debugExchangeInput = ''

  @state()
  private debugUseSameSuit = false

  private debugForcedRanks: number[] = []
  private coinRecoveryDialogTimerId: number | null = null

  connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('resize', this.updateScale)
    this.loadSettings()
    this.initializeState()
  }

  disconnectedCallback(): void {
    this.stopResultAudio()
    window.removeEventListener('resize', this.updateScale)
    this.clearDealRevealTimers()
    this.clearCoinRecoveryDialogTimer()
    super.disconnectedCallback()
  }

  firstUpdated(): void {
    this.updateScale()
    requestAnimationFrame(() => runToolbarSizeCheck(this, 'poker'))
    void this.loadConfig()
  }

  private initializeState(): void {
    if (this.isInitialized) {
      return
    }
    this.isInitialized = true
    this.coin = ensurePlayableSharedCoin()
    this.restoreCoinFromPendingStakeIfNeeded()
    this.startRound()
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

  private restoreCoinFromPendingStakeIfNeeded(): void {
    const pending = takePendingStake(POKER_GAME_ID)
    if (pending <= 0) {
      return
    }
    this.pendingBetStake = 0
    this.coin = saveSharedCoin(this.coin + pending)
  }

  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  private loadSettings(): void {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY)
    const savedBgm = localStorage.getItem(BGM_ENABLED_KEY)
    this.isSoundEnabled = saved !== 'false'
    this.isBgmEnabled = savedBgm === null || savedBgm.trim() === '' ? true : savedBgm === 'true'
    console.log('[POKER loadSettings]', { saved, isSoundEnabled: this.isSoundEnabled, savedBgm, isBgmEnabled: this.isBgmEnabled })
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    if (savedLanguage === 'ja' || savedLanguage === 'zh' || savedLanguage === 'en') {
      this.selectedLanguage = savedLanguage
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      this.appConfig = await loadAppConfig('poker')
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

  private assetUrl(relativePath: string): string {
    return buildGameAssetUrl(relativePath)
  }

  private openRemoveAdsStore(): void {
    const storeUrl = this.appConfig?.app_info?.play_store_url ?? ''
    if (!storeUrl) {
      return
    }
    window.open(storeUrl, '_blank', 'noopener,noreferrer')
  }

  private startRound(): void {
    this.clearDealRevealTimers()
    this.pendingBetStake = 0
    clearPendingStake(POKER_GAME_ID)
    this.cards = []
    this.selectedCards = [false, false, false, false, false]
    this.phase = 'betting'
    this.evaluation = null
    this.lastPayout = 0
    this.normalizeBetForCoin()
    if (this.coin >= MIN_BET_TO_START && this.currentBet === 0) {
      this.currentBet = MIN_BET_TO_START
    }
    this.isBetDialogOpen = true
    this.revealedCardCount = 0
  }

  private toggleCard(index: number): void {
    if (this.phase !== 'dealt') {
      return
    }
    this.selectedCards = this.selectedCards.map((value, idx) => (idx === index ? !value : value))
  }

  private submitExchange(): void {
    if (this.phase !== 'dealt') {
      return
    }
    const targetIndices = this.selectedCards
      .map((selected, index) => (selected ? index : -1))
      .filter((index) => index >= 0)
    this.cards = this.engine.exchangeAt(targetIndices)
    this.applyForcedDebugExchangeIfNeeded(targetIndices)
    this.drawRevealIndices = targetIndices
    this.drawRevealedCount = 0
    if (targetIndices.length === 0) {
      this.applyRoundResult()
      return
    }
    this.phase = 'drawing'
    this.clearDealRevealTimers()
    for (let i = 0; i < targetIndices.length; i += 1) {
      this.scheduleDealRevealTimer(() => {
        this.drawRevealedCount = i + 1
        this.playEffect('hit')
        if (i === targetIndices.length - 1) {
          this.applyRoundResult()
        }
      }, DEAL_REVEAL_STEP_MS * (i + 1))
    }
  }

  private applyRoundResult(): void {
    this.evaluation = this.engine.evaluate()
    this.lastPayout = this.currentBet * this.evaluation.payoutMultiplier
    this.coin = saveSharedCoin(this.coin + this.lastPayout)
    this.pendingBetStake = 0
    clearPendingStake(POKER_GAME_ID)
    this.drawRevealIndices = []
    this.drawRevealedCount = 0
    this.phase = 'result'
    this.scheduleCoinRecoveryDialogIfZero()
    if (this.evaluation.outcome === 'high card') {
      this.playEffect('lose')
    } else {
      this.playResultEffectByOutcome(this.evaluation.outcome)
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

  private applyBulkSelection(): void {
    if (this.phase !== 'dealt') {
      return
    }
    this.playEffect('hit')
    const drawCount = this.selectedCards.filter((selected) => selected).length
    const holdCount = this.selectedCards.length - drawCount
    if (drawCount > holdCount) {
      this.selectedCards = [false, false, false, false, false]
      return
    }
    this.selectedCards = [true, true, true, true, true]
  }

  private onSubmitOrNext(): void {
    if (this.phase === 'dealt') {
      this.submitExchange()
      return
    }
    this.startRound()
  }

  private onContinue(): void {
    if (this.phase !== 'result') {
      return
    }
    this.playEffect('submit')
    this.startRound()
  }

  private confirmCoinRecovery(): void {
    this.playEffect('submit')
    this.clearCoinRecoveryDialogTimer()
    this.coin = recoverSharedCoin()
    this.normalizeBetForCoin()
    this.isCoinRecoveryDialogOpen = false
    this.startRound()
    window.setTimeout(() => {
      const bridge = getAndroidBillingBridge()
      bridge?.showRecoveryInterstitialAd?.() ?? bridge?.showInterstitialAd?.()
    }, 0)
  }

  private increaseBet(): void {
    const maxAllowedBet = this.coin
    if (maxAllowedBet < MIN_BET_TO_START) {
      this.currentBet = MIN_BET
      return
    }
    if (this.currentBet < MIN_BET) {
      this.currentBet = MIN_BET
    }
    if (this.currentBet >= maxAllowedBet) {
      return
    }
    // タップ音は共有 bet-selector-panel が鳴らす（二重再生防止のため親では鳴らさない）。
    this.currentBet = Math.min(maxAllowedBet, this.currentBet + 1)
  }

  private decreaseBet(): void {
    if (this.currentBet <= 0 || this.currentBet <= MIN_BET) {
      return
    }
    // タップ音は共有 bet-selector-panel が鳴らす（二重再生防止）。
    this.currentBet = Math.max(MIN_BET, this.currentBet - 1)
  }

  private onBetValueChange(event: CustomEvent<{ value: number }>): void {
    const value = event.detail.value
    if (value >= MIN_BET && value <= this.coin) {
      this.currentBet = value
    }
  }

  private placeBetAndDeal(): void {
    if (this.phase !== 'betting') {
      return
    }
    this.normalizeBetForCoin()
    if (this.currentBet < MIN_BET_TO_START || this.coin < MIN_BET_TO_START || this.coin < this.currentBet) {
      return
    }
    this.playEffect('submit')
    this.coin = saveSharedCoin(this.coin - this.currentBet)
    this.pendingBetStake = this.currentBet
    savePendingStake(POKER_GAME_ID, this.currentBet)
    this.cards = this.engine.startRound()
    this.selectedCards = [false, false, false, false, false]
    this.phase = 'dealing'
    this.evaluation = null
    this.lastPayout = 0
    this.isBetDialogOpen = false
    this.revealedCardCount = 0
    this.startDealRevealAnimation()
  }

  private onHomeClick(force = false): void {
    if (!force && this.phase === 'betting' && this.isBetDialogOpen) {
      return
    }
    if (this.confirmAction === 'go-home') {
      return
    }
    this.playEffect('submit')
    this.confirmAction = 'go-home'
  }

  private openPanel(panel: 'settings' | 'guide' | 'remove-ads'): void {
    if (this.phase === 'betting' && this.isBetDialogOpen) {
      return
    }
    this.playEffect('submit')
    this.activePanel = panel
  }

  private openPanelFromBet(panel: 'settings' | 'guide' | 'remove-ads'): void {
    if (this.phase !== 'betting' || !this.isBetDialogOpen) {
      this.openPanel(panel)
      return
    }
    this.playEffect('submit')
    this.isBetDialogOpen = false
    this.activePanel = panel
  }

  private onHomeFromBet(): void {
    if (this.phase !== 'betting' || !this.isBetDialogOpen) {
      this.onHomeClick()
      return
    }
    this.isBetDialogOpen = false
    this.onHomeClick(true)
  }

  private closePanel(): void {
    this.playEffect('submit')
    this.activePanel = null
    if (this.phase === 'betting' && this.cards.length === 0) {
      this.isBetDialogOpen = true
    }
  }

  private setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
    console.log('[POKER setSoundEnabled]', { enabled, saved: localStorage.getItem(SOUND_ENABLED_KEY) })
  }

  private setBgmEnabled(enabled: boolean): void {
    this.isBgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
  }

  private cancelConfirmAction(): void {
    this.playEffect('submit')
    const action = this.confirmAction
    this.confirmAction = null
    if (action === 'go-home' && this.phase === 'betting' && this.cards.length === 0) {
      this.isBetDialogOpen = true
    }
  }

  private confirmCurrentAction(): void {
    this.playEffect('submit')
    const action = this.confirmAction
    this.confirmAction = null
    if (action === 'go-home') {
      this.refundPendingBetIfNeeded()
      this.dispatchEvent(
        new CustomEvent('go-home', {
          bubbles: true,
          composed: true
        })
      )
      return
    }
    if (action === 'reset-points') {
      this.pendingBetStake = 0
      clearPendingStake(POKER_GAME_ID)
      this.coin = saveSharedCoin(DEFAULT_SHARED_COIN)
      this.normalizeBetForCoin()
      if (this.coin >= MIN_BET_TO_START && this.currentBet === 0) {
        this.currentBet = MIN_BET_TO_START
      }
      return
    }
    if (action === 'clear-cache') {
      this.pendingBetStake = 0
      clearPendingStake(POKER_GAME_ID)
      const coin = loadSharedCoin()
      clearLocalStoragePreservingProgress([
        { key: LANGUAGE_KEY, value: this.selectedLanguage },
        { key: SOUND_ENABLED_KEY, value: String(this.isSoundEnabled) }
      ])
      saveBgmEnabledSetting(this.isBgmEnabled)
      this.coin = saveSharedCoin(coin)
      this.normalizeBetForCoin()
      if (this.coin >= MIN_BET_TO_START && this.currentBet === 0) {
        this.currentBet = MIN_BET_TO_START
      }
    }
  }

  private refundPendingBetIfNeeded(): void {
    if (this.pendingBetStake <= 0) {
      clearPendingStake(POKER_GAME_ID)
      return
    }
    this.coin = saveSharedCoin(this.coin + this.pendingBetStake)
    this.pendingBetStake = 0
    clearPendingStake(POKER_GAME_ID)
  }

  private uiText() {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.selectedLanguage) : undefined
    const menu = block?.menu
    const overview = block?.overview_info
    const settings = block?.settings
    const common = block?.common
    const game = block?.game
    const ads = block?.ads
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
      guideLines: guideLines,
      removeAdsTitle: getLocalizedString(menu, 'remove_ads') || 'Remove Ads',
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
      resetConfirmMessage: getLocalizedString(settings, 'reset_points_confirm_message') || 'Reset points to 100?',
      clearCacheConfirmMessage: getLocalizedString(settings, 'clear_cache_confirm_message') || 'Clear local cache?',
      leaveTitle: chrome.leaveTitle,
      leaveGameConfirmMessage: chrome.leaveMessage,
      coinRecoveryTitle: getLocalizedString(game, 'poker_coin_recovery_title') || 'COIN Recovery',
      coinRecoveryLine1: getLocalizedString(game, 'poker_coin_recovery_line1') || 'COIN reached 0.',
      coinRecoveryLine2:
        (getLocalizedString(game, 'poker_coin_recovery_line2') || 'COIN will be reset to {coin} and the game will restart.')
          .replace('{coin}', String(DEFAULT_SHARED_COIN)),
      betAvailableLabel: getLocalizedString(game, 'bet_available_label') || 'COIN:',
      betInstruction: getLocalizedString(game, 'bet_instruction') || ''
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

  private onDebugExchangeInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement
    this.debugExchangeInput = input.value
  }

  private onDebugSameSuitChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement
    this.debugUseSameSuit = input.checked
  }

  private submitDebugExchange(): void {
    this.playEffect('submit')
    this.debugForcedRanks = this.parseDebugRanks(this.debugExchangeInput)
  }

  private parseDebugRanks(raw: string): number[] {
    if (raw.trim().length === 0) {
      return []
    }
    const tokens = raw.split(',').map((token) => token.trim().toUpperCase()).filter((token) => token.length > 0)
    const parsed: number[] = []
    for (const token of tokens) {
      const rank = this.parseDebugRankToken(token)
      if (rank !== null) {
        parsed.push(rank)
      }
    }
    return parsed
  }

  private parseDebugRankToken(token: string): number | null {
    if (token === 'A' || token === 'ACE' || token === '1') {
      return 1
    }
    if (token === 'J' || token === 'JACK' || token === '11') {
      return 11
    }
    if (token === 'Q' || token === 'QUEEN' || token === '12') {
      return 12
    }
    if (token === 'K' || token === 'KING' || token === '13') {
      return 13
    }
    const numeric = Number(token)
    if (Number.isInteger(numeric) && numeric >= 2 && numeric <= 10) {
      return numeric
    }
    return null
  }

  private applyForcedDebugExchangeIfNeeded(targetIndices: number[]): void {
    if (targetIndices.length === 0 || this.debugForcedRanks.length === 0) {
      return
    }
    const overrideCount = Math.min(targetIndices.length, this.debugForcedRanks.length)
    const nextCards = [...this.cards]
    const forcedSuit = SUITS[0]
    for (let i = 0; i < overrideCount; i += 1) {
      const cardIndex = targetIndices[i]
      const rank = this.debugForcedRanks[i]
      const suit = this.debugUseSameSuit ? forcedSuit : SUITS[i % SUITS.length]
      nextCards[cardIndex] = createCard(suit, cardValueFromNumber(rank), rank)
    }
    this.cards = nextCards
    this.engine.setHandForDebug(nextCards)
  }

  private statusMessage(): string {
    if (this.phase === 'betting') {
      if (this.coin < MIN_BET_TO_START) {
        return 'Not enough COIN. Reset from Settings.'
      }
      if (this.currentBet === 0) {
        return 'Set BET to 1 or more to start.'
      }
      if (this.currentBet > this.coin) {
        return `Adjust BET to ${this.coin} or less.`
      }
      return `Choose BET and press DEAL. BET:${this.currentBet}`
    }
    if (this.phase === 'dealing') {
      return `Dealing cards... BET:${this.currentBet}`
    }
    if (this.phase === 'drawing') {
      return `Drawing cards... BET:${this.currentBet}`
    }
    if (this.phase === 'dealt') {
      return 'HOLD or DRAW → SUBMIT'
    }
    if (!this.evaluation) {
      return ''
    }
    const coinDelta = this.lastPayout - this.currentBet
    if (coinDelta > 0) {
      return `COIN +${coinDelta}`
    }
    if (coinDelta < 0) {
      return `COIN ${coinDelta}`
    }
    return 'EVEN 0 COIN'
  }

  private cardStateLabel(index: number): string {
    if (this.phase !== 'dealt') {
      return 'HOLD'
    }
    return this.selectedCards[index] ? 'DRAW' : 'HOLD'
  }

  private resultHandLabel(): string {
    if (this.phase !== 'result' || !this.evaluation) {
      return ''
    }
    const handLabel = this.evaluation.outcome
      .split(' ')
      .map((word) => (word.length > 0 ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
      .join(' ')
    if (this.evaluation.payoutMultiplier <= 0) {
      return handLabel
    }
    return `${handLabel} ${this.evaluation.payoutMultiplier}x`
  }

  private isResultGlowEnabled(): boolean {
    const evaluation = this.evaluation
    return this.phase === 'result' && evaluation !== null && evaluation.payoutMultiplier > 0
  }

  private normalizeBetForCoin(): void {
    const maxAllowedBet = this.coin
    if (maxAllowedBet < MIN_BET_TO_START) {
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

  private bulkButtonLabel(): string {
    const drawCount = this.selectedCards.filter((selected) => selected).length
    const holdCount = this.selectedCards.length - drawCount
    return drawCount > holdCount ? 'ALL HOLD' : 'ALL DRAW'
  }

  private playResultEffectByOutcome(outcome: PokerEvaluation['outcome']): void {
    if (outcome === 'royal flush') {
      this.playResultEffect('payout_100x')
      return
    }
    if (outcome === 'straight flush' || outcome === 'quads') {
      this.playResultEffect('payout_50x_25x')
      return
    }
    if (outcome === 'full house' || outcome === 'flush' || outcome === 'straight') {
      this.playResultEffect('payout_4x_6x_9x')
      return
    }
    this.playEffect('payout')
  }

  private playResultEffect(name: string): void {
    this.stopResultAudio()
    if (!this.isSoundEnabled) {
      return
    }
    const audio = new Audio(this.assetUrl(`effects/${name}.mp3`))
    this.currentResultAudio = audio
    // 共有レジストリにも登録（ホーム戻り時 stopAllEffects で一括停止できるように）。
    registerEffectAudio(audio)
    audio.currentTime = 0
    audio.onended = () => {
      if (this.currentResultAudio === audio) {
        this.currentResultAudio = null
      }
    }
    void audio.play().catch(() => {
      if (this.currentResultAudio === audio) {
        this.currentResultAudio = null
      }
    })
  }

  private stopResultAudio(): void {
    if (!this.currentResultAudio) {
      return
    }
    this.currentResultAudio.pause()
    this.currentResultAudio.currentTime = 0
    this.currentResultAudio = null
  }

  private playEffect(name: string): void {
    this.stopResultAudio()
    if (!this.isSoundEnabled) {
      return
    }
    // 再生/追跡/一括停止は共有 submit-sound に集約（ホーム戻り時 stopAllEffects で止まる）。
    playTrackedEffect(this.assetUrl(`effects/${name}.mp3`))
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

  private scheduleDealRevealTimer(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.dealRevealTimerIds = this.dealRevealTimerIds.filter((timerId) => timerId !== id)
      callback()
    }, delayMs)
    this.dealRevealTimerIds = [...this.dealRevealTimerIds, id]
  }

  private startDealRevealAnimation(): void {
    this.clearDealRevealTimers()
    for (let i = 0; i < 5; i += 1) {
      this.scheduleDealRevealTimer(() => {
        this.revealedCardCount = i + 1
        this.playEffect('hit')
        if (i === 4) {
          this.phase = 'dealt'
        }
      }, DEAL_REVEAL_STEP_MS * (i + 1))
    }
  }

  private isCardVisible(index: number): boolean {
    if (!this.cards[index]) {
      return false
    }
    if (this.phase === 'dealing') {
      return index < this.revealedCardCount
    }
    if (this.phase === 'drawing') {
      const drawOrder = this.drawRevealIndices.indexOf(index)
      if (drawOrder < 0) {
        return true
      }
      return drawOrder < this.drawRevealedCount
    }
    return this.phase === 'dealt' || this.phase === 'result'
  }

  render() {
    const stageStyle = `background-image: url('${this.assetUrl('images/background.webp')}')`
    const t = this.uiText()
    const statusHeadline = this.statusMessage()
    const shouldGlow = this.isResultGlowEnabled()
    const isResultPhase = this.phase === 'result' && this.evaluation !== null
    const resultRoleLabel = isResultPhase ? this.resultHandLabel() : ''
    const showStatusOnRoleLine = this.phase !== 'result' && statusHeadline.length > 0
    const displayCards: Array<Card | null> = this.cards.length === 0 ? [null, null, null, null, null] : this.cards
    const maxAllowedBet = this.coin
    const canAdjustBet = this.coin >= MIN_BET_TO_START
    const canStartRound =
      this.coin >= MIN_BET_TO_START && this.currentBet >= MIN_BET_TO_START && this.currentBet <= this.coin

    return html`
      <div class="screen-bg">
        <div class="stage" style=${stageStyle}>
          <div class="table${this.activePanel !== null ? ' chrome-off' : ''}">
            <section class="region-header">
              <game-top-header
                home-label=${t.home}
                settings-label=${t.settings}
                guide-label=${t.guide}
                .toolsDisabled=${false}
                .coin=${this.coin}
                @header-home=${this.onHomeFromBet}
                @header-settings=${() => this.openPanelFromBet('settings')}
                @header-guide=${() => this.openPanelFromBet('guide')}
              ></game-top-header>
              <header class="bet-status poker-bet-status">${coinIcon()} COIN ${this.coin} / BET ${this.currentBet}</header>

              <section class="payout-table" aria-label="Hand Scores">
                <img class="payout-table-image" src=${this.assetUrl('poker/hand_scores.webp')} alt="Poker hand scores" loading="lazy" />
              </section>
            </section>

            <section class="region-cards">
              <div class="card-fan">
                <div class="status-block">
                ${isResultPhase && resultRoleLabel.length > 0
        ? html`<div class="status-headline role-on-top ${shouldGlow ? 'is-glow' : ''}">${resultRoleLabel}</div>`
        : statusHeadline.length > 0
          ? html`<div class="status-headline ${showStatusOnRoleLine ? 'placeholder' : ''} ${shouldGlow ? 'is-glow' : ''}">
                      ${showStatusOnRoleLine ? '' : statusHeadline}
                    </div>`
          : html`<div class="status-headline placeholder" aria-hidden="true"></div>`}
                ${isResultPhase
        ? html`<div class="hand-role-banner progress-message">${statusHeadline}</div>`
        : showStatusOnRoleLine
          ? html`<div class="hand-role-banner progress-message">${statusHeadline}</div>`
          : html`<div class="hand-role-banner placeholder" aria-hidden="true"></div>`}
                </div>
                <div class="card-stack">
                  ${displayCards.map(
            (card, index) => html`
                      <button
                        class="card-wrap ${this.selectedCards[index] && this.phase === 'dealt' ? 'selected' : ''}"
                        style=${`z-index:${index + 1}`}
                        @click=${() => this.toggleCard(index)}
                        ?disabled=${this.phase !== 'dealt'}
                      >
                        ${card && this.isCardVisible(index)
                ? html`<img
                              src=${this.assetUrl(`cards/${card.imagePath}`)}
                              alt=${`${card.value} of ${card.suit}`}
                              loading="lazy"
                            />`
                : html`<img src=${this.assetUrl('cards/back_card.png')} alt="card back" loading="lazy" />`}
                      </button>
                    `
          )}
                </div>
                <div class="card-label-row">
                  ${displayCards.map(
            (_, index) => html`
                      <button class="label-toggle" @click=${() => this.toggleCard(index)} ?disabled=${this.phase !== 'dealt'}>
                        <span class="card-state">${this.cardStateLabel(index)}</span>
                      </button>
                    `
          )}
                </div>
              </div>
            </section>

            <section class="region-actions actions">
              ${this.phase === 'result'
        ? html`<button class="continue-btn-overlay classic-btn-blue" @click=${this.onContinue}>CONTINUE</button>`
        : null}
              <div class="actions-row">
              ${this.phase === 'betting'
        ? html`
                    <button disabled>ALL DRAW</button>
                    <button disabled>SUBMIT</button>
                  `
        : html`
                    <button @click=${this.applyBulkSelection} ?disabled=${this.phase !== 'dealt'}>${this.bulkButtonLabel()}</button>
                    <button @click=${this.onSubmitOrNext} ?disabled=${this.phase !== 'dealt'}>SUBMIT</button>
                  `}
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
                      <label class="debug-label" for="poker-debug-exchange">Forced draw ranks (comma separated)</label>
                      <input
                        id="poker-debug-exchange"
                        class="debug-input"
                        type="text"
                        placeholder="A,A,A"
                        .value=${this.debugExchangeInput}
                        @input=${this.onDebugExchangeInput}
                      />
                      <label class="debug-check-row" for="poker-debug-same-suit">
                        <input
                          id="poker-debug-same-suit"
                          type="checkbox"
                          .checked=${this.debugUseSameSuit}
                          @change=${this.onDebugSameSuitChange}
                        />
                        <span>Same suit</span>
                      </label>
                      <div class="debug-actions">
                        <button class="debug-submit-btn" @click=${this.submitDebugExchange}>SUBMIT</button>
                        <button class="debug-close-btn" @click=${this.closeDebugDialog}>CLOSE</button>
                      </div>
                    </div>
                  </section>
                `
        : null}
            ${null /* Temporary: message box hidden per layout request */}

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

            ${this.activePanel === 'remove-ads'
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
                        @remove-ads-close=${this.closePanel}
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
                        .message=${this.confirmAction === 'reset-points'
            ? t.resetConfirmMessage
            : this.confirmAction === 'clear-cache'
              ? t.clearCacheConfirmMessage
              : t.leaveGameConfirmMessage}
                        .okLabel=${t.okLabel}
                        .cancelLabel=${t.confirmCancel}
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

            ${this.phase === 'betting' && this.isBetDialogOpen
        ? html`
                  <section class="overlay bet-overlay">
                    <bet-selector-panel
                      title="Select BET"
                      .availableLabel=${t.betAvailableLabel}
                      .availableCoin=${this.coin}
                      .bet=${this.currentBet}
                      start-label="START"
                      .instructionText=${t.betInstruction}
                      .disableDecrease=${this.currentBet <= MIN_BET || this.coin < MIN_BET_TO_START}
                      .disableIncrease=${!canAdjustBet || this.currentBet >= maxAllowedBet}
                      .disableStart=${!canStartRound}
                      .showTools=${false}
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
          gameTitle="poker-game"
          @feedback-interact=${() => this.playEffect('submit')}
        ></game-feedback>
      </div>
    `
  }

  static styles = [sharedOverlayStyles, sharedBetStatusStyles, sharedCoinRecoveryStyles, sharedResultBannerStyles, sharedGameHostStyles, sharedGameStageStyles, utilities, css`
    :host {
      width: 100%;
      height: 100%;
      --footer-height-rate: 8%;
      --table-row-gap: 10px;
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

    .poker-bet-status {
      pointer-events: none;
      line-height: 1;
    }

    .region-cards {
      display: flex;
      align-items: stretch;
      justify-content: center;
      flex: 1 1 auto;
      min-height: 0;
      position: relative;
    }

    .region-actions {
      flex: 0 0 auto;
      margin-bottom: 5%;
    }

    .region-footer {
      display: grid;
      align-items: end;
      flex: 0 0 var(--footer-height-rate);
      margin-top: auto;
      min-height: 0;
    }

    /* BG-1: BET 中もヘッダー/フッターを通常色で押せるように（暗幕を透過＋前面化）。手本=old-maid。 */
    .bet-overlay { pointer-events: none; }
    .bet-overlay bet-selector-panel { pointer-events: auto; }
    .region-header, .region-footer { position: relative; z-index: 40; }
    /* GD-2: ガイド/設定/広告削除(activePanel)表示中はヘッダー/フッターを非表示（BG-1 回帰の解消）。 */
    .table.chrome-off .region-header,
    .table.chrome-off .region-footer { display: none; }

    .payout-table {
      width: 96%;
      margin: 2% auto 0;
    }

    .payout-table-image {
      width: 100%;
      height: auto;
      display: block;
    }

    .card-fan {
      width: 96%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 0;
    }
    /* 役/コイン文言（Pair 1x / EVEN 0 COIN）。カード上端とハンドスコア下端の
       ちょうど中間に来るよう、カード上の余白を flex:1 で占有して中央寄せ（レスポンシブ）。 */
    .status-block {
      flex: 1 1 0;
      min-height: 90px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    /* status-block と対になりカード群を縦中央に保つ下側スペーサー。 */
    .card-fan::after {
      content: '';
      flex: 1 1 0;
    }

    .card-stack {
      width: 100%;
      flex: 0 0 auto;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      overflow: visible;
    }

    .card-wrap {
      appearance: none;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      padding: 0;
      display: grid;
      gap: 3%;
      justify-items: center;
      cursor: pointer;
      transition: none;
      width: 26.2%;
      max-width: 26.2%;
      transform-origin: center center;
    }

    .card-wrap:disabled {
      cursor: default;
    }

    .card-wrap:not(:last-child) {
      margin-right: -7%;
    }

    .card-wrap img {
      width: 100%;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .card-wrap.selected {
      transform: translateY(-4%);
    }

    /* 共有 classicBlueActionButtonStyles が素の button セレクタで全 button に
       border/背景/box-shadow を当ててしまい、カード(.card-wrap)と HOLD/DRAW ラベル
       (.label-toggle)に余計な影・土台・枠が出ていた。これらは操作トグルなので装飾を打ち消す。
       共有側は :hover 等で specificity が高いので !important で確実に勝たせる。 */
    .card-wrap,
    .label-toggle {
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      filter: none !important;
    }
    .card-wrap:focus,
    .card-wrap:focus-visible,
    .label-toggle:focus,
    .label-toggle:focus-visible {
      outline: none;
    }

    /* HOLD/DRAW ラベル: 5枚のカード中心に合わせる（カードの実スパン=96%）＋カード下に間隔。 */
    .card-label-row {
      width: 96%;
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      justify-items: center;
      align-items: center;
    }


    .label-toggle {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 4px 2px;
      margin: 0;
      cursor: pointer;
      line-height: 1;
    }

    .label-toggle:disabled {
      cursor: default;
    }

    .card-state {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #f0d533;
      text-shadow: 0 3px 6px rgba(0, 0, 0, 0.45);
      line-height: 1;
      white-space: nowrap;
    }

    .actions {
      position: relative;
      display: grid;
      width: 100%;
      padding: 0 0 12px;
      box-sizing: border-box;
    }

    .hand-role-banner.progress-message {
      min-height: 34px;
      font-size: 24px;
      /* 共通 .hand-role-banner の white-space:nowrap を解除。
         "HOLD or DRAW → SUBMIT" 等の長文が右へはみ出して
         切れていたのを、枠内で折り返して収める。 */
      white-space: normal;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      padding: 0 4%;
      min-width: 0;
      line-height: 1.15;
    }

    .status-headline.role-on-top {
      min-height: 56px;
      font-size: 42px;
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

    .debug-label {
      font-size: 14px;
      font-weight: 700;
      color: #e8f2f5;
    }

    .debug-input {
      min-height: 44px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(6, 14, 16, 0.7);
      color: #f4fbff;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      padding: 0 10px;
      box-sizing: border-box;
      outline: none;
    }

    .debug-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .debug-check-row {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 700;
      color: #e8f2f5;
      user-select: none;
    }

    .debug-check-row input[type='checkbox'] {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: #f0d533;
    }

    .debug-submit-btn,
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
      .debug-submit-btn,
      .debug-close-btn {
        min-height: 48px;
      }
    }

    .debug-submit-btn:disabled,
    .debug-close-btn:disabled {
      cursor: default;
      opacity: 0.25;
    }

    .actions-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .actions-row button {
      width: 100%;
      min-width: 0;
      min-height: 64px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f2f6f7;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.08em;
      cursor: pointer;
      white-space: nowrap;
      line-height: 1;
      padding: 0 6px;
      box-sizing: border-box;
      transition: opacity 120ms ease;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .actions-row button {
        min-height: 56px;
      }
    }

    .actions-row button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .actions-row button.is-disabled {
      opacity: 0.25;
      cursor: default;
    }

    .continue-btn-overlay {
      position: absolute;
      left: 50%;
      top: -108%;
      transform: translateX(-50%);
      z-index: 6;
      width: min(calc((100% - 8px) / 2), 320px);
      min-width: 0;
      min-height: 64px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.28);
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #f2f6f7;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.08em;
      cursor: pointer;
      white-space: nowrap;
      line-height: 1;
      padding: 0 6px;
      box-sizing: border-box;
      transition: opacity 120ms ease;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .continue-btn-overlay {
        min-height: 56px;
      }
    }

  `, classicBlueActionButtonStyles, classicBlueButtonStyles]
}



