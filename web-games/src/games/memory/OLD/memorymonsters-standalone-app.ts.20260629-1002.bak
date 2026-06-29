import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
  type AppLanguage,
  type MemoryAppConfigRoot,
  getMemoryAppLanguage,
  loadMemoryAppConfig
} from './memory-app-config'
import {
  type RemoveAdsUiConfigRoot,
  getRemoveAdsUiLanguage,
  loadRemoveAdsUiConfig
} from '../../shared/config/remove-ads-ui-config'
import { getLocalizedString, splitTextLines, requireGuideContent } from '../../shared/config/text-utils'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import { buildFeatureImageUrl } from '../../shared/infra/game-feature-image'
import { getGameTitle } from '../../shared/infra/game-title'
import { getAndroidBillingBridge, readRemoveAdsStateFromBridge } from '../../shared/infra/android-billing-bridge'
import {
  BGM_SETTING_CHANGED_EVENT,
  DEFAULT_BGM_ASSET,
  DEFAULT_BGM_VOLUME,
  loadBgmEnabledSetting,
  loadBgmVolumeSetting,
  saveBgmEnabledSetting
} from '../../shared/infra/bgm-setting'
import { clearLocalStoragePreservingProgress } from '../../shared/infra/storage-utils'
import { MEMORY_BATTLE_WEB_LINKS, buildNewsUrl, buildDetailUrl, buildOtherCardGamesUrl, buildAboutUrl, buildLiveDataUrl } from '../../shared/infra/web-store-links'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import { playTrackedEffect, stopAllEffects, clearEffectSuppression } from '../../shared/infra/submit-sound'
import { applyInitialDefaultLanguage, markInitialSetupCompleted, shouldShowInitialSetup } from '../../shared/infra/initial-setup'
import type { BillingResultPayload, RemoveAdsStatePayload } from '../../shared/types/android-bridge'
import { standaloneAppHostStyles, standaloneModalStyles } from '../../shared/ui/styles/standalone-app.styles'
import { applyStageScale } from '../../shared/ui/styles/stage-layout'
import '../../shared/ui/panels/confirm-dialog-panel'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/remove-ads-dialog-panel'
import { renderSettingsModal } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/menu/standalone-game-menu'
// お知らせ・別のカードゲームのモーダルは共通部品を再利用（high-low / old-maid と同一）。
import '../../shared/ui/panels/news-info-modal-panel'
import '../../shared/ui/panels/other-games-modal-panel'
import type { OtherGameItem } from '../../shared/ui/panels/other-games-modal-panel'
import './memory-battle-standalone-app'
import { SceneFadeController, renderSceneFade, sceneFadeStyles, SCENE_FADE_MS } from '../../shared/ui/scene-fade'

import { LANGUAGE_KEY, SOUND_ENABLED_KEY } from '../../shared/config/storage-keys'

type MemoryBattleBackHandler = {
  onSystemBack: () => boolean
}

@customElement('memorymonsters-standalone-app')
export class MemoryMonstersStandaloneApp extends LitElement {
  private bgmAudio: HTMLAudioElement | null = null
  private hasUserInteraction = false
  // タブ/アプリ非表示・フォーカス喪失中は BGM を止める（High & Low と同じ共通仕組み）。
  private windowBlurred = false

  // HOME 復帰のフワッとフェード（手本=kaitensushimaster・全ゲーム統一）
  private readonly sceneFade = new SceneFadeController(this)

  @state()
  private route: 'menu' | 'game' | 'guide' | 'settings' = 'menu'

  @state()
  private language: AppLanguage = 'en'

  @state()
  private memoryConfig: MemoryAppConfigRoot | null = null

  @state()
  private removeAdsUiConfig: RemoveAdsUiConfigRoot | null = null

  @state()
  private isEffectEnabled = true

  @state()
  private isBgmEnabled = false

  @state()
  private isRemoveAdsOpen = false

  @state()
  private isCacheConfirmOpen = false

  @state()
  private isSoundHelpOpen = false

  @state()
  private isAdsRemoved = false

  @state()
  private removeAdsPrice = ''

  @state()
  private removeAdsStatusMessage = ''

  // 初回起動時の設定画面(言語選択)。判定は shared/infra/initial-setup 単一ソース。
  @state()
  private isInitialSetupPending = false

  @state()
  private isInitialSetupNoticeOpen = false

  // お知らせ・更新情報 / 別のカードゲーム のアプリ内モーダル（high-low と同方式）。
  @state()
  private isNewsOpen = false

  @state()
  private isOtherGamesOpen = false

  // card-games-list.json（games-list.csv 由来）。別のカードゲーム一覧に使う。
  @state()
  private cardGames: Array<{
    file_name: string; title: string; google_play_store_url: string
    store_state: string; web_published: boolean
    google_description?: Record<string, string>
  }> = []

  // 規約は外部ライブ terms-of-use.json のみ（同梱フォールバック禁止）。未取得=オフライン通知を出す。high-low と同方式。
  @state()
  private termsData: Record<string, { title: string; body: string }> | null = null

  connectedCallback(): void {
    super.connectedCallback()
    { const t = getGameTitle('memory-battle'); if (t) document.title = t }
    this.loadSettings()
    this.evaluateInitialSetup()
    this.syncRemoveAdsStateFromBridge()
    void this.loadConfig()
    // 「別のカードゲーム」一覧（Android=ライブ→失敗時バンドル / WEB=同一オリジン）。high-low と同方式。
    void this.loadCardGamesList()
    // 規約（terms-of-use.json）＝外部ライブのみ。同梱フォールバックしない（high-low と同方式）。
    void this.loadTermsOfUse()
    this.updateScale()
    window.addEventListener('resize', this.updateScale)
    window.visualViewport?.addEventListener('resize', this.updateScale)
    window.addEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    window.addEventListener('pointerdown', this.onFirstUserInteraction, { passive: true })
    window.addEventListener('keydown', this.onFirstUserInteraction)
    // フォーカス移動/非表示で BGM 停止（WEB=タブ切替・アプリ=背面化 を同じ仕組みで）。
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('blur', this.onWindowBlur)
    window.addEventListener('focus', this.onWindowFocus)
    // 広告(別Activity)終了時に game-table が発火。visibilitychange だけでは戻らない端末向けに
    // BGM を明示復帰させる。
    window.addEventListener('memory-ad-complete', this.onAdComplete)
    window.__onEntitlementsChanged = this.onEntitlementsChanged
    window.__onBillingResult = this.onBillingResult
      ; (window as Window & { __MEMORYMONSTERS_APP__?: { onAndroidBack: () => boolean } }).__MEMORYMONSTERS_APP__ = {
        onAndroidBack: () => this.handleSystemBack()
      }
    // BK-1: ブラウザ戻る(popstate)を監視。
    window.addEventListener('popstate', this.onPopState)
    if (this.route === 'game') this.armHistoryGuard()
  }

  firstUpdated(): void {
    this.updateScale()
  }

  /** 設定/ガイド等のモーダルをハブと同じ stage スケールで縮小するための係数を算出。 */
  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    window.visualViewport?.removeEventListener('resize', this.updateScale)
    window.removeEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    window.removeEventListener('pointerdown', this.onFirstUserInteraction)
    window.removeEventListener('keydown', this.onFirstUserInteraction)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('blur', this.onWindowBlur)
    window.removeEventListener('focus', this.onWindowFocus)
    window.removeEventListener('memory-ad-complete', this.onAdComplete)
    delete window.__onEntitlementsChanged
    delete window.__onBillingResult
    const runtimeWindow = window as Window & { __MEMORYMONSTERS_APP__?: { onAndroidBack: () => boolean } }
    delete runtimeWindow.__MEMORYMONSTERS_APP__
    window.removeEventListener('popstate', this.onPopState)
    this.teardownBgm()
    super.disconnectedCallback()
  }

  private readonly onFirstUserInteraction = (): void => {
    if (this.hasUserInteraction) {
      return
    }
    this.hasUserInteraction = true
    this.updateBgmPlayback()
  }

  // タブ/アプリ非表示・フォーカス移動で BGM 停止／復帰（updateBgmPlayback が条件を再評価）。
  private readonly onVisibilityChange = (): void => {
    // Android WebView は別アプリから復帰しても window 'focus' が飛ばないことがあり、
    // windowBlurred が true のまま固着して BGM が再開しない。可視化＝フォアグラウンド復帰
    // とみなして blur フラグを解除し、focus イベントの到着に依存しないようにする。
    if (!document.hidden) { this.windowBlurred = false }
    this.updateBgmPlayback()
  }
  // 広告(別Activity)終了後の BGM 明示復帰。閉じた直後はまだ document.hidden が解消されて
  // いないことがあるため、即時＋少し遅延の二段で再評価する（focus 非依存で確実に ON へ戻す）。
  private readonly onAdComplete = (): void => {
    this.windowBlurred = false
    this.updateBgmPlayback()
    window.setTimeout(() => { this.windowBlurred = false; this.updateBgmPlayback() }, 300)
  }

  private readonly onWindowBlur = (): void => { this.windowBlurred = true; this.updateBgmPlayback() }
  private readonly onWindowFocus = (): void => { this.windowBlurred = false; this.updateBgmPlayback() }

  private readonly onBgmSettingChanged = (): void => {
    this.isBgmEnabled = loadBgmEnabledSetting()
    this.updateBgmPlayback()
  }

  private loadSettings(): void {
    this.isEffectEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'
    this.isBgmEnabled = loadBgmEnabledSetting()
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    if (savedLanguage === 'en' || savedLanguage === 'ja' || savedLanguage === 'zh') {
      this.language = savedLanguage
    }
  }

  private async loadConfig(): Promise<void> {
    const [memoryConfig, removeAdsUiConfig] = await Promise.all([
      loadMemoryAppConfig(),
      loadRemoveAdsUiConfig()
    ])
    this.memoryConfig = memoryConfig
    this.removeAdsUiConfig = removeAdsUiConfig
    if (!localStorage.getItem(LANGUAGE_KEY)) {
      this.language = memoryConfig.default_language ?? 'en'
      localStorage.setItem(LANGUAGE_KEY, this.language)
    }
    this.setupBgm()
    this.updateBgmPlayback()
  }

  private setupBgm(): void {
    // BGM は共通 common/bgm/ に集約（DEFAULT_BGM_ASSET）。config 由来の個別 bgm は使わない。
    if (this.bgmAudio) {
      return
    }
    this.bgmAudio = new Audio(this.assetUrl(DEFAULT_BGM_ASSET))
    this.bgmAudio.loop = true
    this.bgmAudio.preload = 'auto'
    this.bgmAudio.volume = loadBgmVolumeSetting() || DEFAULT_BGM_VOLUME
  }

  private teardownBgm(): void {
    if (!this.bgmAudio) {
      return
    }
    this.bgmAudio.pause()
    this.bgmAudio.src = ''
    this.bgmAudio = null
  }

  private updateBgmPlayback(): void {
    if (!this.bgmAudio) {
      return
    }
    this.bgmAudio.volume = loadBgmVolumeSetting() || DEFAULT_BGM_VOLUME
    if (!this.isBgmEnabled || !this.hasUserInteraction || document.hidden || this.windowBlurred) {
      this.bgmAudio.pause()
      return
    }
    void this.bgmAudio.play().catch(() => undefined)
  }

  private assetUrl(relativePath: string): string {
    return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/${relativePath}`, window.location.href).toString()
  }

  private isAndroidApp(): boolean {
    const runtimeWindow = window as Window & { __ANDROID_APP__?: boolean }
    return runtimeWindow.__ANDROID_APP__ === true
  }

  private playSubmit(): void {
    if (!this.isEffectEnabled || !this.memoryConfig?.assets?.submit_sound) {
      return
    }
    // 再生/追跡/一括停止・ホーム戻り抑止は共有 submit-sound に集約。
    playTrackedEffect(this.assetUrl(this.memoryConfig.assets.submit_sound))
  }

  private setEffectEnabled(enabled: boolean): void {
    const wasEnabled = this.isEffectEnabled
    this.isEffectEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
    if (!wasEnabled && enabled) {
      this.playSubmit()
    }
  }

  private setBgmEnabled(enabled: boolean): void {
    this.playSubmit()
    this.isBgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
    this.updateBgmPlayback()
  }

  private openGuide = (): void => {
    this.playSubmit()
    this.route = 'guide'
    this.isRemoveAdsOpen = false
    this.isCacheConfirmOpen = false
    this.isSoundHelpOpen = false
  }

  private openSettings = (): void => {
    this.playSubmit()
    this.route = 'settings'
    this.isRemoveAdsOpen = false
    this.isCacheConfirmOpen = false
  }

  private closeGuide = (): void => {
    this.playSubmit()
    this.route = 'menu'
  }

  private closeSettings = (): void => {
    this.playSubmit()
    if (this.isInitialSetupPending) {
      this.completeInitialSetup()
      return
    }
    this.route = 'menu'
    this.isSoundHelpOpen = false
    this.isCacheConfirmOpen = false
  }

  // 初回起動: 言語未保存なら既定 en で設定画面を自動表示し、言語選択を促す。
  private evaluateInitialSetup(): void {
    if (!shouldShowInitialSetup()) {
      return
    }
    this.language = applyInitialDefaultLanguage()
    this.isInitialSetupPending = true
    this.route = 'settings'
    this.isRemoveAdsOpen = false
    this.isCacheConfirmOpen = false
    this.isSoundHelpOpen = false
  }

  private completeInitialSetup(): void {
    this.isInitialSetupPending = false
    this.route = 'menu'
    this.isSoundHelpOpen = false
    this.isCacheConfirmOpen = false
    markInitialSetupCompleted()
    this.isInitialSetupNoticeOpen = true
  }

  private closeInitialSetupNotice = (): void => {
    this.playSubmit()
    this.isInitialSetupNoticeOpen = false
  }

  private openSoundHelp = (): void => {
    this.playSubmit()
    this.isSoundHelpOpen = true
  }

  private closeSoundHelp = (): void => {
    this.playSubmit()
    this.isSoundHelpOpen = false
  }

  private openRemoveAds = (): void => {
    this.playSubmit()
    this.syncRemoveAdsStateFromBridge()
    this.removeAdsStatusMessage = ''
    this.isRemoveAdsOpen = true
    this.route = 'menu'
    this.isCacheConfirmOpen = false
    this.isSoundHelpOpen = false
  }

  private closeRemoveAds = (): void => {
    this.playSubmit()
    this.isRemoveAdsOpen = false
  }

  // 「お知らせ・更新情報」: 2ボタン式モーダル（最新版を確認/このアプリについて）。high-low onNews と同方式。
  private onNews = (): void => {
    this.playSubmit()
    this.isNewsOpen = true
    this.route = 'menu'
    this.isRemoveAdsOpen = false
    this.isCacheConfirmOpen = false
    this.isSoundHelpOpen = false
  }

  private closeNews = (): void => {
    this.playSubmit()
    this.isNewsOpen = false
  }

  // 「別のカードゲーム」: アプリ内モーダルで一覧（Android のみメニューに表示）。high-low onOtherGames と同方式。
  private onOtherGames = (): void => {
    this.playSubmit()
    this.isOtherGamesOpen = true
    this.route = 'menu'
    this.isRemoveAdsOpen = false
    this.isCacheConfirmOpen = false
    this.isSoundHelpOpen = false
  }

  private closeOtherGames = (): void => {
    this.playSubmit()
    this.isOtherGamesOpen = false
  }

  // 一覧 JSON（card-games-list.json）を読む。Android=ライブ(app-flux-mirror)→失敗時バンドル / WEB=同一オリジン。
  // high-low loadCardGamesList と同一ロジック。全滅時は一覧空でモーダルは開く（致命的でない）。
  private async loadCardGamesList(): Promise<void> {
    const urls = [
      this.isAndroidApp() ? buildLiveDataUrl('web-games/game-assets/configs/card-games-list.json') : '',
      buildGameAssetUrl('configs/card-games-list.json'),
    ].filter(Boolean)
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) continue
        const data = (await res.json()) as { games?: typeof this.cardGames }
        if (Array.isArray(data.games)) { this.cardGames = data.games; return }
      } catch {
        // 次(フォールバック)へ。
      }
    }
  }

  // 規約 JSON（terms-of-use.json）を **外部ライブのみ**取得。Android=app-flux ライブ / WEB=同一オリジン(本番サイト)。
  // **AAB 同梱(appassets)へはフォールバックしない**（同梱の古いコピーを出すと出荷後に差し替え不能＝禁止）。
  // 取得失敗（オフライン等）時は termsData=null のまま＝規約本文の代わりに「ネット必要」通知を出す（同梱の古い規約は出さない）。
  private async loadTermsOfUse(): Promise<void> {
    const url = this.isAndroidApp()
      ? buildLiveDataUrl('web-games/game-assets/configs/terms-of-use.json')
      : buildGameAssetUrl('configs/terms-of-use.json')
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as Record<string, { title: string; body: string }>
      if (data && typeof data === 'object') this.termsData = data
    } catch {
      // 外部ライブ取得失敗＝規約は同梱へフォールバックしない（オフライン通知を出す）。
    }
  }

  // 規約は外部ライブ(termsData)が唯一の正。未取得(オフライン)時は共有 chrome の「ネット必要」文言を出す（同梱の古い規約ではない）。
  private get termsTitleOrOfflineNotice(): string {
    const t = this.termsData?.[this.language]?.title
    return t && t.trim() ? t : getSharedChromeText(this.language).offlineAdTitle
  }
  private get termsBodyOrOfflineNotice(): string {
    const b = this.termsData?.[this.language]?.body
    return b && b.trim() ? b : getSharedChromeText(this.language).externalLinkNote
  }

  // モーダルに渡す項目：現在のゲーム(memory-battle)を除外し、web_published かつ非hidden を動的に。high-low otherGameItems と同一。
  private otherGameItems(): OtherGameItem[] {
    return this.cardGames
      .filter((g) => g.file_name !== 'memory-battle' && g.web_published && g.store_state !== 'hidden')
      .map((g) => ({
        title: g.title,
        description: g.google_description?.[this.language] ?? g.google_description?.en ?? '',
        featImageUrl: this.isAndroidApp()
          ? buildLiveDataUrl(`site-assets/images/games-apps/${g.file_name}/${g.file_name}-feat.webp`)
          : buildFeatureImageUrl(g.file_name),
        storeUrl: g.store_state === 'button' ? g.google_play_store_url : '',
        comingSoon: g.store_state === 'comingsoon',
      }))
  }

  private openClearCacheConfirm = (): void => {
    this.playSubmit()
    this.isCacheConfirmOpen = true
    this.isSoundHelpOpen = false
  }

  private closeClearCacheConfirm = (): void => {
    this.playSubmit()
    this.isCacheConfirmOpen = false
  }

  // キャッシュクリアは全カードゲーム統一（ハブ/High&Low と同じ）:
  // コイン/進捗のみ残し、言語・初回フラグも含めて消して再読込 → 初回設定画面が再表示される。
  private clearCache = (): void => {
    this.playSubmit()
    this.isCacheConfirmOpen = false
    this.isSoundHelpOpen = false
    clearLocalStoragePreservingProgress()
    window.location.reload()
  }

  // ゲーム内 HOME → このアプリ自身のメニューへフワッと(out→in)復帰（全ゲーム統一）。
  // 盤面の go-home は composed なので、止めないと main.memorymonsters まで漏れてページ再読込されてしまう。
  // web/Android とも同じ in-page 復帰にし、/games-apps へは戻さない。
  private goHome = (event?: Event): void => {
    event?.stopPropagation()
    // BG-3: 再生中 SFX を停止＋フェード中(out+in≈2×)の鳴り込みも抑止。
    stopAllEffects(SCENE_FADE_MS * 2)
    this.sceneFade.run(() => {
      // ゲーム内で変えた言語/音設定を localStorage から取り込み直す（メニューが英語等に戻って見えるのを防ぐ）
      this.loadSettings()
      this.route = 'menu'
      this.isRemoveAdsOpen = false
      this.isCacheConfirmOpen = false
      this.isSoundHelpOpen = false
    })
  }

  private goExternalHome = (): void => {
    this.playSubmit()
    if (this.isAndroidApp()) {
      return
    }
    this.dispatchEvent(new CustomEvent('menu-back', { bubbles: true, composed: true }))
  }

  private syncRemoveAdsStateFromBridge(): void {
    const bridge = getAndroidBillingBridge()
    if (!bridge) {
      return
    }
    this.applyRemoveAdsState(readRemoveAdsStateFromBridge())
  }

  private applyRemoveAdsState(payload: Partial<RemoveAdsStatePayload>): void {
    if (typeof payload.price === 'string') {
      this.removeAdsPrice = payload.price
    }
    if (payload.removeAds === true) {
      this.isAdsRemoved = true
      this.isRemoveAdsOpen = false
      const win = window as Window & { AppFluxHost?: { postMessage: (msg: string) => void } }
      win.AppFluxHost?.postMessage(JSON.stringify({ type: 'ads-removed', value: true }))
    }
  }

  private readonly onEntitlementsChanged = (payload: Partial<RemoveAdsStatePayload>): void => {
    this.applyRemoveAdsState(payload)
  }

  private readonly onBillingResult = (payload: BillingResultPayload): void => {
    const t = this.texts()
    const code = payload?.code ?? ''
    if (code === 'PURCHASED' || code === 'RESTORED') {
      this.removeAdsStatusMessage = t.removeAdsPurchaseSuccessMessage
      this.isAdsRemoved = true
      return
    }
    if (code === 'CANCELED') {
      this.removeAdsStatusMessage = t.removeAdsPurchaseFailedMessage
      return
    }
    this.removeAdsStatusMessage = t.removeAdsPurchaseErrorMessage
  }

  private onRemoveAdsPurchase = (): void => {
    const t = this.texts()
    this.playSubmit()
    if (this.isAdsRemoved) {
      this.removeAdsStatusMessage = t.removeAdsAlreadyPurchased
      return
    }
    const bridge = getAndroidBillingBridge()
    if (!bridge?.buyRemoveAds) {
      this.removeAdsStatusMessage = t.removeAdsPurchaseUnavailableMessage
      return
    }
    this.removeAdsStatusMessage = ''
    bridge.buyRemoveAds()
  }

  private withRemoveAdsPrice(label: string): string {
    const price = this.removeAdsPrice.trim()
    if (price.length === 0) {
      return label
    }
    return `${label} ${price}`
  }

  // ── BK-1: ブラウザ「戻る」(popstate) ガード ──────────────────
  // ゲーム中にブラウザ戻ると、Android 戻ると同じ handleSystemBack() を呼び（終了確認等を再利用）、
  // 確認なしの素通り離脱を防ぐ。
  private historyGuardArmed = false

  private armHistoryGuard(): void {
    if (this.historyGuardArmed) return
    history.pushState({ cardGameBackGuard: true }, '')
    this.historyGuardArmed = true
  }

  private readonly onPopState = (): void => {
    this.historyGuardArmed = false
    const handled = this.handleSystemBack()
    if (handled || this.route !== 'menu') {
      this.armHistoryGuard()
    }
  }

  private handleSystemBack(): boolean {
    if (this.isInitialSetupNoticeOpen) {
      this.isInitialSetupNoticeOpen = false
      return true
    }
    if (this.isCacheConfirmOpen) {
      this.isCacheConfirmOpen = false
      return true
    }
    if (this.isSoundHelpOpen) {
      this.isSoundHelpOpen = false
      return true
    }
    if (this.isRemoveAdsOpen) {
      this.isRemoveAdsOpen = false
      return true
    }
    if (this.isNewsOpen) {
      this.playSubmit()
      this.isNewsOpen = false
      return true
    }
    if (this.isOtherGamesOpen) {
      this.playSubmit()
      this.isOtherGamesOpen = false
      return true
    }
    if (this.route === 'guide' || this.route === 'settings') {
      this.playSubmit()
      this.route = 'menu'
      this.isSoundHelpOpen = false
      this.isCacheConfirmOpen = false
      return true
    }
    if (this.route === 'game') {
      const runtimeWindow = window as Window & { __SIMPLE_MEMORY_BATTLE_APP__?: MemoryBattleBackHandler }
      if (runtimeWindow.__SIMPLE_MEMORY_BATTLE_APP__?.onSystemBack()) {
        return true
      }
      this.playSubmit()
      this.goHome()
      return true
    }
    return false
  }

  private texts() {
    const block = getMemoryAppLanguage(this.memoryConfig, this.language)
    const removeAdsUi = getRemoveAdsUiLanguage(this.removeAdsUiConfig, this.language)
    const menu = block?.menu
    const settings = block?.settings
    const common = block?.common
    const ads = block?.ads
    const game = block?.game
    const overview = block?.overview_info
    const chrome = getSharedChromeText(this.language)

    return {
      title: getGameTitle('memory-battle') ?? (getLocalizedString(game, 'title') || 'Classic Simple Memory Battle'),
      start: chrome.start,
      guide: chrome.guideOverview,
      settings: chrome.settings,
      removeAds: getLocalizedString(menu, 'remove_ads') || 'Remove Ads',
      backLabel: chrome.back,
      guideTitle: chrome.guideOverview,
      guideLines: requireGuideContent(overview, 'memory'),
      settingsTitle: chrome.settings,
      languageLabel: getLocalizedString(settings, 'language') || 'Language',
      effectLabel: getLocalizedString(settings, 'sound_effect') || 'Effect',
      bgmLabel: getLocalizedString(settings, 'bgm') || 'BGM',
      clearCacheLabel: getLocalizedString(settings, 'clear_cache') || 'Clear Cache',
      cacheConfirmTitle: getLocalizedString(settings, 'clear_cache_confirm_title') || 'Clear Cache',
      cacheConfirmMessage:
        getLocalizedString(settings, 'clear_cache_confirm_message') || 'Clear cache now? Coins and stage progress will be kept.',
      soundHelpTitle: getLocalizedString(settings, 'sound_help_title') || 'Sound Help',
      soundHelpMessage: getLocalizedString(settings, 'sound_help_message') || '',
      soundHelpButtonLabel: getLocalizedString(settings, 'sound_help_button_label') || '?',
      okLabel: getLocalizedString(common, 'ok') || 'OK',
      cancelLabel: getLocalizedString(common, 'cancel') || 'Cancel',
      removeAdsTitle: getLocalizedString(menu, 'remove_ads') || 'Remove Ads',
      removeAdsLines: [
        getLocalizedString(ads, 'remove_ads_benefit_1_title'),
        getLocalizedString(ads, 'remove_ads_benefit_1_desc'),
        getLocalizedString(ads, 'remove_ads_benefit_2_title'),
        getLocalizedString(ads, 'remove_ads_benefit_2_desc')
      ].filter((line) => line.length > 0),
      removeAdsCloseLabel: removeAdsUi?.close_label || 'X',
      removeAdsPurchaseLabel: getLocalizedString(ads, 'purchase_button') || removeAdsUi?.purchase_label || 'Purchase',
      removeAdsCancelLabel: removeAdsUi?.cancel_label || 'Cancel',
      removeAdsTermsLabel: removeAdsUi?.terms_label || 'Terms',
      removeAdsTermsTitle: this.termsTitleOrOfflineNotice,
      removeAdsTermsCloseLabel: removeAdsUi?.terms_close_label || 'Close',
      removeAdsTermsContent: this.termsBodyOrOfflineNotice,
      removeAdsAlreadyPurchased: getLocalizedString(ads, 'already_purchased') || 'Already Purchased',
      removeAdsPurchaseFailedMessage: getLocalizedString(ads, 'purchase_failed') || 'Purchase failed. Please try again.',
      removeAdsPurchaseErrorMessage: getLocalizedString(ads, 'purchase_error') || 'An error occurred during purchase. Please try again.',
      removeAdsPurchaseSuccessMessage:
        getLocalizedString(ads, 'purchase_success_message') || 'Thank you for your purchase! Ads have been removed from the app.',
      removeAdsPurchaseUnavailableMessage: removeAdsUi?.purchase_message || 'Purchase is not implemented yet.',
      news: chrome.news,
      newsShort: chrome.newsShort,
      otherCardGames: chrome.otherCardGames,
      externalLinkNote: chrome.externalLinkNote,
      newsUrl: buildDetailUrl('memory-battle', this.language),
      // お知らせモーダル（high-low と同じ chrome 単一ソース）
      newsModalTitle: chrome.newsModalTitle,
      checkLatest: chrome.checkLatest,
      aboutThisApp: chrome.aboutThisApp,
      comingSoon: chrome.comingSoon,
      storeUrl: this.memoryConfig?.app_info?.play_store_url ?? '',
      aboutUrl: buildAboutUrl('memory-battle', this.language),
      initialSetupTitle: chrome.initialSetupTitle,
      initialSetupDoneTitle: chrome.initialSetupDoneTitle,
      initialSetupDoneMessage: chrome.initialSetupDoneMessage,
      version: '1.0.0'
    }
  }

  render() {
    if (!this.memoryConfig || !this.removeAdsUiConfig) {
      return html`<main class="shell"></main>`
    }

    const t = this.texts()

    if (this.route === 'game') {
      return html`<memory-battle-standalone-app @go-home=${this.goHome}></memory-battle-standalone-app>${renderSceneFade(this.sceneFade.state)}`
    }

    return html`
      <div class="menu-shell">
        <standalone-game-menu
          .title=${t.title}
          .heroImageSrc=${buildFeatureImageUrl('memory-battle')}
          .heroImageAlt=${t.title}
          .startLabel=${t.start}
          .guideLabel=${t.guide}
          .settingsLabel=${t.settings}
          .backLabel=${this.isAndroidApp() ? '' : t.backLabel}
          .extraActionLabel=${this.isAndroidApp() ? t.removeAds : ''}
          .storeNotice=${this.isAndroidApp() ? '' : getSharedChromeText(this.language).alsoOnGooglePlay}
          .storeTitle=${this.isAndroidApp() ? '' : t.title}
          .storeUrl=${this.isAndroidApp() ? '' : (this.memoryConfig?.app_info?.play_store_url ?? '')}
          .storeState=${this.isAndroidApp() ? 'hidden' : (this.memoryConfig?.app_info?.store_state ?? 'button')}
          .storeBadgeSrc=${this.isAndroidApp() ? '' : MEMORY_BATTLE_WEB_LINKS.storeBadgeUrl}
          .storeBadgeAlt=${MEMORY_BATTLE_WEB_LINKS.storeBadgeAlt}
          .youtubeUrl=${this.isAndroidApp() ? '' : (this.memoryConfig?.app_info?.youtube_url ?? '')}
          .youtubeBadgeSrc=${this.isAndroidApp() ? '' : MEMORY_BATTLE_WEB_LINKS.youtubeBadgeUrl}
          .youtubeBadgeAlt=${MEMORY_BATTLE_WEB_LINKS.youtubeBadgeAlt}
          .newsLabel=${this.isAndroidApp() ? t.newsShort : t.news}
          .newsUrl=${t.newsUrl}
          .otherGamesLabel=${this.isAndroidApp() ? t.otherCardGames : ''}
          .otherGamesUrl=${this.isAndroidApp() ? buildOtherCardGamesUrl(this.language) : ''}
          .externalIconSrc=${this.isAndroidApp() ? buildGameAssetUrl('common/images/external_link.svg') : ''}
          .externalNote=${this.isAndroidApp() ? t.externalLinkNote : ''}
          .version=${this.isAndroidApp() ? t.version : ''}
          @menu-back=${this.goExternalHome}
          @menu-start=${() => {
        clearEffectSuppression() // BG-3: 直前のホーム戻り抑止が残っていても開始音を鳴らす
        this.playSubmit()
        this.route = 'game'
        this.armHistoryGuard()
      }}
          @menu-guide=${this.openGuide}
          @menu-settings=${this.openSettings}
          @menu-extra=${this.openRemoveAds}
          @menu-news=${this.onNews}
          @menu-other-games=${this.onOtherGames}
        ></standalone-game-menu>
        ${this.route === 'guide'
        ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <guide-overview-panel
                    .title=${t.guideTitle}
                    .lines=${t.guideLines}
                    .okLabel=${t.okLabel}
                    @guide-close=${this.closeGuide}
                  ></guide-overview-panel>
                </section>
              </main>
            `
        : null}
        ${this.route === 'settings'
        ? renderSettingsModal({
          language: this.language,
          effectEnabled: this.isEffectEnabled,
          bgmEnabled: this.isBgmEnabled,
          isInitialSetup: this.isInitialSetupPending,
          soundHelpOpen: this.isSoundHelpOpen,
          onClose: () => this.closeSettings(),
          onEffectChange: (enabled) => this.setEffectEnabled(enabled),
          onBgmChange: (enabled) => this.setBgmEnabled(enabled),
          onLanguageChange: (lang) => { this.language = lang; localStorage.setItem(LANGUAGE_KEY, lang) },
          onClearCache: () => this.openClearCacheConfirm(),
          onOpenSoundHelp: () => this.openSoundHelp(),
          onCloseSoundHelp: () => this.closeSoundHelp()
        })
        : null}
        ${this.isRemoveAdsOpen
        ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <remove-ads-dialog-panel
                    .title=${t.removeAdsTitle}
                    .lines=${t.removeAdsLines}
                    .closeLabel=${t.removeAdsCloseLabel}
                    .showPurchase=${true}
                    .purchaseLabel=${this.isAdsRemoved ? t.removeAdsAlreadyPurchased : this.withRemoveAdsPrice(t.removeAdsPurchaseLabel)}
                    .cancelLabel=${t.removeAdsCancelLabel}
                    .showTerms=${true}
                    .termsLabel=${t.removeAdsTermsLabel}
                    .termsTitle=${t.removeAdsTermsTitle}
                    .termsCloseLabel=${t.removeAdsTermsCloseLabel}
                    .termsContent=${t.removeAdsTermsContent}
                    .priceLabel=${this.removeAdsPrice}
                    .statusLabel=${this.removeAdsStatusMessage}
                    .purchased=${this.isAdsRemoved}
                    @remove-ads-purchase=${this.onRemoveAdsPurchase}
                    @remove-ads-close=${this.closeRemoveAds}
                  ></remove-ads-dialog-panel>
                </section>
              </main>
            `
        : null}
        ${this.isNewsOpen
        ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <news-info-modal-panel
                    .title=${t.newsModalTitle}
                    .checkLatestLabel=${t.checkLatest}
                    .aboutLabel=${t.aboutThisApp}
                    .backLabel=${t.backLabel}
                    .storeUrl=${t.storeUrl}
                    .aboutUrl=${t.aboutUrl}
                    @news-info-close=${this.closeNews}
                  ></news-info-modal-panel>
                </section>
              </main>
            `
        : null}
        ${this.isOtherGamesOpen
        ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <other-games-modal-panel
                    .title=${t.otherCardGames}
                    .games=${this.otherGameItems()}
                    .playLabel=${'Google Play'}
                    .comingSoonLabel=${t.comingSoon}
                    .okLabel=${t.backLabel}
                    @other-games-close=${this.closeOtherGames}
                  ></other-games-modal-panel>
                </section>
              </main>
            `
        : null}
        ${this.isCacheConfirmOpen
        ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <confirm-dialog-panel
                    .title=${t.cacheConfirmTitle}
                    .message=${t.cacheConfirmMessage}
                    .okLabel=${t.okLabel}
                    .cancelLabel=${t.cancelLabel}
                    @confirm-accept=${this.clearCache}
                    @confirm-cancel=${this.closeClearCacheConfirm}
                  ></confirm-dialog-panel>
                </section>
              </main>
            `
        : null}
        ${this.isInitialSetupNoticeOpen
        ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <guide-overview-panel
                    .title=${t.initialSetupDoneTitle}
                    .lines=${[t.initialSetupDoneMessage]}
                    .okLabel=${t.okLabel}
                    @guide-close=${this.closeInitialSetupNotice}
                  ></guide-overview-panel>
                </section>
              </main>
            `
        : null}
      </div>
      ${renderSceneFade(this.sceneFade.state)}
    `
  }

  // 設定/ガイド等のモーダルの枠(.modal-shell/.modal-card)は標準ベース standaloneModalStyles
  // に集約済み（540 拡大ステージ＋680px＋settings-panel 既定値）。ここでの上書きは不要。
  static styles = [
    standaloneAppHostStyles,
    standaloneModalStyles,
    sceneFadeStyles
  ]
}
