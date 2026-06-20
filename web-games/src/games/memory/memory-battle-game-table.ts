import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
  type AppLanguage,
  type MemoryAppConfigRoot,
  type MemoryEnemyConfig,
  getMemoryAppLanguage,
  getMemoryEnemyLanguage,
  loadMemoryAppConfig
} from './memory-app-config'
import { getLocalizedString, splitTextLines } from '../../shared/config/text-utils'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import { BGM_SETTING_CHANGED_EVENT, loadBgmEnabledSetting, saveBgmEnabledSetting } from '../../shared/infra/bgm-setting'
import {
  CLEARED_STAGE_COUNT_KEY,
  COMPLETED_ALL_STAGES_KEY,
  CURRENT_STAGE_KEY,
  LEGACY_ALL_CLEAR_KEY,
  LEGACY_CURRENT_LEVEL_KEY
} from '../../shared/infra/memory-battle-progress-store'
import { ensurePlayableSharedCoin, loadSharedCoin, saveSharedCoin } from '../../shared/infra/shared-coin-store'
import { applyStageScale } from '../../shared/ui/styles/stage-layout'
import {
  buildDrawCard,
  buildMemoryDeck,
  DEFAULT_MEMORY_CARD_COUNT,
  DEFAULT_MEMORY_STAGE_COUNT,
  formatTemplate,
  isMemoryTraceVisible,
  isPlayerAutoModeEnabled,
  MEMORY_TRACE_VISIBLE,
  normalizePairCaptureChance,
  playerPairCaptureChancePercent,
  PLAYER_AUTO_MODE,
  PLAYER_PAIR_CAPTURE_CHANCE_PERCENT,
  RANK_ORDER,
  resolveMemoryCardCount,
  shuffleArray,
  wait
} from './memory-battle-game-table.helpers'
import { memoryBattleGameTableStyles } from './memory-battle-game-table.styles'
import { sharedOverlayStyles } from '../../shared/ui/styles/shared-game-ui-styles'
import { utilities } from '../../shared/ui/styles/utilities'
import {
  type BattleTraceLine,
  type BoardCard,
  type CardFace,
  type DrawChoiceSlot,
  type DrawResolution,
  type MemoryBattleDebugApi,
  type MemoryBattleDebugState,
  type MemoryBattleMode,
  type MemoryBattleResult,
  type MemoryBattleScreen,
  type MemoryChoiceTrace,
  type MemoryKnownPair,
  type MemoryWinResultMode,
  type TurnOwner
} from './memory-battle-game-table.types'
import { renderMemoryBattleHeader, renderMemoryBattleScreen, renderMemoryBattleStatus, renderEnemyInfoOverlay } from './memory-battle-game-table.screens'
import { renderSettingsPanel } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'
import '../../shared/ui/panels/ad-mock-dialog'
import { countGameForAd, isAndroidApp, isOfflineForAd, MEMORY_WEB_AD_COUNT_KEY, notifyNativeGameEnd } from '../../shared/infra/web-ad-mock'
import '../../shared/ui/chrome/game-footer-bar'
import '../../shared/ui/chrome/game-feedback'
import type { GameFeedback } from '../../shared/ui/chrome/game-feedback'
// デバッグ dddddd
import { LANGUAGE_KEY, SOUND_ENABLED_KEY } from '../../shared/config/storage-keys'
const CPU_TURN_DELAY_MS = 700
const PLAYER_AUTO_TURN_DELAY_MS = 520
const CARD_REVEAL_DELAY_MS = 450
const CARD_RESOLVE_DELAY_MS = 650
const DEAL_CARD_STEP_MS = 70
const POST_DEAL_LOCK_MS = 600
const DRAW_REVEAL_DELAY_MS = 260
const USE_STAGE_START_CONFIRM = false

declare global {
  interface Window {
    __APP_FLUX_MEMORY_DEBUG__?: MemoryBattleDebugApi
    PLAYER_AUTO_MODE?: boolean
    PLAYER_PAIR_CAPTURE_CHANCE_PERCENT?: number
    MEMORY_TRACE_VISIBLE?: boolean
    // ネイティブ(Flutter)が実広告を閉じた後に呼ぶコールバック。途中広告後の盤面再開などに使う。
    __onAdComplete?: () => void
  }
}


@customElement('memory-battle-game-table')
export class MemoryBattleGameTable extends LitElement {
  private hasStoredLanguagePreference = false

  @state()
  private memoryConfig: MemoryAppConfigRoot | null = null

  @state()
  private language: AppLanguage = 'en'

  @state()
  private coin = 100

  @state()
  private currentStage = 1

  @state()
  private selectedStage = 1

  @state()
  private gameMode: MemoryBattleMode = 'stage'

  @state()
  private practiceCardCount = DEFAULT_MEMORY_CARD_COUNT

  @state()
  private clearedStageCount = 0

  @state()
  private hasCompletedAllStages = false

  @state()
  private screen: MemoryBattleScreen = 'enemy-intro'

  // ゲーム中に敵画像をタップしたときの敵情報オーバーレイ（画面遷移せず重ねて表示）。
  @state()
  private showEnemyInfo = false

  @state()
  private currentTurn: TurnOwner = 'player'

  @state()
  private cards: BoardCard[] = []

  @state()
  private openedCardIds: string[] = []

  @state()
  private playerPairs = 0

  @state()
  private cpuPairs = 0

  @state()
  private playerTurnCount = 0

  @state()
  private cpuTurnCount = 0

  @state()
  private drawPlayerCard: CardFace | null = null

  @state()
  private drawCpuCard: CardFace | null = null

  @state()
  private drawWinner: TurnOwner | null = null

  @state()
  private drawResolution: DrawResolution = null

  @state()
  private drawChoiceSlots: DrawChoiceSlot[] = []

  @state()
  private selectedDrawSlotId: 'left' | 'right' | null = null

  private knownCardRanks = new Map<string, string>()

  private cpuChosenOpeningTurn: TurnOwner = 'player'

  @state()
  private statusMessage = ''

  @state()
  private isBusy = false

  @state()
  private battleTraceLines: BattleTraceLine[] = []

  @state()
  private isGuideOpen = false

  @state()
  private isSettingsOpen = false

  @state()
  private isSoundHelpOpen = false

  @state()
  private isHomeConfirmOpen = false

  // ── フィードバック ──
  // ダイアログ本体・送信ロジックは共通部品 <game-feedback> に集約（単一ソース）。
  // ここでは「開いているか」だけを保持し、自動演出の一時停止とステージ scale 固定に使う。
  @state()
  private isFeedbackDialogOpen = false

  @state()
  private isStageStartConfirmOpen = false

  @state()
  private isQuitBattleConfirmOpen = false

  @state()
  private isEarlyBattleDecisionOpen = false

  @state()
  private clinchedWinner: TurnOwner | null = null

  @state()
  private pendingStageStart: number | null = null


  @state()
  private isEffectEnabled = true

  @state()
  private isBgmEnabled = false

  @state()
  private resultReward = 0

  @state()
  public winResultMode: MemoryWinResultMode = 'new-stage-clear'

  @state()
  private bannerImagePath = ''

  @state()
  private bannerAlt = ''

  @state()
  private isBannerVisible = false

  @state()
  public dealOverlayBanner = ''

  @state()
  private isConfigReady = false

  private debugApiRegistered = false
  private automationRunId = 0

  connectedCallback(): void {
    super.connectedCallback()
    window.PLAYER_AUTO_MODE ??= PLAYER_AUTO_MODE
    window.PLAYER_PAIR_CAPTURE_CHANCE_PERCENT ??= PLAYER_PAIR_CAPTURE_CHANCE_PERCENT
    window.MEMORY_TRACE_VISIBLE ??= MEMORY_TRACE_VISIBLE
    this.loadLanguage()
    this.loadSettings()
    this.coin = ensurePlayableSharedCoin()
    void this.initializeConfig()
    window.addEventListener('resize', this.updateScale)
    window.visualViewport?.addEventListener('resize', this.updateScale)
    window.addEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    // ネイティブ実広告が閉じたら呼ばれる。途中広告(CPU対戦5ペア)の盤面再開などに使う。
    window.__onAdComplete = this.handleAdComplete
    this.registerDebugApi()
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    window.visualViewport?.removeEventListener('resize', this.updateScale)
    window.removeEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    if (window.__onAdComplete === this.handleAdComplete) {
      delete window.__onAdComplete
    }
    this.unregisterDebugApi()
    super.disconnectedCallback()
  }

  firstUpdated(): void {
    this.updateScale()
  }

  private readonly updateScale = (): void => {
    // フィードバック入力中はキーボードで visualViewport が縮む。そのまま再計算すると
    // ステージ(=モーダル含む)が縮小して文字が極小になるため、レイアウトビューポート基準に固定する。
    applyStageScale(this, { preferLayoutViewport: this.isFeedbackDialogOpen })
  }

  private readonly onBgmSettingChanged = (): void => {
    this.isBgmEnabled = loadBgmEnabledSetting()
  }

  private loadLanguage(): void {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    if (savedLanguage === 'en' || savedLanguage === 'ja' || savedLanguage === 'zh') {
      this.hasStoredLanguagePreference = true
      this.language = savedLanguage
    }
  }

  private loadSettings(): void {
    this.isEffectEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'
    this.isBgmEnabled = loadBgmEnabledSetting()
  }

  private loadProgress(): void {
    const maxStage = this.maxStage()
    const storedStage = Number(localStorage.getItem(CURRENT_STAGE_KEY))
    const storedClearedStageCount = Number(localStorage.getItem(CLEARED_STAGE_COUNT_KEY))
    const storedCompletedAllStages = localStorage.getItem(COMPLETED_ALL_STAGES_KEY) === 'true'
    const legacyLevel = Number(localStorage.getItem(LEGACY_CURRENT_LEVEL_KEY))
    const legacyAllClear = localStorage.getItem(LEGACY_ALL_CLEAR_KEY) === 'true'

    if (Number.isFinite(storedClearedStageCount) && storedClearedStageCount >= 0) {
      this.clearedStageCount = Math.max(0, Math.min(maxStage, storedClearedStageCount))
    } else if (legacyAllClear) {
      this.clearedStageCount = maxStage
    } else if (Number.isFinite(legacyLevel) && legacyLevel >= 1) {
      this.clearedStageCount = Math.max(0, Math.min(maxStage, legacyLevel - 1))
    } else {
      this.clearedStageCount = 0
    }

    this.hasCompletedAllStages = storedCompletedAllStages || legacyAllClear

    const defaultStage = this.nextAvailableStage()
    if (Number.isFinite(storedStage) && storedStage >= 1 && storedStage <= this.maxUnlockedStage()) {
      this.currentStage = storedStage
    } else if (Number.isFinite(legacyLevel) && legacyLevel >= 1 && legacyLevel <= this.maxUnlockedStage()) {
      this.currentStage = legacyLevel
    } else {
      this.currentStage = defaultStage
    }
    this.selectedStage = this.currentStage
  }

  private async loadConfig(): Promise<void> {
    const memoryConfig = await loadMemoryAppConfig()
    this.memoryConfig = memoryConfig
    if (!this.hasStoredLanguagePreference) {
      this.language = memoryConfig.default_language ?? 'en'
    }
  }

  private async initializeConfig(): Promise<void> {
    try {
      await this.loadConfig()
      this.loadProgress()
      this.beginTitleScreen()
      this.isConfigReady = true
    } catch (error) {
      console.error('[memory-battle-game-table] Failed to initialize config', error)
      this.memoryConfig = null
      this.isConfigReady = false
    }
  }

  private assetUrl(relativePath: string): string {
    const runtimeWindow = window as Window & { __ANDROID_APP__?: boolean }
    if (runtimeWindow.__ANDROID_APP__) {
      return `./assets/${relativePath}`
    }
    return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/${relativePath}`, window.location.href).toString()
  }

  private memoryAsset(key: keyof NonNullable<MemoryAppConfigRoot['assets']>): string {
    const configured = this.memoryConfig?.assets?.[key]
    if (typeof configured !== 'string' || configured.length === 0) {
      throw new Error(`Missing memory asset config: ${key}`)
    }
    return configured
  }

  private maxStage(): number {
    return this.memoryConfig?.enemies?.length || DEFAULT_MEMORY_STAGE_COUNT
  }

  private maxUnlockedStage(): number {
    return Math.max(1, Math.min(this.maxStage(), this.clearedStageCount + 1))
  }

  private nextAvailableStage(): number {
    return this.maxUnlockedStage()
  }

  private isPracticeMode(): boolean {
    return this.gameMode === 'practice'
  }

  private currentEnemy(): MemoryEnemyConfig {
    const enemies = this.memoryConfig?.enemies
    if (enemies && enemies.length > 0) {
      return enemies[Math.max(0, Math.min(enemies.length - 1, this.currentStage - 1))]
    }
    return {
      stage: this.currentStage,
      reward_coin: 0,
      languages: {
        en: {
          name: '',
          profile: ''
        }
      }
    }
  }

  private currentEnemyName(): string {
    if (this.isPracticeMode()) {
      return this.texts().practiceStatusLabel
    }
    const localized = getMemoryEnemyLanguage(this.currentEnemy(), this.memoryConfig, this.language)
    return localized?.name || ''
  }

  public currentEnemyProfile(): string {
    if (this.isPracticeMode()) {
      return this.texts().practiceSetupMessage
    }
    const localized = getMemoryEnemyLanguage(this.currentEnemy(), this.memoryConfig, this.language)
    return localized?.profile || ''
  }

  public currentEnemyImagePath(): string | null {
    if (this.isPracticeMode()) {
      return null
    }
    const imagePath = this.currentEnemy().image
    return imagePath ? this.assetUrl(imagePath) : null
  }

  public coinValueSizeClass(): string {
    const digits = String(this.coin).length
    if (digits >= 9) {
      return 'is-tiny'
    }
    if (digits >= 7) {
      return 'is-small'
    }
    return ''
  }

  private texts() {
    const memoryLanguageBlock = getMemoryAppLanguage(this.memoryConfig, this.language)
    const menu = memoryLanguageBlock?.menu
    const overview = memoryLanguageBlock?.overview_info
    const settings = memoryLanguageBlock?.settings
    const common = memoryLanguageBlock?.common
    const game = memoryLanguageBlock?.game
    const chrome = getSharedChromeText(this.language)

    return {
      title: getLocalizedString(game, 'title') || 'Classic Simple Memory Battle',
      home: chrome.home,
      settings: chrome.settings,
      guide: chrome.guide,
      start: getLocalizedString(menu, 'start') || 'START',
      coinLabel: (getLocalizedString(game, 'bet_available_label') || 'COIN').replace(/:$/, ''),
      stageLabel: getLocalizedString(game, 'stage_label') || 'STAGE',
      stageClearedLabel: getLocalizedString(game, 'stage_cleared_label') || 'CLEAR',
      stageSelectTitle: getLocalizedString(game, 'stage_select_title') || 'Choose a Stage',
      practiceStageButton: getLocalizedString(game, 'practice_stage_button') || 'Solo Practice Stage',
      practiceStatusLabel: getLocalizedString(game, 'practice_status_label') || 'Solo Practice Stage',
      practiceSetupTitle: getLocalizedString(game, 'practice_setup_title') || 'Solo Practice Stage',
      practiceSetupMessage:
        getLocalizedString(game, 'practice_setup_message') || 'Choose the card count and start the solo practice game.',
      practiceCardCountLabel: getLocalizedString(game, 'practice_card_count_label') || 'Card Count',
      practiceStartButton: getLocalizedString(game, 'practice_start_button') || 'Start Solo Practice',
      practiceClearTitle: getLocalizedString(game, 'practice_clear_title') || 'Practice Clear',
      practiceClearMessage:
        getLocalizedString(game, 'practice_clear_message') || 'Choose retry practice or return to stage select.',
      practiceResultSummary: getLocalizedString(game, 'practice_result_summary') || '',
      practiceRetryButton: getLocalizedString(game, 'practice_retry_button') || 'Retry Practice',
      quitBattleButton: getLocalizedString(game, 'quit_battle_button') || 'Give Up',
      quitPracticeButton: getLocalizedString(game, 'quit_practice_button') || 'Stop',
      quitBattleConfirmTitle: getLocalizedString(game, 'quit_battle_confirm_title') || 'Give up?',
      quitPracticeConfirmTitle: getLocalizedString(game, 'quit_practice_confirm_title') || 'Stop practice?',
      quitBattleConfirmMessage:
        getLocalizedString(game, 'quit_battle_confirm_message') || 'Return to Stage Select?',
      quitBattleConfirmOk: getLocalizedString(game, 'return_to_stage_select') || 'Stage Select',
      quitBattleConfirmCancel:
        getLocalizedString(game, 'quit_battle_confirm_cancel') || getLocalizedString(common, 'cancel') || 'Cancel',
      earlyWinConfirmTitle: getLocalizedString(game, 'early_win_confirm_title') || 'YOU won!',
      earlyWinConfirmMessage:
        getLocalizedString(game, 'early_battle_confirm_message') || 'This will not affect the result. Continue?',
      earlyLoseConfirmTitle: getLocalizedString(game, 'early_lose_confirm_title') || 'YOU lost.',
      earlyLoseConfirmMessage:
        getLocalizedString(game, 'early_battle_confirm_message') || 'This will not affect the result. Continue?',
      earlyBattleContinue: getLocalizedString(game, 'early_battle_continue') || 'Continue',
      earlyBattleFinish: getLocalizedString(game, 'early_battle_finish') || 'Finish',
      stageSelectCurrent: getLocalizedString(game, 'stage_select_current') || 'Selected Stage: {stage}',
      stageSelectStart: getLocalizedString(game, 'stage_select_start') || getLocalizedString(menu, 'start'),
      stageStartConfirmTitle: getLocalizedString(game, 'stage_start_confirm_title') || 'Start Stage {stage}?',
      stageStartConfirmMessage: getLocalizedString(game, 'stage_start_confirm_message') || 'Begin Stage {stage} battle?',
      stageStartConfirmOk: getLocalizedString(game, 'stage_start_confirm_ok') || getLocalizedString(common, 'ok') || 'OK',
      stageStartConfirmCancel: getLocalizedString(game, 'stage_start_confirm_cancel') || getLocalizedString(common, 'cancel') || 'Cancel',
      enemyStatusFormat: getLocalizedString(game, 'enemy_status_format'),
      enemyIntroTitle: getLocalizedString(game, 'enemy_intro_title'),
      enemyReward: getLocalizedString(game, 'enemy_reward'),
      startBattle: getLocalizedString(game, 'start_battle'),
      dealingCards: getLocalizedString(game, 'dealing_cards'),
      drawBattleTitle: getLocalizedString(game, 'draw_battle_title'),
      drawBattleMessage: getLocalizedString(game, 'draw_battle_message'),
      drawBattleButton: getLocalizedString(game, 'draw_battle_button'),
      drawBattlePlayerLabel: getLocalizedString(game, 'draw_battle_player_label') || 'YOU',
      drawBattleCpuLabel: getLocalizedString(game, 'draw_battle_cpu_label') || 'CPU',
      playerWonDraw: getLocalizedString(game, 'player_won_draw'),
      cpuWonDrawFirst: getLocalizedString(game, 'cpu_won_draw_first'),
      cpuWonDrawSecond: getLocalizedString(game, 'cpu_won_draw_second'),
      chooseTurnTitle: getLocalizedString(game, 'choose_turn_title'),
      chooseTurnMessage: getLocalizedString(game, 'choose_turn_message'),
      goFirst: getLocalizedString(game, 'go_first'),
      goSecond: getLocalizedString(game, 'go_second'),
      turnPlayer: getLocalizedString(game, 'turn_player'),
      turnCpu: getLocalizedString(game, 'turn_cpu'),
      turnCount: getLocalizedString(game, 'turn_count'),
      playerScore: getLocalizedString(game, 'player_score'),
      cpuScore: getLocalizedString(game, 'cpu_score'),
      playerMatch: getLocalizedString(game, 'player_match'),
      cpuMatch: getLocalizedString(game, 'cpu_match'),
      playerMiss: getLocalizedString(game, 'player_miss'),
      cpuMiss: getLocalizedString(game, 'cpu_miss'),
      cpuThinking: getLocalizedString(game, 'cpu_thinking'),
      winTitle: getLocalizedString(game, 'win_title'),
      winMessage: getLocalizedString(game, 'win_message'),
      stageClearMessage: getLocalizedString(game, 'stage_clear_message') || '',
      rewardLabel: getLocalizedString(game, 'reward_label'),
      totalCoinLabel: getLocalizedString(game, 'total_coin_label'),
      next: getLocalizedString(game, 'next'),
      returnToStageSelect: getLocalizedString(game, 'return_to_stage_select') || 'Stage Select',
      loseTitle: getLocalizedString(game, 'lose_title'),
      loseMessage: getLocalizedString(game, 'lose_message'),
      continueButton: getLocalizedString(game, 'continue_button') || 'Continue',
      returnToMenuButton: getLocalizedString(game, 'return_to_menu_button') || 'Back to Menu',
      retryTitle: getLocalizedString(game, 'draw_title'),
      retryMessage: getLocalizedString(game, 'draw_message'),
      retryButton: getLocalizedString(game, 'retry_button'),
      allClearMessage: getLocalizedString(game, 'all_clear_message') || '',
      backCardAlt: getLocalizedString(game, 'back_card_alt') || 'back card',
      homeConfirmTitle: chrome.leaveTitle,
      homeConfirmMessage: chrome.leaveMessage,
      homeConfirmOk: chrome.ok,
      homeConfirmCancel: chrome.cancel,
      settingsTitle: chrome.settings,
      languageLabel: getLocalizedString(settings, 'language_settings', 'language') || 'Language',
      effectLabel: getLocalizedString(settings, 'sound_effect') || 'Effect',
      bgmLabel: getLocalizedString(settings, 'bgm') || 'BGM',
      soundHelpLabel: getLocalizedString(settings, 'help_icon_label') || '?',
      soundHelpTitle: getLocalizedString(settings, 'sound_help_title') || 'Sound Help',
      soundHelpMessage:
        getLocalizedString(settings, 'sound_help_message') || 'If sound does not play, please check whether your device is muted.',
      soundHelpOk: getLocalizedString(settings, 'sound_help_ok') || 'OK',
      guideTitle: chrome.guideOverview,
      guideLines: splitTextLines(getLocalizedString(overview, 'guide_content'), { preserveEmpty: true }),
      ok: getLocalizedString(common, 'ok') || 'OK',
      yes: getLocalizedString(common, 'yes') || 'Yes',
      no: getLocalizedString(common, 'no') || 'No',
      feedbackButton: getLocalizedString(game, 'feedback_button') || 'Feedback',
      feedbackTitle: getLocalizedString(game, 'feedback_title') || 'Feedback',
      feedbackPlaceholder: getLocalizedString(game, 'feedback_placeholder') || 'Please enter your feedback',
      feedbackOk: getLocalizedString(game, 'feedback_ok') || 'Send',
      feedbackCancel: getLocalizedString(game, 'feedback_cancel') || 'Cancel',
      feedbackValidationMin: getLocalizedString(game, 'feedback_validation_min') || 'Please enter at least 10 characters.',
      feedbackSubmitFailed: getLocalizedString(game, 'feedback_submit_failed') || 'Failed to send feedback. Please try again.',
      feedbackSubmitSuccess: getLocalizedString(game, 'feedback_submit_success') || 'Thank you for your feedback.'
    }
  }

  private playEffect(relativePath: string): void {
    if (!this.isEffectEnabled) {
      return
    }
    const audio = new Audio(this.assetUrl(relativePath))
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  }

  private async showBanner(relativePath: string, alt: string): Promise<void> {
    this.bannerImagePath = this.assetUrl(relativePath)
    this.bannerAlt = alt
    this.isBannerVisible = true
    await wait(620)
    this.isBannerVisible = false
  }

  private saveProgress(): void {
    localStorage.setItem(CURRENT_STAGE_KEY, String(this.currentStage))
    localStorage.setItem(CLEARED_STAGE_COUNT_KEY, String(this.clearedStageCount))
    localStorage.setItem(COMPLETED_ALL_STAGES_KEY, this.hasCompletedAllStages ? 'true' : 'false')
  }

  private isLocalDebugRuntime(): boolean {
    return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  }

  private registerDebugApi(): void {
    if (!this.isLocalDebugRuntime() || this.debugApiRegistered) {
      return
    }
    window.__APP_FLUX_MEMORY_DEBUG__ = {
      snapshot: () => this.debugSnapshot(),
      setState: (state) => this.debugSetState(state),
      setProgress: (stage, options) => this.debugSetProgress(stage, options),
      forceFinish: async (result) => this.debugForceFinish(result)
    }
    this.debugApiRegistered = true
  }

  private unregisterDebugApi(): void {
    if (!this.debugApiRegistered) {
      return
    }
    if (window.__APP_FLUX_MEMORY_DEBUG__) {
      delete window.__APP_FLUX_MEMORY_DEBUG__
    }
    this.debugApiRegistered = false
  }

  private debugSnapshot(): MemoryBattleDebugState {
    return {
      screen: this.screen,
      coin: this.coin,
      currentStage: this.currentStage,
      clearedStageCount: this.clearedStageCount,
      hasCompletedAllStages: this.hasCompletedAllStages,
      selectedStage: this.selectedStage,
      currentTurn: this.currentTurn,
      cards: this.cards.map((card) => ({ ...card })),
      openedCardIds: [...this.openedCardIds],
      playerPairs: this.playerPairs,
      cpuPairs: this.cpuPairs,
      playerTurnCount: this.playerTurnCount,
      cpuTurnCount: this.cpuTurnCount,
      drawPlayerCard: this.drawPlayerCard ? { ...this.drawPlayerCard } : null,
      drawCpuCard: this.drawCpuCard ? { ...this.drawCpuCard } : null,
      drawWinner: this.drawWinner,
      drawResolution: this.drawResolution,
      cpuChosenOpeningTurn: this.cpuChosenOpeningTurn,
      statusMessage: this.statusMessage,
      resultReward: this.resultReward,
      isBusy: this.isBusy
    }
  }

  private debugSetState(state: MemoryBattleDebugState): void {
    if (state.screen !== undefined) {
      this.screen = state.screen
    }
    if (state.coin !== undefined) {
      this.coin = state.coin
    }
    if (state.currentStage !== undefined) {
      this.currentStage = state.currentStage
    }
    if (state.clearedStageCount !== undefined) {
      this.clearedStageCount = state.clearedStageCount
    }
    if (state.hasCompletedAllStages !== undefined) {
      this.hasCompletedAllStages = state.hasCompletedAllStages
    }
    if (state.selectedStage !== undefined) {
      this.selectedStage = state.selectedStage
    }
    if (state.currentTurn !== undefined) {
      this.currentTurn = state.currentTurn
    }
    if (state.cards !== undefined) {
      this.cards = state.cards.map((card) => ({ ...card }))
    }
    if (state.openedCardIds !== undefined) {
      this.openedCardIds = [...state.openedCardIds]
    }
    if (state.playerPairs !== undefined) {
      this.playerPairs = state.playerPairs
    }
    if (state.cpuPairs !== undefined) {
      this.cpuPairs = state.cpuPairs
    }
    if (state.playerTurnCount !== undefined) {
      this.playerTurnCount = state.playerTurnCount
    }
    if (state.cpuTurnCount !== undefined) {
      this.cpuTurnCount = state.cpuTurnCount
    }
    if (state.drawPlayerCard !== undefined) {
      this.drawPlayerCard = state.drawPlayerCard ? { ...state.drawPlayerCard } : null
    }
    if (state.drawCpuCard !== undefined) {
      this.drawCpuCard = state.drawCpuCard ? { ...state.drawCpuCard } : null
    }
    if (state.drawWinner !== undefined) {
      this.drawWinner = state.drawWinner
    }
    if (state.drawResolution !== undefined) {
      this.drawResolution = state.drawResolution
    }
    if (state.cpuChosenOpeningTurn !== undefined) {
      this.cpuChosenOpeningTurn = state.cpuChosenOpeningTurn
    }
    if (state.statusMessage !== undefined) {
      this.statusMessage = state.statusMessage
    }
    if (state.resultReward !== undefined) {
      this.resultReward = state.resultReward
    }
    if (state.isBusy !== undefined) {
      this.isBusy = state.isBusy
    }
  }

  private debugSetProgress(stage: number, options?: { clearedStageCount?: number; hasCompletedAllStages?: boolean; coin?: number }): void {
    this.currentStage = Math.max(1, Math.min(this.maxStage(), stage))
    this.selectedStage = this.currentStage
    this.clearedStageCount = Math.max(
      0,
      Math.min(this.maxStage(), options?.clearedStageCount ?? Math.max(0, this.currentStage - 1))
    )
    this.hasCompletedAllStages = options?.hasCompletedAllStages ?? this.clearedStageCount >= this.maxStage()
    if (options?.coin !== undefined) {
      this.coin = options.coin
      saveSharedCoin(this.coin)
    }
    this.saveProgress()
    this.openEnemyIntro()
  }

  private async debugForceFinish(result: MemoryBattleResult): Promise<void> {
    if (result === 'win') {
      await this.handleWin()
      return
    }
    if (result === 'lose') {
      await this.handleLose()
      return
    }
    await this.handleDraw()
  }

  private setLanguage(next: AppLanguage): void {
    this.language = next
    localStorage.setItem(LANGUAGE_KEY, next)
  }

  private setEffectEnabled(enabled: boolean): void {
    this.isEffectEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
  }

  private setBgmEnabled(enabled: boolean): void {
    this.isBgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
  }

  private beginTitleScreen(): void {
    this.invalidateBattleAutomation()
    this.gameMode = 'stage'
    this.screen = 'title'
    this.statusMessage = ''
    this.playerPairs = 0
    this.cpuPairs = 0
    this.playerTurnCount = 0
    this.cpuTurnCount = 0
    this.cards = []
    this.openedCardIds = []
    this.drawWinner = null
    this.drawResolution = null
    this.drawChoiceSlots = []
    this.selectedDrawSlotId = null
    this.knownCardRanks.clear()
    this.drawPlayerCard = null
    this.drawCpuCard = null
    this.resultReward = 0
    this.winResultMode = 'new-stage-clear'
    this.battleTraceLines = []
    this.isHomeConfirmOpen = false
    this.isStageStartConfirmOpen = false
    this.isEarlyBattleDecisionOpen = false
    this.clinchedWinner = null
    this.pendingStageStart = null
    this.currentStage = this.selectedStage
  }

  private openEnemyIntro(): void {
    this.invalidateBattleAutomation()
    this.gameMode = 'stage'
    this.screen = 'enemy-intro'
    this.playerPairs = 0
    this.cpuPairs = 0
    this.playerTurnCount = 0
    this.cpuTurnCount = 0
    this.cards = []
    this.openedCardIds = []
    this.drawWinner = null
    this.drawResolution = null
    this.drawChoiceSlots = []
    this.selectedDrawSlotId = null
    this.knownCardRanks.clear()
    this.drawPlayerCard = null
    this.drawCpuCard = null
    this.resultReward = 0
    this.winResultMode = 'new-stage-clear'
    this.statusMessage = ''
    this.battleTraceLines = []
    this.isEarlyBattleDecisionOpen = false
    this.clinchedWinner = null
  }

  public openDrawBattle(): void {
    this.invalidateBattleAutomation()
    this.playEffect(this.memoryAsset('submit_sound'))
    this.drawWinner = null
    this.drawResolution = null
    this.drawChoiceSlots = []
    this.selectedDrawSlotId = null
    this.knownCardRanks.clear()
    this.drawPlayerCard = null
    this.drawCpuCard = null
    this.statusMessage = ''
    this.battleTraceLines = []
    const cardBasePath = this.memoryAsset('card_base_path')
    let firstCard = buildDrawCard(cardBasePath)
    let secondCard = buildDrawCard(cardBasePath)
    while (firstCard.rank === secondCard.rank) {
      firstCard = buildDrawCard(cardBasePath)
      secondCard = buildDrawCard(cardBasePath)
    }
    this.drawChoiceSlots = [
      { id: 'left', card: firstCard },
      { id: 'right', card: secondCard }
    ]
    this.screen = 'draw-battle'
  }

  public openPracticeSetup(): void {
    this.invalidateBattleAutomation()
    this.playEffect(this.memoryAsset('submit_sound'))
    this.gameMode = 'practice'
    this.screen = 'practice-setup'
    this.practiceCardCount = DEFAULT_MEMORY_CARD_COUNT
    this.statusMessage = ''
    this.playerPairs = 0
    this.cpuPairs = 0
    this.playerTurnCount = 0
    this.cpuTurnCount = 0
    this.cards = []
    this.openedCardIds = []
    this.drawWinner = null
    this.drawResolution = null
    this.drawChoiceSlots = []
    this.selectedDrawSlotId = null
    this.knownCardRanks.clear()
    this.drawPlayerCard = null
    this.drawCpuCard = null
    this.resultReward = 0
    this.winResultMode = 'new-stage-clear'
    this.battleTraceLines = []
    this.isEarlyBattleDecisionOpen = false
    this.clinchedWinner = null
  }

  public updatePracticeCardCount(event: Event): void {
    const value = Number((event.currentTarget as HTMLSelectElement).value)
    this.practiceCardCount = resolveMemoryCardCount(value)
  }

  public practiceCardOptionLabel(cardCount: number): string {
    switch (this.language) {
      case 'ja':
        return `${cardCount}枚`
      case 'zh':
        return `${cardCount}张`
      default:
        return `${cardCount} cards`
    }
  }

  public async startPracticeMode(): Promise<void> {
    if (this.isBusy) {
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    this.gameMode = 'practice'
    await this.startBattle('player')
  }

  private isBattlePaused(): boolean {
    return (
      this.isQuitBattleConfirmOpen ||
      this.isEarlyBattleDecisionOpen ||
      this.isHomeConfirmOpen ||
      this.isSettingsOpen ||
      this.isGuideOpen ||
      this.isSoundHelpOpen ||
      this.isFeedbackDialogOpen ||
      this.isOfflineAdWarningOpen
    )
  }

  private invalidateBattleAutomation(): void {
    this.automationRunId += 1
  }

  private pauseBattleAutomation(): void {
    this.invalidateBattleAutomation()
    if (this.screen !== 'battle') {
      return
    }
    if (this.openedCardIds.length > 0) {
      for (const cardId of this.openedCardIds) {
        this.flipCard(cardId, false)
      }
      this.openedCardIds = []
    }
    this.isBusy = false
  }

  private resumeBattleAutomation(): void {
    if (this.screen === 'battle' && !this.isBattlePaused()) {
      this.scheduleTurnAutomation(this.currentTurn)
    }
  }

  private scheduleTurnAutomation(owner: TurnOwner): void {
    if (this.screen !== 'battle' || this.isBattlePaused()) {
      return
    }
    const runId = ++this.automationRunId
    if (owner === 'player') {
      if (!isPlayerAutoModeEnabled()) {
        return
      }
      window.setTimeout(() => {
        if (runId === this.automationRunId) {
          void this.runPlayerAutoTurn(runId)
        }
      }, PLAYER_AUTO_TURN_DELAY_MS)
      return
    }
    window.setTimeout(() => {
      if (runId === this.automationRunId) {
        void this.runCpuTurn(runId)
      }
    }, CPU_TURN_DELAY_MS)
  }

  public allStageNumbers(): number[] {
    return Array.from({ length: this.maxStage() }, (_, index) => index + 1)
  }

  private isStageUnlocked(stage: number): boolean {
    return stage >= 1 && stage <= this.maxUnlockedStage()
  }

  public isStageCleared(stage: number): boolean {
    return stage >= 1 && stage <= this.clearedStageCount
  }

  private stageEnemy(stage: number): MemoryEnemyConfig | undefined {
    return this.memoryConfig?.enemies?.find((enemy) => enemy.stage === stage)
  }

  public stageEnemyName(stage: number): string {
    const enemy = this.stageEnemy(stage)
    return getMemoryEnemyLanguage(enemy, this.memoryConfig, this.language)?.name || ''
  }

  public stageEnemyImagePath(stage: number): string | null {
    const imagePath = this.stageEnemy(stage)?.image
    return imagePath ? this.assetUrl(imagePath) : null
  }

  public requestStageStart(stage: number): void {
    if (!this.isStageUnlocked(stage)) {
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    // Flip this to `true` when the stage-start confirmation dialog is needed again.
    if (!USE_STAGE_START_CONFIRM) {
      this.coin = ensurePlayableSharedCoin()
      this.gameMode = 'stage'
      this.selectedStage = stage
      this.currentStage = stage
      this.saveProgress()
      this.openEnemyIntro()
      return
    }
    this.pendingStageStart = stage
    this.isStageStartConfirmOpen = true
  }

  private closeStageStartConfirm(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isStageStartConfirmOpen = false
    this.pendingStageStart = null
  }

  private confirmStageStart(): void {
    if (!this.pendingStageStart || !this.isStageUnlocked(this.pendingStageStart)) {
      this.isStageStartConfirmOpen = false
      this.pendingStageStart = null
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    this.coin = ensurePlayableSharedCoin()
    this.gameMode = 'stage'
    this.selectedStage = this.pendingStageStart
    this.currentStage = this.pendingStageStart
    this.saveProgress()
    this.isStageStartConfirmOpen = false
    this.pendingStageStart = null
    this.openEnemyIntro()
  }

  public async chooseDrawCard(slotId: 'left' | 'right'): Promise<void> {
    if (this.isBusy || this.drawChoiceSlots.length !== 2 || this.drawPlayerCard || this.drawCpuCard) {
      return
    }
    this.playEffect(this.memoryAsset('card_open_sound'))
    this.isBusy = true
    try {
      const t = this.texts()
      const playerSlot = this.drawChoiceSlots.find((slot) => slot.id === slotId)
      const cpuSlot = this.drawChoiceSlots.find((slot) => slot.id !== slotId)
      if (!playerSlot || !cpuSlot) {
        return
      }

      await wait(DRAW_REVEAL_DELAY_MS)
      this.selectedDrawSlotId = slotId

      const playerCard = playerSlot.card
      const cpuCard = cpuSlot.card

      this.drawPlayerCard = playerCard
      this.drawCpuCard = cpuCard
      this.drawWinner = RANK_ORDER.indexOf(playerCard.rank) < RANK_ORDER.indexOf(cpuCard.rank) ? 'player' : 'cpu'

      if (this.drawWinner === 'player') {
        this.statusMessage = t.playerWonDraw
        this.drawResolution = 'player-choice'
        return
      }

      const cpuStartsFirst = Math.random() < 0.5
      this.cpuChosenOpeningTurn = cpuStartsFirst ? 'cpu' : 'player'
      this.statusMessage = cpuStartsFirst ? t.cpuWonDrawFirst : t.cpuWonDrawSecond
      this.drawResolution = 'cpu-confirm'
    } finally {
      this.isBusy = false
    }
  }

  public async confirmCpuOpeningTurn(): Promise<void> {
    if (this.isBusy || this.drawResolution !== 'cpu-confirm') {
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    await this.startBattle(this.cpuChosenOpeningTurn)
  }

  public async chooseTurn(nextTurn: TurnOwner): Promise<void> {
    if (this.isBusy) {
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    await this.startBattle(nextTurn)
  }

  private async startBattle(firstTurn: TurnOwner): Promise<void> {
    this.invalidateBattleAutomation()
    const t = this.texts()
    const deck = buildMemoryDeck(this.memoryAsset('card_base_path'), this.boardCardCount())
    this.cards = []
    this.openedCardIds = []
    this.knownCardRanks.clear()
    this.playerPairs = 0
    this.cpuPairs = 0
    this.playerTurnCount = 0
    this.cpuTurnCount = 0
    this.isEarlyBattleDecisionOpen = false
    this.clinchedWinner = null
    // 新しい対戦開始＝途中広告フラグをリセット（リトライ/次ステージで再び5ペア時に出す）。
    this.adShownThisStage = false
    this.currentTurn = firstTurn
    this.statusMessage = t.dealingCards
    this.screen = 'battle'
    // 配ってる最中＆配り終え直後の1.5秒はタップ/クリックを受け付けない（その間はWAIT表示）
    this.isBusy = true
    this.dealOverlayBanner = this.memoryAsset('wait_banner')
    await this.updateComplete
    for (const card of deck) {
      this.cards = [...this.cards, card]
      await wait(DEAL_CARD_STEP_MS)
    }
    await this.updateComplete
    await wait(POST_DEAL_LOCK_MS)
    // めくれるようになったらSTART表示（少し見せてから消す）
    this.isBusy = false
    this.dealOverlayBanner = this.memoryAsset('start_banner')
    window.setTimeout(() => {
      this.dealOverlayBanner = ''
    }, 700)
    if (firstTurn === 'player') {
      this.beginTurn('player')
      return
    }
    this.beginTurn('cpu')
  }

  private boardCardCount(): number {
    return this.isPracticeMode() ? resolveMemoryCardCount(this.practiceCardCount) : DEFAULT_MEMORY_CARD_COUNT
  }

  public turnArrowSymbol(): string {
    return this.currentTurn === 'player' ? '◀' : '▶'
  }

  private beginTurn(owner: TurnOwner): void {
    const t = this.texts()
    this.currentTurn = owner
    this.openedCardIds = []
    if (owner === 'player') {
      this.playerTurnCount += 1
      this.statusMessage = t.turnPlayer
      this.scheduleTurnAutomation('player')
      return
    }
    this.cpuTurnCount += 1
    this.statusMessage = t.turnCpu
    this.scheduleTurnAutomation('cpu')
  }

  private flipCard(cardId: string, faceUp: boolean): void {
    if (faceUp) {
      this.rememberVisibleCard(cardId)
    }
    this.cards = this.cards.map((card) => (card.id === cardId ? { ...card, isFaceUp: faceUp } : card))
  }

  private markMatched(cardIds: string[]): void {
    const idSet = new Set(cardIds)
    for (const cardId of cardIds) {
      this.knownCardRanks.delete(cardId)
    }
    this.cards = this.cards.map((card) => (idSet.has(card.id) ? { ...card, isMatched: true } : card))
  }

  private getCard(cardId: string): BoardCard | undefined {
    return this.cards.find((card) => card.id === cardId)
  }

  private rememberVisibleCard(cardId: string): void {
    const card = this.getCard(cardId)
    if (!card || card.isMatched) {
      return
    }
    this.knownCardRanks.set(card.id, card.rank)
  }

  private knownAvailablePairs(): MemoryKnownPair[] {
    const availableByRank = new Map<string, BoardCard[]>()
    for (const card of this.cards) {
      if (card.isMatched || card.isFaceUp || !this.knownCardRanks.has(card.id)) {
        continue
      }
      const rank = this.knownCardRanks.get(card.id)
      if (!rank) {
        continue
      }
      const sameRankCards = availableByRank.get(rank) ?? []
      sameRankCards.push(card)
      availableByRank.set(rank, sameRankCards)
    }

    const pairs: MemoryKnownPair[] = []
    for (const cards of availableByRank.values()) {
      if (cards.length >= 2) {
        pairs.push({ first: cards[0], second: cards[1] })
      }
    }
    return pairs
  }

  private cardPosition(card: BoardCard): number {
    const index = this.cards.findIndex((candidate) => candidate.id === card.id)
    return index >= 0 ? index + 1 : 0
  }

  private traceCard(card: BoardCard): string {
    return `${this.cardPosition(card)}:${card.rank}`
  }

  private appendBattleTrace(line: string, tone?: BattleTraceLine['tone']): void {
    const knownSummary = [...this.knownCardRanks.entries()]
      .map(([id, rank]) => {
        const card = this.cards.find((candidate) => candidate.id === id)
        return card ? this.traceCard(card) : `?:${rank}`
      })
      .join(' ')
    const suffix = knownSummary ? ` | known ${knownSummary}` : ''
    this.battleTraceLines = [{ text: `${line}${suffix}`, tone }, ...this.battleTraceLines].slice(0, 10)
  }

  private enemyPairCaptureChancePercent(): number {
    const configuredChance = this.currentEnemy().pair_capture_chance_percent
    const fallbackChance = this.currentStage * 10
    return normalizePairCaptureChance(configuredChance, fallbackChance)
  }

  private randomCardChoices(excludedPairs: MemoryKnownPair[] = []): BoardCard[] {
    const available = shuffleArray(this.cards.filter((card) => !card.isMatched && !card.isFaceUp))
    const excludedPairKeys = new Set(excludedPairs.map((pair) => [pair.first.id, pair.second.id].sort().join('|')))
    for (let firstIndex = 0; firstIndex < available.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < available.length; secondIndex += 1) {
        const pairKey = [available[firstIndex].id, available[secondIndex].id].sort().join('|')
        if (!excludedPairKeys.has(pairKey)) {
          return [available[firstIndex], available[secondIndex]]
        }
      }
    }
    return available.slice(0, 2)
  }

  private chooseCpuCards(): MemoryChoiceTrace {
    const knownPairs = this.knownAvailablePairs()
    const chance = this.enemyPairCaptureChancePercent()
    if (knownPairs.length > 0 && Math.random() * 100 < chance) {
      const pair = shuffleArray(knownPairs)[0]
      return { source: 'known-pair', chance, cards: [pair.first, pair.second] }
    }
    return { source: 'random', chance, cards: this.randomCardChoices(knownPairs) }
  }

  private choosePlayerAutoCards(): MemoryChoiceTrace {
    const knownPairs = this.knownAvailablePairs()
    const chance = playerPairCaptureChancePercent()
    if (knownPairs.length > 0 && Math.random() * 100 < chance) {
      const pair = shuffleArray(knownPairs)[0]
      return { source: 'known-pair', chance, cards: [pair.first, pair.second] }
    }
    return { source: 'random', chance, cards: this.randomCardChoices(knownPairs) }
  }

  public async onCardTap(cardId: string): Promise<void> {
    if (this.screen !== 'battle' || this.currentTurn !== 'player' || this.isBusy || isPlayerAutoModeEnabled()) {
      return
    }
    const card = this.getCard(cardId)
    if (!card || card.isMatched || card.isFaceUp || this.openedCardIds.length >= 2) {
      return
    }

    this.playEffect(this.memoryAsset('card_open_sound'))
    this.flipCard(cardId, true)
    this.openedCardIds = [...this.openedCardIds, cardId]

    if (this.openedCardIds.length === 2) {
      this.isBusy = true
      await wait(CARD_REVEAL_DELAY_MS)
      await this.resolveOpenedPair('player')
      this.isBusy = false
    }
  }

  private async resolveOpenedPair(owner: TurnOwner): Promise<void> {
    const [firstId, secondId] = this.openedCardIds
    const firstCard = this.getCard(firstId)
    const secondCard = this.getCard(secondId)
    if (!firstCard || !secondCard) {
      this.openedCardIds = []
      return
    }

    const t = this.texts()
    const isMatch = firstCard.rank === secondCard.rank

    if (isMatch) {
      const actorLabel = owner === 'player' ? 'YOU' : 'CPU'
      this.appendBattleTrace(`${actorLabel} MATCH ${this.traceCard(firstCard)} / ${this.traceCard(secondCard)}`, 'match')
      // 一致音とMatch画像(バナー)は検出直後＝カードが見えている間に出す。バナー表示の
      // あいだ2枚を見せ、その後にカードを消す（カードが消えてからバナーを出さない）。
      this.playEffect(this.memoryAsset('match_sound'))
      if (owner === 'player') {
        this.playerPairs += 1
        this.statusMessage = t.playerMatch
      } else {
        this.cpuPairs += 1
        this.statusMessage = t.cpuMatch
      }
      await this.showBanner(this.memoryAsset('match_banner'), 'Match')
      this.markMatched(this.openedCardIds)
      this.openedCardIds = []

      if (this.cards.every((card) => card.isMatched)) {
        await wait(300)
        await this.finishBattle()
        return
      }

      const clinchedWinner = this.detectClinchedWinner()
      const isNewClinch = clinchedWinner !== null && this.clinchedWinner === null
      if (isNewClinch) {
        this.clinchedWinner = clinchedWinner
      }

      // CPU対戦の途中広告：プレイヤーが5ペア取った時点(=自分が10枚取得)で1回だけ。
      // 同ステージ内は再表示しない(adShownThisStage)。盤面を一時停止し、広告を閉じたら再開する。
      // コールドゲーム(クリンチ)と重なった場合は、広告を閉じてからダイアログを出す（広告→ダイアログ）。
      if (owner === 'player' && !this.isPracticeMode() && this.playerPairs === 5 && !this.adShownThisStage) {
        this.adShownThisStage = true
        this.pauseBattleAutomation()
        this.requestAd(() => {
          if (isNewClinch) {
            // クリンチ：自動進行は止めたまま、コールドゲームのダイアログを出す
            //（continue/finish ボタンが resume/finish を行う＝通常フローと同じ）。
            this.isEarlyBattleDecisionOpen = true
          } else {
            this.beginTurn(owner)
          }
        })
        return
      }

      if (isNewClinch) {
        this.isEarlyBattleDecisionOpen = true
        return
      }

      await wait(280)
      this.beginTurn(owner)
      return
    }

    await wait(CARD_RESOLVE_DELAY_MS)
    this.flipCard(firstId, false)
    this.flipCard(secondId, false)
    this.openedCardIds = []
    if (owner === 'player') {
      if (this.isPracticeMode()) {
        this.statusMessage = t.turnPlayer
        await wait(240)
        this.beginTurn('player')
        return
      }
      this.statusMessage = t.playerMiss
      await wait(240)
      this.beginTurn('cpu')
      return
    }
    this.statusMessage = t.cpuMiss
    await wait(240)
    this.beginTurn('player')
  }

  private async runPlayerAutoTurn(runId: number): Promise<void> {
    if (!isPlayerAutoModeEnabled() || runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'player' || this.isBusy || this.isBattlePaused()) {
      return
    }
    this.isBusy = true
    try {
      await wait(PLAYER_AUTO_TURN_DELAY_MS)
      if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'player' || this.isBattlePaused()) {
        return
      }
      const choice = this.choosePlayerAutoCards()
      const [firstCard, secondCard] = choice.cards
      if (!firstCard || !secondCard) {
        return
      }
      this.appendBattleTrace(
        `YOU ${choice.source} ${choice.chance}% -> ${this.traceCard(firstCard)} / ${this.traceCard(secondCard)}`
      )
      this.playEffect(this.memoryAsset('card_open_sound'))
      this.flipCard(firstCard.id, true)
      this.openedCardIds = [firstCard.id]
      await wait(CARD_REVEAL_DELAY_MS)
      if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'player' || this.isBattlePaused()) {
        return
      }
      this.playEffect(this.memoryAsset('card_open_sound'))
      this.flipCard(secondCard.id, true)
      this.openedCardIds = [firstCard.id, secondCard.id]
      await wait(CARD_REVEAL_DELAY_MS)
      if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'player' || this.isBattlePaused()) {
        return
      }
      await this.resolveOpenedPair('player')
    } finally {
      this.isBusy = false
    }
  }

  private async runCpuTurn(runId: number): Promise<void> {
    if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'cpu' || this.isBattlePaused()) {
      return
    }
    this.isBusy = true
    try {
      await wait(CPU_TURN_DELAY_MS)
      if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'cpu' || this.isBattlePaused()) {
        return
      }
      const choice = this.chooseCpuCards()
      const [firstCard, secondCard] = choice.cards
      if (!firstCard || !secondCard) {
        return
      }
      this.appendBattleTrace(
        `CPU ${choice.source} ${choice.chance}% -> ${this.traceCard(firstCard)} / ${this.traceCard(secondCard)}`
      )
      this.playEffect(this.memoryAsset('card_open_sound'))
      this.flipCard(firstCard.id, true)
      this.openedCardIds = [firstCard.id]
      await wait(CARD_REVEAL_DELAY_MS)
      if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'cpu' || this.isBattlePaused()) {
        return
      }
      this.playEffect(this.memoryAsset('card_open_sound'))
      this.flipCard(secondCard.id, true)
      this.openedCardIds = [firstCard.id, secondCard.id]
      await wait(CARD_REVEAL_DELAY_MS)
      if (runId !== this.automationRunId || this.screen !== 'battle' || this.currentTurn !== 'cpu' || this.isBattlePaused()) {
        return
      }
      await this.resolveOpenedPair('cpu')
    } finally {
      this.isBusy = false
    }
  }

  private async finishBattle(): Promise<void> {
    if (this.isPracticeMode()) {
      this.screen = 'result-practice'
      // 一人用は対戦相手がいないので、1ゲーム終了のタイミングで広告を出す。
      this.requestAd()
      return
    }
    if (this.clinchedWinner === 'player') {
      await this.handleWin()
      return
    }
    if (this.clinchedWinner === 'cpu') {
      await this.handleLose()
      return
    }
    if (this.playerPairs > this.cpuPairs) {
      await this.handleWin()
      return
    }
    if (this.playerPairs < this.cpuPairs) {
      await this.handleLose()
      return
    }
    await this.handleDraw()
  }

  private detectClinchedWinner(): TurnOwner | null {
    if (this.isPracticeMode()) {
      return null
    }
    const totalPairs = Math.floor(this.cards.length / 2)
    const remainingPairs = Math.max(0, totalPairs - this.playerPairs - this.cpuPairs)
    if (this.playerPairs > this.cpuPairs + remainingPairs) {
      return 'player'
    }
    if (this.cpuPairs > this.playerPairs + remainingPairs) {
      return 'cpu'
    }
    return null
  }

  private async handleWin(): Promise<void> {
    const enemy = this.currentEnemy()
    const clearedStageCountBeforeWin = this.clearedStageCount
    const wonStage = this.currentStage
    const isNewStageClear = wonStage > clearedStageCountBeforeWin
    this.resultReward = enemy.reward_coin
    this.coin = saveSharedCoin(loadSharedCoin() + enemy.reward_coin)
    this.playEffect(this.memoryAsset('win_sound'))
    this.clearedStageCount = Math.max(this.clearedStageCount, wonStage)
    this.hasCompletedAllStages = this.clearedStageCount >= this.maxStage()
    this.winResultMode = this.hasCompletedAllStages && isNewStageClear
      ? 'first-all-clear'
      : isNewStageClear
        ? 'new-stage-clear'
        : 'replay-clear'
    this.currentStage = this.nextAvailableStage()
    this.selectedStage = this.currentStage
    this.saveProgress()
    this.screen = 'result-win'
    // CPU対戦の勝敗時には広告を出さない（広告は対戦途中＝プレイヤー5ペア時点に移動）。
  }

  private async handleLose(): Promise<void> {
    this.playEffect(this.memoryAsset('lose_sound'))
    this.screen = 'result-lose'
    // CPU対戦の勝敗時には広告を出さない（広告は対戦途中＝プレイヤー5ペア時点に移動）。
  }

  private async handleDraw(): Promise<void> {
    this.playEffect(this.memoryAsset('draw_sound'))
    this.screen = 'result-draw'
    // CPU対戦の勝敗時には広告を出さない（広告は対戦途中＝プレイヤー5ペア時点に移動）。
  }

  private returnToStageSelect(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.beginTitleScreen()
  }

  public requestQuitBattle(): void {
    if (this.screen !== 'battle') {
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    this.pauseBattleAutomation()
    if (this.clinchedWinner) {
      this.isEarlyBattleDecisionOpen = true
      return
    }
    this.isQuitBattleConfirmOpen = true
  }

  private closeQuitBattleConfirm(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isQuitBattleConfirmOpen = false
    this.resumeBattleAutomation()
  }

  private confirmQuitBattle(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isQuitBattleConfirmOpen = false
    this.returnToStageSelect()
  }

  private continueClinchedBattle(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isEarlyBattleDecisionOpen = false
    this.resumeBattleAutomation()
  }

  private async finishClinchedBattle(): Promise<void> {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isEarlyBattleDecisionOpen = false
    await this.finishBattle()
  }

  public goToNextStage(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.openEnemyIntro()
  }

  // WEB の広告モックダイアログ。
  @state() private adMockOpen = false
  private adMockCount = 0
  // オフライン時（Android のみ）の広告ブロック警告ダイアログ。OK でスタートへ戻す。
  @state() private isOfflineAdWarningOpen = false
  // CPU対戦の途中広告（プレイヤー5ペア時点）を同ステージ内で二重に出さないためのフラグ。
  // 非永続なので、リトライ(startBattleでreset)・アプリ再起動の再挑戦では再び出る。
  private adShownThisStage = false
  // 広告（実/モック）を閉じた後に1回だけ実行する継続処理（途中広告の盤面再開／コールドゲーム表示）。
  private afterAdAction: (() => void) | null = null

  // 広告を要求する。Android=ネイティブ実広告 / WEB=モック。閉じたら afterAdAction を1回実行。
  //   - 一人用(practice): ゲーム終了時に呼ぶ（継続処理なし）。
  //   - CPU対戦(stage)  : プレイヤー5ペア時点で呼び、継続処理で盤面を再開する。
  //   ネイティブは game-end を受けると実広告を出し、終了後 window.__onAdComplete() を呼ぶ。
  private requestAd(after?: () => void): void {
    if (isAndroidApp()) {
      // 広告を出す箇所では Android のみネットワーク確認。オフラインなら実広告を出せないので、
      // 統一文言で警告し、スタート(ステージ選択)へ戻す（広告も継続処理も行わない）。
      if (isOfflineForAd()) {
        this.afterAdAction = null
        this.isOfflineAdWarningOpen = true
        return
      }
      this.afterAdAction = after ?? null
      notifyNativeGameEnd()
      return
    }
    // WEB は広告自体が無いのでネットワークチェックなし（Android限定）。モックを出すだけ。
    this.afterAdAction = after ?? null
    const { count } = countGameForAd(MEMORY_WEB_AD_COUNT_KEY)
    this.adMockCount = count
    this.adMockOpen = true
  }

  // オフライン広告警告を閉じてスタート＝標準アプリのメニュー(STARTボタン画面)へ戻す。
  // ステージ選択ではなくメニューまで戻す（他ゲームの go-home と統一）。
  private closeOfflineAdWarning(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isOfflineAdWarningOpen = false
    this.emitGoHome()
  }

  // 広告（実/モック）が閉じたとき。継続処理を1回だけ実行する。
  private readonly handleAdComplete = (): void => {
    // BGM(標準アプリ memorymonsters-standalone-app が所有)を広告後に明示復帰させる。
    // ネイティブ実広告は別Activityで、閉じても visibilitychange だけでは BGM が戻らない端末が
    // あるため、広告完了を window イベントで標準アプリへ伝えて updateBgmPlayback を促す。
    window.dispatchEvent(new CustomEvent('memory-ad-complete'))
    const action = this.afterAdAction
    this.afterAdAction = null
    action?.()
  }

  public renderResultBanner(relativePath: string, alt: string) {
    return html`
      <div class="result-banner">
        <img src=${this.assetUrl(relativePath)} alt=${alt} />
      </div>
    `
  }

  public retryLevel(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.openEnemyIntro()
  }

  public continueAfterLose(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.openEnemyIntro()
  }

  public leaveToMenuAfterLose(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.beginTitleScreen()
  }

  public requestGoHome(): void {
    if (this.screen !== 'title') {
      this.playEffect(this.memoryAsset('submit_sound'))
      this.pauseBattleAutomation()
    }
    this.isHomeConfirmOpen = true
  }

  private emitGoHome(): void {
    this.pauseBattleAutomation()
    this.dispatchEvent(new CustomEvent('go-home', { bubbles: true, composed: true }))
  }

  private closeHomeConfirm(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isHomeConfirmOpen = false
    this.resumeBattleAutomation()
  }

  private confirmGoHome(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isHomeConfirmOpen = false
    this.emitGoHome()
  }

  // ── フィードバック（Formspree・memory web のみ）──
  // 共通部品 <game-feedback> への橋渡しのみ。送信・入力検証・ダイアログ描画は部品側が持つ。
  private onFooterFeedback(event: CustomEvent<{ action: string }>): void {
    if (event.detail.action !== 'feedback') {
      return
    }
    this.playEffect(this.memoryAsset('submit_sound'))
    this.renderRoot.querySelector<GameFeedback>('game-feedback')?.open()
  }

  // 部品が開いた：自動演出を止め、キーボードでステージが縮まないよう scale を固定する。
  private onFeedbackOpen(): void {
    this.isFeedbackDialogOpen = true
    this.pauseBattleAutomation()
  }

  // 部品が閉じた（キャンセル / 送信結果クローズ）：自動演出を再開する。
  private onFeedbackClose(): void {
    this.isFeedbackDialogOpen = false
    this.resumeBattleAutomation()
  }

  // 部品内のボタン操作のたびに効果音を鳴らす（従来挙動の踏襲）。
  private onFeedbackInteract(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
  }

  public openSettings(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.pauseBattleAutomation()
    this.loadSettings()
    this.isGuideOpen = false
    this.isSettingsOpen = true
  }

  private closeSettings(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isSettingsOpen = false
    this.isSoundHelpOpen = false
    this.resumeBattleAutomation()
  }

  public openGuide(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.pauseBattleAutomation()
    this.isSettingsOpen = false
    this.isGuideOpen = true
  }

  private closeGuide(): void {
    this.playEffect(this.memoryAsset('submit_sound'))
    this.isGuideOpen = false
    this.resumeBattleAutomation()
  }

  handleSystemBack(): boolean {
    if (this.showEnemyInfo) {
      this.showEnemyInfo = false
      return true
    }
    if (this.isSoundHelpOpen) {
      this.isSoundHelpOpen = false
      this.resumeBattleAutomation()
      return true
    }
    if (this.isSettingsOpen) {
      this.isSettingsOpen = false
      this.resumeBattleAutomation()
      return true
    }
    if (this.isGuideOpen) {
      this.isGuideOpen = false
      this.resumeBattleAutomation()
      return true
    }
    if (this.isHomeConfirmOpen) {
      this.isHomeConfirmOpen = false
      this.resumeBattleAutomation()
      return true
    }
    if (this.isQuitBattleConfirmOpen) {
      this.isQuitBattleConfirmOpen = false
      this.resumeBattleAutomation()
      return true
    }
    if (this.isEarlyBattleDecisionOpen) {
      this.isEarlyBattleDecisionOpen = false
      this.resumeBattleAutomation()
      return true
    }
    if (this.screen !== 'title') {
      this.pauseBattleAutomation()
      this.isHomeConfirmOpen = true
      return true
    }
    return false
  }

  public currentEnemyStatusLabel(): string {
    if (this.isPracticeMode()) {
      return this.texts().practiceStatusLabel
    }
    const t = this.texts()
    return formatTemplate(t.enemyStatusFormat, {
      name: this.currentEnemyName(),
      stage: this.currentEnemy().stage
    })
  }

  public shouldShowEnemyStatus(): boolean {
    return this.screen === 'enemy-intro' || this.screen === 'draw-battle' || this.screen === 'battle' || this.screen === 'practice-setup' || this.screen === 'result-practice'
  }

  // 敵画像タップ → 敵情報をふわっと重ねる / 閉じる（カード表示へ戻る）。
  public openEnemyInfo(): void {
    if (this.isPracticeMode()) return // 練習モードは敵が居ないので出さない
    this.showEnemyInfo = true
  }

  public closeEnemyInfo(): void {
    this.showEnemyInfo = false
  }

  private renderHeader() {
    return renderMemoryBattleHeader(this)
  }

  private renderStatus() {
    return renderMemoryBattleStatus(this)
  }

  public drawBattleCardClass(slotId: 'left' | 'right'): string {
    if (!this.drawWinner || !this.selectedDrawSlotId) {
      return ''
    }
    const playerSlotId = this.selectedDrawSlotId
    const cpuSlotId = playerSlotId === 'left' ? 'right' : 'left'
    const winnerSlotId = this.drawWinner === 'player' ? playerSlotId : cpuSlotId
    return winnerSlotId === slotId ? 'is-winner' : ''
  }

  public drawBattleOwnerLabel(slotId: 'left' | 'right'): string {
    const t = this.texts()
    if (!this.selectedDrawSlotId) {
      return slotId === 'left' ? t.drawBattlePlayerLabel : t.drawBattleCpuLabel
    }
    return this.selectedDrawSlotId === slotId ? t.drawBattlePlayerLabel : t.drawBattleCpuLabel
  }

  public shouldShowDrawBattleOwnerLabels(): boolean {
    return Boolean(this.selectedDrawSlotId && this.drawPlayerCard && this.drawCpuCard)
  }

  public drawBattleSlotCard(slotId: 'left' | 'right'): CardFace | null {
    if (!this.selectedDrawSlotId || !this.drawPlayerCard || !this.drawCpuCard) {
      return null
    }
    return this.selectedDrawSlotId === slotId ? this.drawPlayerCard : this.drawCpuCard
  }

  private renderScreen() {
    return renderMemoryBattleScreen(this)
  }

  render() {
    if (!this.isConfigReady || !this.memoryConfig) {
      return html`<main class="game-shell"></main>`
    }
    const t = this.texts()
    const chrome = getSharedChromeText(this.language)
    return html`
      <main class="game-shell">
        <section class="stage" style=${`background-image: url('${this.assetUrl(this.memoryAsset('background'))}')`}>
          ${this.renderHeader()}
          ${this.renderStatus()}
          <div class="stage-body">
            ${this.renderScreen()}
          </div>
          <section class="region-footer" aria-label="Footer Area">
            <game-footer-bar
              showFeedback
              .feedbackLabel=${t.feedbackButton}
              @footer-feedback=${this.onFooterFeedback}
            ></game-footer-bar>
          </section>
          ${this.showEnemyInfo ? renderEnemyInfoOverlay(this) : null}
          ${isMemoryTraceVisible() && (this.screen === 'battle' || this.battleTraceLines.length > 0)
        ? html`
              <aside class="battle-trace-panel" aria-label="Memory battle trace">
                <strong>TRACE</strong>
                ${this.battleTraceLines.length > 0
            ? this.battleTraceLines.map(
              (line) => html`<span class=${line.tone === 'match' ? 'trace-line is-match' : 'trace-line'}>${line.text}</span>`
            )
            : html`<span>waiting for auto action...</span>`}
              </aside>
            `
        : null}

          ${this.isSettingsOpen
        ? html`
                <section class="overlay">
                  <div class="modal">
                    ${renderSettingsPanel({
            language: this.language,
            effectEnabled: this.isEffectEnabled,
            bgmEnabled: this.isBgmEnabled,
            soundHelpOpen: this.isSoundHelpOpen,
            showClearCache: false,
            onClose: () => this.closeSettings(),
            onEffectChange: (enabled) => this.setEffectEnabled(enabled),
            onBgmChange: (enabled) => this.setBgmEnabled(enabled),
            onLanguageChange: (next) => this.setLanguage(next),
            onOpenSoundHelp: () => { this.isSoundHelpOpen = true },
            onCloseSoundHelp: () => { this.isSoundHelpOpen = false }
          })}
                  </div>
                </section>
              `
        : null}

          ${this.isGuideOpen
        ? html`
                <section class="overlay">
                  <div class="modal">
                    <guide-overview-panel
                      .title=${t.guideTitle}
                      .lines=${t.guideLines}
                      .okLabel=${t.ok}
                      @guide-close=${this.closeGuide}
                    ></guide-overview-panel>
                  </div>
                </section>
              `
        : null}

          ${this.isHomeConfirmOpen
        ? html`
                <section class="overlay">
                  <div class="modal">
                    <confirm-dialog-panel
                      .title=${t.homeConfirmTitle}
                      .message=${t.homeConfirmMessage}
                      .okLabel=${t.homeConfirmOk}
                      .cancelLabel=${t.homeConfirmCancel}
                      @confirm-accept=${this.confirmGoHome}
                      @confirm-cancel=${this.closeHomeConfirm}
                    ></confirm-dialog-panel>
                  </div>
                </section>
                `
        : null}

          ${this.isStageStartConfirmOpen && this.pendingStageStart
        ? html`
                <section class="overlay">
                  <div class="modal">
                    <confirm-dialog-panel
                      .title=${formatTemplate(t.stageStartConfirmTitle, { stage: this.pendingStageStart })}
                      .message=${formatTemplate(t.stageStartConfirmMessage, { stage: this.pendingStageStart })}
                      .okLabel=${t.stageStartConfirmOk}
                      .cancelLabel=${t.stageStartConfirmCancel}
                      @confirm-accept=${this.confirmStageStart}
                      @confirm-cancel=${this.closeStageStartConfirm}
                    ></confirm-dialog-panel>
                  </div>
                </section>
              `
        : null}

          ${this.isQuitBattleConfirmOpen
        ? html`
                <section class="overlay">
                  <div class="modal">
                    <confirm-dialog-panel
                      .title=${this.isPracticeMode() ? t.quitPracticeConfirmTitle : t.quitBattleConfirmTitle}
                      .message=${t.quitBattleConfirmMessage}
                      .okLabel=${t.quitBattleConfirmOk}
                      .cancelLabel=${t.quitBattleConfirmCancel}
                      @confirm-accept=${this.confirmQuitBattle}
                      @confirm-cancel=${this.closeQuitBattleConfirm}
                    ></confirm-dialog-panel>
                  </div>
                </section>
              `
        : null}

          ${this.isEarlyBattleDecisionOpen && this.clinchedWinner
        ? html`
                <section class="overlay">
                  <div class="modal">
                    <confirm-dialog-panel
                      .title=${this.clinchedWinner === 'player' ? t.earlyWinConfirmTitle : t.earlyLoseConfirmTitle}
                      .message=${this.clinchedWinner === 'player' ? t.earlyWinConfirmMessage : t.earlyLoseConfirmMessage}
                      .okLabel=${t.earlyBattleContinue}
                      .cancelLabel=${t.earlyBattleFinish}
                      @confirm-accept=${this.continueClinchedBattle}
                      @confirm-cancel=${this.finishClinchedBattle}
                    ></confirm-dialog-panel>
                  </div>
                </section>
              `
        : null}

          ${this.isOfflineAdWarningOpen
        ? html`
                <section class="overlay">
                  <div class="modal">
                    <confirm-dialog-panel
                      .title=${chrome.offlineAdTitle}
                      .message=${chrome.offlineAdMessage}
                      .okLabel=${chrome.ok}
                      @confirm-accept=${this.closeOfflineAdWarning}
                    ></confirm-dialog-panel>
                  </div>
                </section>
              `
        : null}

          ${this.isBannerVisible
        ? html`
                <div class="match-banner is-visible">
                  <img src=${this.bannerImagePath} alt=${this.bannerAlt} />
                </div>
              `
        : null}
        </section>
      </main>

      <game-feedback
        .lang=${this.language}
        gameTitle="memory-battle-game"
        .titleLabel=${t.feedbackTitle}
        .placeholder=${t.feedbackPlaceholder}
        .okLabel=${t.feedbackOk}
        .cancelLabel=${t.feedbackCancel}
        .validationMin=${t.feedbackValidationMin}
        .submitFailed=${t.feedbackSubmitFailed}
        .submitSuccess=${t.feedbackSubmitSuccess}
        .resultOkLabel=${t.ok}
        @feedback-open=${this.onFeedbackOpen}
        @feedback-close=${this.onFeedbackClose}
        @feedback-interact=${this.onFeedbackInteract}
      ></game-feedback>
      ${this.adMockOpen ? html`
        <ad-mock-dialog
          .count=${this.adMockCount}
          .okLabel=${getSharedChromeText(this.language).ok}
          @ad-mock-close=${() => { this.playEffect(this.memoryAsset('submit_sound')); this.adMockOpen = false; this.handleAdComplete() }}
        ></ad-mock-dialog>` : null}
    `
  }

  static styles = [sharedOverlayStyles, utilities, memoryBattleGameTableStyles]
}
