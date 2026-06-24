import { LitElement, css, html, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import {
  type AppConfigRoot,
  type AppConfigLanguage,
  type AppLanguage,
  getDefaultLanguage,
  getLanguageBlock,
  getLocalizedString,
  loadAppConfig,
  splitTextLines
} from '../config/app-config'
import { getSharedChromeText } from '../config/shared-chrome-text'
import { LANGUAGE_KEY, SOUND_ENABLED_KEY } from '../config/storage-keys'
import {
  BGM_SETTING_CHANGED_EVENT,
  DEFAULT_BGM_VOLUME,
  loadBgmEnabledSetting,
  loadBgmVolumeSetting,
  saveBgmEnabledSetting
} from '../infra/bgm-setting'
import { buildGameAssetUrl } from '../infra/game-asset-url'
import { buildFeatureImageUrl } from '../infra/game-feature-image'
import { playSubmitSound } from '../infra/submit-sound'
import { CARD_GAMES_HUB_WEB_LINKS, buildDetailUrl, buildOtherCardGamesUrl, buildLiveDataUrl } from '../infra/web-store-links'
import { isAndroidApp } from '../infra/web-ad-mock'
import { getGameTitle } from '../infra/game-title'
import { SceneFadeController, renderSceneFade, sceneFadeStyles } from './scene-fade'
import { clearLocalStoragePreservingProgress } from '../infra/storage-utils'
import { applyInitialDefaultLanguage, markInitialSetupCompleted, shouldShowInitialSetup } from '../infra/initial-setup'
import { standaloneAppHostStyles, standaloneModalStyles } from './styles/standalone-app.styles'
import { applyStageScale } from './styles/stage-layout'
import './menu/standalone-game-menu'
import './panels/guide-overview-panel'
import { renderSettingsModal } from './panels/settings-modal'
import './panels/confirm-dialog-panel'
import './panels/other-games-modal-panel'
import type { OtherGameItem } from './panels/other-games-modal-panel'
import { type RemoveAdsUiConfigRoot, getRemoveAdsUiLanguage, loadRemoveAdsUiConfig } from '../config/remove-ads-ui-config'
import { getAndroidBillingBridge, readRemoveAdsStateFromBridge } from '../infra/android-billing-bridge'
import type { BillingResultPayload, RemoveAdsStatePayload } from '../types/android-bridge'
import './panels/remove-ads-dialog-panel'

// 3in1 カードゲームのスタンドアロン・アプリ殻（メニュー/設定/ガイド/戻る制御）の唯一の実装。
// blackjack / poker / casino-war で 95% 同一だったラッパーをここへ集約し、各ゲームは差分のみを
// 抽象メンバで与える。ゲーム本体の盤面は renderGameScreen() で各サブクラスが描画する。
//
// 注意（互換のため固定）:
//   - storage キー値・効果音アセットは shared 側の単一ソースに従う。
//   - 戻るボタン用の window グローバル名/メソッド名は Android native(MainActivity.kt) が参照するため、
//     サブクラスが backGlobalName / backMethodName で従来値をそのまま指定する。
export abstract class StandaloneCardGameApp extends LitElement {
  // ── 各ゲームが与える差分 ──
  /** 盤面要素のタグ名（戻る制御の querySelector に使う） */
  protected abstract readonly gameTableTag: string
  /** Android native が呼ぶ window グローバル名（例 '__SIMPLE_BJ_APP__'） */
  protected abstract readonly backGlobalName: string
  /** そのグローバルのメソッド名（例 'onAndroidBack' / 'onSystemBack'） */
  protected abstract readonly backMethodName: string
  /** メニューのヒーロー画像 URL */
  protected abstract readonly heroImageSrc: string
  /** 「詳細」ボタンの遷移先 slug（= CSV file_name。例 'blackjack'）。本サイト /{lang}/games-apps/{slug}/ へ。 */
  protected abstract readonly detailSlug: string
  /** ガイド本文（単一文字列）の overview_info キー */
  protected abstract readonly guideContentKey: string
  /** ガイド本文が空のときに連結するフォールバックキー群 */
  /** タイトル文字列の解決（ゲームごとに参照元が異なる） */
  protected abstract resolveTitle(block: AppConfigLanguage | undefined): string
  /** ゲーム盤面の描画（盤面タグ・demo 属性などゲーム固有） */
  protected abstract renderGameScreen(): TemplateResult

  // ── 共通状態 ──
  @property({ type: Boolean, attribute: 'autostart-game' })
  autostartGame = false

  // ハブ(casino-games-hub-app)内に埋め込まれているか。ハブが mount 時に付与する。
  // true: HOME は go-home を上位(ハブ)へ投げてハブへ戻る（ハブ側がフェード）。
  // false(スタンドアロン): HOME はこのアプリ内メニューへフワッと戻る（/games-apps へは戻さない）。
  @property({ type: Boolean })
  embedded = false

  // HOME 復帰のフワッとフェード（手本=kaitensushimaster・全ゲーム統一）
  private readonly sceneFade = new SceneFadeController(this)

  @state()
  protected screen: 'menu' | 'game' | 'settings' | 'guide' = 'menu'

  @state()
  protected effectEnabled = true

  @state()
  protected bgmEnabled = false

  @state()
  protected language: AppLanguage = 'en'

  @state()
  protected appConfig: AppConfigRoot | null = null

  // メニュー設定の「キャッシュクリア」確認ダイアログ
  @state()
  protected isCacheConfirmOpen = false

  // 初回起動時の設定画面(言語選択)。判定は shared/infra/initial-setup 単一ソース。
  // スタンドアロン(!embedded)のときだけ発火（ハブ内子ゲームでは出さない）。
  @state()
  protected isInitialSetupPending = false

  @state()
  protected isInitialSetupNoticeOpen = false

  // 設定のサウンドヘルプ(?)の開閉
  @state()
  protected isSoundHelpOpen = false

  // 「お知らせ・更新」「別のカードゲーム」モーダル（外部遷移せずアプリ内＝離脱防止）。
  @state()
  protected isNewsOpen = false
  @state()
  protected isOtherGamesOpen = false
  // 広告削除（Remove Ads）UI。課金は Flutter の AndroidBilling ブリッジ経由（high-low と同方式）。
  @state()
  protected isRemoveAdsOpen = false
  @state()
  protected removeAdsUiConfig: RemoveAdsUiConfigRoot | null = null
  @state()
  protected removeAdsStatusMessage = ''
  @state()
  protected isAdsRemoved = false
  // ストア（Google Play）から取得した表示価格（ブリッジ getRemoveAdsState 由来）。
  @state()
  protected removeAdsPrice = ''
  // お知らせ本文のライブ版（Android。空ならバンドル config の news_content を表示）。
  @state()
  protected newsLinesLive: string[] = []
  // card-games-list.json（games-list.csv 由来・バンドル）を読み込んだ一覧。
  @state()
  protected cardGames: Array<{
    file_name: string; title: string; google_play_store_url: string
    store_state: string; web_published: boolean
  }> = []

  // START 時のルール説明（チュートリアル）ダイアログ。high-low と同一挙動：
  // 初回は表示、チェックで次回以降は <slug>_rules_hidden に保存して非表示。
  @state()
  protected showRules = false
  @state()
  protected rulesDontShow = false

  // ── BGM（hub / high-low 単体 と同方式: Audio + bgm-setting + 設定変更イベント）──
  // 単体カードゲーム(blackjack/poker/casinowar)はこれまで再生体を持たず「BGM ONでも鳴らない」
  // 不具合があった。3ゲームで同一なのでここ（共有殻）に集約する＝単一ソース。
  // 再生条件は hub と同じく「メニュー/ゲームを問わず ON かつ操作済み・前面・フォーカス時」。
  private bgmAudio: HTMLAudioElement | null = null
  private hasUserInteraction = false
  private windowBlurred = false

  connectedCallback(): void {
    super.connectedCallback()
    // ブラウザタブのタイトルも CSV(file_name=detailSlug)を唯一のソースに（静的 <title> に依存しない）。
    const csvTitle = getGameTitle(this.detailSlug)
    if (csvTitle) document.title = csvTitle
    this.loadSettings()
    void this.loadConfig()
    void this.loadCardGamesList()
    // 課金(Remove Ads): UI 文言を読み込み、既存エンタイトルメント/価格をブリッジから取り込み、Flutter 通知を購読。
    void loadRemoveAdsUiConfig().then(c => { this.removeAdsUiConfig = c })
    this.syncRemoveAdsStateFromBridge()
    window.__onEntitlementsChanged = this.onEntitlementsChanged
    window.__onBillingResult = this.onBillingResult
    this.screen = this.autostartGame ? 'game' : 'menu'
    if (!this.embedded && !this.autostartGame) {
      this.evaluateInitialSetup()
    }
    ;(window as unknown as Record<string, unknown>)[this.backGlobalName] = {
      [this.backMethodName]: () => this.handleSystemBack()
    }
    // メニュー画面の設定/ガイド/ルール モーダルを「ゲーム内設定」と同じ 540 拡大
    // ステージで描画するための係数(--game-scale 等)を設定。これが無いと .modal-shell が
    // 等倍 540px のままになり幅がゲーム内とズレる（唯一の正は standaloneModalStyles）。
    window.addEventListener('resize', this.updateScale)
    window.visualViewport?.addEventListener('resize', this.updateScale)
    // BGM 準備＋購読。
    this.setupBgm()
    window.addEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('blur', this.onWindowBlur)
    window.addEventListener('focus', this.onWindowFocus)
    window.addEventListener('pointerdown', this.onFirstUserInteraction, { passive: true })
    window.addEventListener('keydown', this.onFirstUserInteraction)
    this.updateBgmPlayback()
  }

  firstUpdated(): void {
    this.updateScale()
  }

  protected updated(): void {
    this.updateBgmPlayback()
  }

  // ── BGM（唯一の正は bgm-setting.ts。アセットは 3in1/effects/main_bgm.ogg）──
  private setupBgm(): void {
    // ハブ(3in1)内に埋め込まれているときは BGM をハブ(casino-games-hub-app)が鳴らす。
    // 基底でも鳴らすと二重再生になるため、embedded では再生体を作らない。
    if (this.embedded || this.bgmAudio) return
    this.bgmAudio = new Audio(buildGameAssetUrl('effects/main_bgm.ogg'))
    this.bgmAudio.loop = true
    this.bgmAudio.preload = 'auto'
    this.bgmAudio.volume = loadBgmVolumeSetting() || DEFAULT_BGM_VOLUME
  }

  private teardownBgm(): void {
    if (!this.bgmAudio) return
    this.bgmAudio.pause()
    this.bgmAudio.src = ''
    this.bgmAudio = null
  }

  private updateBgmPlayback(): void {
    if (!this.bgmAudio) return
    this.bgmAudio.volume = loadBgmVolumeSetting() || DEFAULT_BGM_VOLUME
    const shouldPlay = !this.embedded && this.bgmEnabled && this.hasUserInteraction && !document.hidden && !this.windowBlurred
    if (!shouldPlay) {
      this.bgmAudio.pause()
      return
    }
    void this.bgmAudio.play().catch(() => undefined)
  }

  private readonly onBgmSettingChanged = (): void => {
    this.bgmEnabled = loadBgmEnabledSetting()
    this.updateBgmPlayback()
  }

  private readonly onFirstUserInteraction = (): void => {
    if (this.hasUserInteraction) return
    this.hasUserInteraction = true
    this.updateBgmPlayback()
  }

  private readonly onVisibilityChange = (): void => {
    // Android WebView は別アプリから復帰しても window 'focus' が飛ばないことがあり、
    // windowBlurred が true のまま固着して BGM が再開しない。可視化＝フォアグラウンド復帰
    // とみなして blur フラグを解除し、focus イベントの到着に依存しないようにする。
    if (!document.hidden) { this.windowBlurred = false }
    this.updateBgmPlayback()
  }
  private readonly onWindowBlur = (): void => { this.windowBlurred = true; this.updateBgmPlayback() }
  private readonly onWindowFocus = (): void => { this.windowBlurred = false; this.updateBgmPlayback() }

  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  disconnectedCallback(): void {
    delete (window as unknown as Record<string, unknown>)[this.backGlobalName]
    window.removeEventListener('resize', this.updateScale)
    window.visualViewport?.removeEventListener('resize', this.updateScale)
    window.removeEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('blur', this.onWindowBlur)
    window.removeEventListener('focus', this.onWindowFocus)
    window.removeEventListener('pointerdown', this.onFirstUserInteraction)
    window.removeEventListener('keydown', this.onFirstUserInteraction)
    delete window.__onEntitlementsChanged
    delete window.__onBillingResult
    this.teardownBgm()
    super.disconnectedCallback()
  }

  private loadSettings(): void {
    this.effectEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'
    this.bgmEnabled = loadBgmEnabledSetting()
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    if (savedLanguage === 'ja' || savedLanguage === 'zh' || savedLanguage === 'en') {
      this.language = savedLanguage
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      this.appConfig = await loadAppConfig(this.detailSlug)
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
      if (savedLanguage !== 'en' && savedLanguage !== 'ja' && savedLanguage !== 'zh') {
        const defaultLanguage = getDefaultLanguage(this.appConfig)
        this.language = defaultLanguage
        localStorage.setItem(LANGUAGE_KEY, defaultLanguage)
      }
    } catch {
      this.appConfig = null
    }
  }

  protected playSubmit(): void {
    playSubmitSound()
  }

  private setEffectEnabled(enabled: boolean): void {
    const wasEnabled = this.effectEnabled
    this.effectEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
    if (!wasEnabled && enabled) {
      this.playSubmit()
    }
  }

  private setBgmEnabled(enabled: boolean): void {
    this.playSubmit()
    this.bgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
    this.updateBgmPlayback()
  }

  // 盤面(@go-home)からの HOME 要求。盤面の go-home は composed なので、止めないと main.*.ts まで
  // 漏れて /games-apps へ飛んでしまう。ここで stopPropagation して復帰先を一元決定する。
  protected goHome(event?: Event): void {
    event?.stopPropagation()
    this.returnHome()
  }

  // 戻るボタン等からの programmatic な HOME 復帰（イベント無し）。
  protected emitGoHome(): void {
    this.returnHome()
  }

  // HOME 復帰の唯一の判断点。決定音は盤面側が確定OK時に鳴らすため、ここでは鳴らさない（二重防止）。
  //   - ハブ内(embedded): go-home を上位へ投げてハブへ戻す（ハブ側がフェード遷移）。
  //   - スタンドアロン: このアプリ内のメニューへフワッと復帰（外の /games-apps へは戻さない）。
  private returnHome(): void {
    if (this.embedded) {
      this.dispatchEvent(new CustomEvent('go-home', { bubbles: true, composed: true }))
      return
    }
    // ゲーム内設定で変えた言語/効果音/BGM を localStorage から取り込み直してメニューへ
    // （盤面は独自に localStorage を更新するため、再読込しないと英語等に戻って見える）。
    this.sceneFade.run(() => {
      this.loadSettings()
      this.screen = 'menu'
    })
  }

  private handleSystemBack(): boolean {
    if (this.isRemoveAdsOpen) { this.playSubmit(); this.isRemoveAdsOpen = false; return true }
    if (this.isNewsOpen) { this.playSubmit(); this.isNewsOpen = false; return true }
    if (this.isOtherGamesOpen) { this.playSubmit(); this.isOtherGamesOpen = false; return true }
    if (this.showRules) { this.playSubmit(); this.showRules = false; return true }
    if (this.screen === 'settings' || this.screen === 'guide') {
      this.playSubmit()
      this.screen = 'menu'
      return true
    }
    if (this.screen === 'game') {
      return this.handleGameBack()
    }
    return false
  }

  // 既定: 盤面が自前の戻る処理（ダイアログ閉じ等）を持てば優先、無ければホームへ。
  // 盤面の戻る制御を使わないゲーム（例 blackjack）はこれを override する。
  protected handleGameBack(): boolean {
    const table = this.renderRoot.querySelector(this.gameTableTag) as
      | (HTMLElement & { handleSystemBack?: () => boolean })
      | null
    if (table?.handleSystemBack?.()) {
      return true
    }
    this.emitGoHome()
    return true
  }

  // 「お知らせ・更新」: Android はアプリ内モーダル(更新履歴)。WEB は従来どおり詳細ページへ（同一オリジン＝離脱でない）。
  private onNews(): void {
    this.playSubmit()
    if (isAndroidApp()) {
      this.newsLinesLive = []   // 先にバンドル(現在言語)を表示し、ライブが来たら上書き
      this.isNewsOpen = true
      void this.loadNewsLive()
    } else {
      window.location.href = buildDetailUrl(this.detailSlug, this.language)
    }
  }
  private closeNews(): void { this.playSubmit(); this.isNewsOpen = false }

  // お知らせ本文を app-flux.com/en/playing-cards のライブ config から取得（Android のみ・現在言語）。
  // 失敗時は newsLinesLive 空のままバンドル config の news_content を表示する。
  private async loadNewsLive(): Promise<void> {
    if (!isAndroidApp()) return
    try {
      const res = await fetch(buildLiveDataUrl(`web-games/game-assets/configs/${this.detailSlug}_app_config.json`), { cache: 'no-store' })
      if (!res.ok) return
      const cfg = await res.json()
      const news = cfg?.languages?.[this.language]?.overview_info?.news_content
      if (typeof news === 'string' && news.trim()) this.newsLinesLive = splitTextLines(news)
    } catch {
      // ライブ失敗 → バンドルの news を使う
    }
  }

  // 「別のカードゲーム」: アプリ内モーダルで一覧（Android のみメニューに表示）。
  private onOtherGames(): void { this.playSubmit(); this.isOtherGamesOpen = true }
  private closeOtherGames(): void { this.playSubmit(); this.isOtherGamesOpen = false }

  // ── Remove Ads（広告削除・課金）。手本: high-low-standalone-app.ts。文言は config の ads ブロック由来。──
  private get removeAdsUi() { return getRemoveAdsUiLanguage(this.removeAdsUiConfig, this.language) }

  private a(key: string, fb = ''): string {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.language) : undefined
    return getLocalizedString(block?.ads, key) || fb
  }

  private get removeAdsMessages() {
    const fb: Record<AppLanguage, { success: string; failed: string; error: string; already: string; unavailable: string }> = {
      en: { success: 'Thank you for your purchase! Ads have been removed from the app.', failed: 'Purchase failed. Please try again.', error: 'An error occurred during purchase. Please try again.', already: 'Already Purchased', unavailable: 'Purchase is not available right now.' },
      ja: { success: 'ご購入ありがとうございます！アプリから広告が削除されました。', failed: '購入に失敗しました。もう一度お試しください。', error: '購入中にエラーが発生しました。もう一度お試しください。', already: '購入済み', unavailable: '現在購入できません。' },
      zh: { success: '感谢您的购买！应用中的广告已被移除。', failed: '购买失败。请重试。', error: '购买过程中出现错误，请重试。', already: '已购买', unavailable: '当前无法购买。' }
    }
    const f = fb[this.language] ?? fb.en
    return {
      success: this.a('purchase_success_message', f.success),
      failed: this.a('purchase_failed', f.failed),
      error: this.a('purchase_error', f.error),
      already: this.a('already_purchased', f.already),
      unavailable: this.removeAdsUi?.purchase_message || f.unavailable
    }
  }

  // 本文は ads ブロックの benefit（タイトル＋説明）を順に表示。
  private removeAdsLines(): string[] {
    return [
      this.a('remove_ads_benefit_1_title'),
      this.a('remove_ads_benefit_1_desc'),
      this.a('remove_ads_benefit_2_title'),
      this.a('remove_ads_benefit_2_desc')
    ].filter(s => s.trim().length > 0)
  }

  private openRemoveAds = (): void => {
    this.playSubmit()
    // 最新の価格/購入状態をストア（ブリッジ）から取り直してから開く。
    this.syncRemoveAdsStateFromBridge()
    this.removeAdsStatusMessage = ''
    this.showRules = false
    this.screen = 'menu'
    this.isRemoveAdsOpen = true
  }

  private closeRemoveAds = (): void => {
    this.playSubmit()
    this.isRemoveAdsOpen = false
  }

  // ブリッジから現在の課金状態（removeAds / price）を取り込む（アプリ起動・モーダル開閉時）。
  private syncRemoveAdsStateFromBridge(): void {
    const bridge = getAndroidBillingBridge()
    if (!bridge) return
    this.applyRemoveAdsState(readRemoveAdsStateFromBridge())
  }

  private applyRemoveAdsState(payload: Partial<RemoveAdsStatePayload>): void {
    if (typeof payload.price === 'string') {
      this.removeAdsPrice = payload.price
    }
    if (payload.removeAds === true) {
      this.isAdsRemoved = true
      this.isRemoveAdsOpen = false
      // Flutter 側の広告非表示フラグも即時同期（インタースティシャルを止める）。
      const win = window as Window & { AppFluxHost?: { postMessage: (msg: string) => void } }
      win.AppFluxHost?.postMessage(JSON.stringify({ type: 'ads-removed', value: true }))
    }
  }

  // Flutter → 課金状態変化通知（購入/復元の確定で removeAds:true が来る）。
  private readonly onEntitlementsChanged = (payload: Partial<RemoveAdsStatePayload>): void => {
    this.applyRemoveAdsState(payload)
  }

  // Flutter → 購入フロー結果通知（PURCHASED/RESTORED/CANCELED/ERROR）。
  private readonly onBillingResult = (payload: BillingResultPayload): void => {
    const msg = this.removeAdsMessages
    const code = payload?.code ?? ''
    if (code === 'PURCHASED' || code === 'RESTORED') {
      this.removeAdsStatusMessage = msg.success
      this.isAdsRemoved = true
      return
    }
    if (code === 'CANCELED') {
      this.removeAdsStatusMessage = msg.failed
      return
    }
    this.removeAdsStatusMessage = msg.error
  }

  // 購入押下：ブリッジの buyRemoveAds() を呼ぶ。結果は __onBillingResult で受ける。
  private onRemoveAdsPurchase = (): void => {
    const msg = this.removeAdsMessages
    this.playSubmit()
    if (this.isAdsRemoved) {
      this.removeAdsStatusMessage = msg.already
      return
    }
    const bridge = getAndroidBillingBridge()
    if (!bridge?.buyRemoveAds) {
      this.removeAdsStatusMessage = msg.unavailable
      return
    }
    this.removeAdsStatusMessage = ''
    bridge.buyRemoveAds()
  }

  // 価格をラベルに付与（例: "Purchase ¥300"）。未取得なら素のラベル。
  private withRemoveAdsPrice(label: string): string {
    const price = this.removeAdsPrice.trim()
    if (price.length === 0) return label
    return `${label} ${price}`
  }

  // 一覧 JSON（card-games-list.json）を読む。
  //   Android: まず app-flux.com/en/playing-cards のライブを取得（サイト再デプロイで即反映＝再申請不要）。
  //            失敗(オフライン/未デプロイ/CORS無)時のみバンドル(appassets)へフォールバック。
  //   WEB: 同一オリジン(buildGameAssetUrl)のみ（dev/本番サイトそのものが最新）。
  private async loadCardGamesList(): Promise<void> {
    const urls = [
      isAndroidApp() ? buildLiveDataUrl('web-games/game-assets/configs/card-games-list.json') : '',
      buildGameAssetUrl('configs/card-games-list.json'),
    ].filter(Boolean)
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) continue
        const data = (await res.json()) as { games?: typeof this.cardGames }
        if (Array.isArray(data.games)) { this.cardGames = data.games; return }
      } catch {
        // 次(フォールバック)へ。全滅時は一覧空でモーダルは開く（致命的でない）。
      }
    }
  }

  // モーダルに渡す項目：現在のゲームを除外し、サイト公開(web_published)かつ非hidden の全カードゲームを動的に。
  // store_state=button → GOOGLE PLAY / comingsoon → Coming Soon 表示（hidden は出さない）。CSV を増やせば自動で増える。
  protected otherGameItems(): OtherGameItem[] {
    return this.cardGames
      .filter((g) => g.file_name !== this.detailSlug && g.web_published && g.store_state !== 'hidden')
      .map((g) => ({
        title: g.title,
        // feat 画像も Android はライブ(app-flux.com)から。WEB は同一オリジン。
        featImageUrl: isAndroidApp()
          ? buildLiveDataUrl(`site-assets/images/games-apps/${g.file_name}/${g.file_name}-feat.webp`)
          : buildFeatureImageUrl(g.file_name),
        storeUrl: g.store_state === 'button' ? g.google_play_store_url : '',
        comingSoon: g.store_state === 'comingsoon',
      }))
  }

  protected texts() {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.language) : undefined
    const overview = block?.overview_info
    const settings = block?.settings
    const chrome = getSharedChromeText(this.language)

    const customGuideContent = getLocalizedString(overview, this.guideContentKey)
    if (overview && !customGuideContent) {
      throw new Error(`guide_content (${this.guideContentKey}) がありません。build_content.py で生成してください（直書きフォールバック禁止）。`)
    }
    const guideLines = splitTextLines(customGuideContent)

    return {
      // タイトルは CSV(file_name=detailSlug) を唯一のソースに。無ければ config 由来へフォールバック。
      title: getGameTitle(this.detailSlug) ?? this.resolveTitle(block),
      start: chrome.start,
      guide: chrome.guideOverview,
      settings: chrome.settings,
      back: chrome.back,
      news: chrome.news,
      newsUrl: buildDetailUrl(this.detailSlug, this.language),
      // お知らせ・更新モーダル（Android）/ 別のカードゲームモーダル。
      newsTitle: chrome.newsShort,
      newsLines: splitTextLines(getLocalizedString(overview, 'news_content') || ''),
      otherGamesTitle: chrome.otherCardGames,
      playLabel: 'Google Play',
      comingSoonLabel: chrome.comingSoon,
      guideTitle: chrome.guideOverview,
      guideLines: guideLines.filter((line) => line.length > 0),
      settingsTitle: chrome.settings,
      languageLabel: getLocalizedString(settings, 'language') || 'Language',
      effectLabel: getLocalizedString(settings, 'sound_effect') || 'Effect',
      bgmLabel: getLocalizedString(settings, 'bgm') || 'BGM',
      ok: chrome.ok,
      cancel: chrome.cancel,
      initialSetupTitle: chrome.initialSetupTitle,
      initialSetupDoneTitle: chrome.initialSetupDoneTitle,
      initialSetupDoneMessage: chrome.initialSetupDoneMessage,
      clearCache: getLocalizedString(settings, 'clear_cache') || 'Clear Cache',
      clearCacheConfirm: getLocalizedString(settings, 'clear_cache_confirm_message')
        || 'Clear saved data on this device? (Coins and progress are kept.)'
    }
  }

  // 初回起動: 言語未保存なら既定 en で設定画面を自動表示し、言語選択を促す。
  private evaluateInitialSetup(): void {
    if (!shouldShowInitialSetup()) {
      return
    }
    this.language = applyInitialDefaultLanguage()
    this.isInitialSetupPending = true
    this.screen = 'settings'
  }

  // 設定画面を閉じる。初回設定中なら完了処理→完了通知へ。
  private closeSettings(): void {
    this.playSubmit()
    if (this.isInitialSetupPending) {
      this.isInitialSetupPending = false
      this.screen = 'menu'
      markInitialSetupCompleted()
      this.isInitialSetupNoticeOpen = true
      return
    }
    this.screen = 'menu'
  }

  private closeInitialSetupNotice(): void {
    this.playSubmit()
    this.isInitialSetupNoticeOpen = false
  }

  // メニュー設定の「キャッシュクリア」（Memory と同じ：確認 → 進捗/コインは残して clear → 再読込）
  private openClearCacheConfirm(): void {
    this.playSubmit()
    this.isCacheConfirmOpen = true
  }

  private cancelClearCache(): void {
    this.playSubmit()
    this.isCacheConfirmOpen = false
  }

  private confirmClearCache(): void {
    this.playSubmit()
    this.isCacheConfirmOpen = false
    clearLocalStoragePreservingProgress()
    window.location.reload()
  }

  // ── START 時のルール説明（チュートリアル）。high-low と同一挙動 ──────────────
  // 「次回から表示しない」の保存先はゲームごとに分ける（detailSlug = CSV file_name）。
  private get rulesHiddenKey(): string { return `${this.detailSlug}_rules_hidden` }

  // 開始説明は設定 game.quick_start（= base MD の `### [ クイックスタート ] {quick_start_app}` 由来）のみ。
  // 直書きフォールバック禁止：設定ロード済みで未生成ならエラーにする（build_content.py で生成）。
  private get rulesText(): string {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.language) : undefined
    const text = getLocalizedString(block?.game, 'quick_start')
    if (block && !text) {
      throw new Error(`quick_start がありません (${this.detailSlug}/${this.language})。build_content.py で生成してください（直書きフォールバック禁止）。`)
    }
    return text
  }

  private get rulesDontShowLabel(): string {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.language) : undefined
    const fromConfig = getLocalizedString(block?.game, 'rules_dont_show')
    if (fromConfig.length > 0) return fromConfig
    const fb: Record<AppLanguage, string> = {
      en: "Don't show again",
      ja: '次回から表示しない',
      zh: '下次不再显示'
    }
    return fb[this.language] ?? fb.en
  }

  // START 押下：未非表示ならルール説明を表示、非表示設定済みなら即ゲーム開始。
  // START：まずゲーム画面へ切り替え、その上で（未非表示なら）ルール説明を重ねる。
  // ＝元 app-flux の HIGH&LOW と同じく「盤面に変わってから説明」。
  private onStartWithRules(): void {
    this.playSubmit()
    this.screen = 'game'
    this.rulesDontShow = false
    this.showRules = localStorage.getItem(this.rulesHiddenKey) !== 'true'
  }

  // ルール説明 OK：チェックされていれば次回以降非表示にして閉じる（盤面のまま）。
  private confirmRules(): void {
    this.playSubmit()
    if (this.rulesDontShow) localStorage.setItem(this.rulesHiddenKey, 'true')
    this.showRules = false
  }

  // ルール説明（チュートリアル）オーバーレイ。盤面（ゲーム画面）の上に重ねて表示する。
  private renderRulesOverlay(): TemplateResult {
    const ok = getSharedChromeText(this.language).ok
    return html`
      <main class="modal-shell">
        <section class="modal-card rules-card">
          <p class="rules-text">${this.rulesText}</p>
          <button class="rules-ok" @click=${() => this.confirmRules()}>${ok}</button>
          <label class="rules-dont">
            <input
              type="checkbox"
              .checked=${this.rulesDontShow}
              @change=${(e: Event) => { this.rulesDontShow = (e.target as HTMLInputElement).checked }}
            />
            <span>${this.rulesDontShowLabel}</span>
          </label>
        </section>
      </main>
    `
  }

  render() {
    const t = this.texts()
    // Android アプリ時はメニュー項目を WEB と出し分ける（手本: memorymonsters-standalone-app）。
    //   Android: Back 非表示 / Remove Ads・Other Card Games 追加 / News→短縮 /
    //            ストア(Google Play)・YouTube 非表示 / 外部注記・Ver 表示。
    //   WEB(flag=false): 全条件が else=従来値に落ちるのでサイト側は不変。
    const android = isAndroidApp()
    const chrome = getSharedChromeText(this.language)

    const fade = renderSceneFade(this.sceneFade.state)

    if (this.screen === 'game') {
      // 盤面に切り替えてから、その上にルール説明を重ねる（元 app-flux の HIGH&LOW と同挙動）。
      return html`${this.renderGameScreen()}${this.showRules ? this.renderRulesOverlay() : null}${fade}`
    }

    return html`
      <div class="menu-shell">
        <standalone-game-menu
          .title=${t.title}
          .heroImageSrc=${this.heroImageSrc}
          .heroImageAlt=${t.title}
          .startLabel=${t.start}
          .guideLabel=${t.guide}
          .settingsLabel=${t.settings}
          .backLabel=${android ? '' : t.back}
          .extraActionLabel=${android ? chrome.removeAds : ''}
          .storeNotice=${android ? '' : getSharedChromeText(this.language).alsoOnGooglePlay}
          .storeTitle=${android ? '' : t.title}
          .storeUrl=${android ? '' : (this.appConfig?.app_info?.play_store_url ?? '')}
          .storeState=${android ? 'hidden' : (this.appConfig?.app_info?.store_state ?? 'button')}
          .storeBadgeSrc=${android ? '' : CARD_GAMES_HUB_WEB_LINKS.storeBadgeUrl}
          .storeBadgeAlt=${`${t.title} on Google Play`}
          .youtubeUrl=${android ? '' : (this.appConfig?.app_info?.youtube_url ?? '')}
          .youtubeBadgeSrc=${android ? '' : CARD_GAMES_HUB_WEB_LINKS.youtubeBadgeUrl}
          .youtubeBadgeAlt=${`${t.title} on YouTube`}
          .newsLabel=${android ? chrome.newsShort : t.news}
          .newsUrl=${t.newsUrl}
          .otherGamesLabel=${android ? chrome.otherCardGames : ''}
          .otherGamesUrl=${android ? buildOtherCardGamesUrl(this.language) : ''}
          .externalIconSrc=${android ? buildGameAssetUrl('common/images/external_link.svg') : ''}
          .externalNote=${android ? chrome.externalLinkNote : ''}
          .version=${android ? (this.appConfig?.app_info?.version ?? '') : ''}
          @menu-back=${() => this.dispatchEvent(new CustomEvent('menu-back', { bubbles: true, composed: true }))}
          @menu-start=${() => this.onStartWithRules()}
          @menu-guide=${() => {
            this.playSubmit()
            this.screen = 'guide'
          }}
          @menu-settings=${() => {
            this.playSubmit()
            this.screen = 'settings'
          }}
          @menu-extra=${this.openRemoveAds}
          @menu-news=${() => this.onNews()}
          @menu-other-games=${() => this.onOtherGames()}
        ></standalone-game-menu>

        ${this.isRemoveAdsOpen ? html`
          <main class="modal-shell"><section class="modal-card">
            <remove-ads-dialog-panel
              .title=${chrome.removeAds}
              .lines=${this.removeAdsLines()}
              .closeLabel=${this.removeAdsUi?.close_label || 'X'}
              .showPurchase=${true}
              .purchaseLabel=${this.isAdsRemoved
                ? this.removeAdsMessages.already
                : this.withRemoveAdsPrice(this.a('purchase_button') || this.removeAdsUi?.purchase_label || 'Purchase')}
              .cancelLabel=${this.removeAdsUi?.cancel_label || 'Cancel'}
              .showTerms=${true}
              .termsLabel=${this.removeAdsUi?.terms_label || 'Terms'}
              .termsTitle=${this.removeAdsUi?.terms_title || 'Terms of Service'}
              .termsCloseLabel=${this.removeAdsUi?.terms_close_label || 'Close'}
              .termsContent=${this.removeAdsUi?.terms_content || ''}
              .priceLabel=${this.removeAdsPrice}
              .statusLabel=${this.removeAdsStatusMessage}
              .purchased=${this.isAdsRemoved}
              @remove-ads-purchase=${this.onRemoveAdsPurchase}
              @remove-ads-close=${this.closeRemoveAds}
            ></remove-ads-dialog-panel>
          </section></main>` : null}
        ${this.screen === 'guide'
          ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <guide-overview-panel
                    .title=${t.guideTitle}
                    .lines=${t.guideLines}
                    .okLabel=${t.back}
                    @guide-close=${() => {
                      this.playSubmit()
                      this.screen = 'menu'
                    }}
                  ></guide-overview-panel>
                </section>
              </main>
            `
          : null}
        ${this.isNewsOpen
          ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <guide-overview-panel
                    .title=${t.newsTitle}
                    .lines=${this.newsLinesLive.length ? this.newsLinesLive : t.newsLines}
                    .okLabel=${t.back}
                    @guide-close=${() => this.closeNews()}
                  ></guide-overview-panel>
                </section>
              </main>
            `
          : null}
        ${this.isOtherGamesOpen
          ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <other-games-modal-panel
                    .title=${t.otherGamesTitle}
                    .games=${this.otherGameItems()}
                    .playLabel=${t.playLabel}
                    .comingSoonLabel=${t.comingSoonLabel}
                    .okLabel=${t.back}
                    @other-games-close=${() => this.closeOtherGames()}
                  ></other-games-modal-panel>
                </section>
              </main>
            `
          : null}
        ${this.screen === 'settings'
          ? renderSettingsModal({
            language: this.language,
            effectEnabled: this.effectEnabled,
            bgmEnabled: this.bgmEnabled,
            isInitialSetup: this.isInitialSetupPending,
            soundHelpOpen: this.isSoundHelpOpen,
            onClose: () => this.closeSettings(),
            onEffectChange: (enabled) => this.setEffectEnabled(enabled),
            onBgmChange: (enabled) => this.setBgmEnabled(enabled),
            onLanguageChange: (lang) => { this.language = lang; localStorage.setItem(LANGUAGE_KEY, lang) },
            onClearCache: () => this.openClearCacheConfirm(),
            onOpenSoundHelp: () => { this.playSubmit(); this.isSoundHelpOpen = true },
            onCloseSoundHelp: () => { this.playSubmit(); this.isSoundHelpOpen = false }
          })
          : null}
        ${this.isCacheConfirmOpen
          ? html`
              <main class="modal-shell">
                <section class="modal-card">
                  <confirm-dialog-panel
                    .title=${t.clearCache}
                    .message=${t.clearCacheConfirm}
                    .okLabel=${t.ok}
                    .cancelLabel=${t.cancel}
                    @confirm-accept=${() => this.confirmClearCache()}
                    @confirm-cancel=${() => this.cancelClearCache()}
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
                    .okLabel=${t.ok}
                    @guide-close=${() => this.closeInitialSetupNotice()}
                  ></guide-overview-panel>
                </section>
              </main>
            `
          : null}
      </div>
      ${fade}
    `
  }

  static styles = [standaloneAppHostStyles, standaloneModalStyles, sceneFadeStyles, css`
    /* START 時のルール説明（チュートリアル）。high-low と同一の見た目・挙動。 */
    .rules-card { display: grid; gap: 14px; }
    .rules-text {
      margin: 0; white-space: pre-line; text-align: left;
      font-size: 17px; line-height: 1.6; font-weight: 600; color: #eef4f5;
      max-height: 60vh; overflow-y: auto;
    }
    .rules-ok {
      min-height: 64px; border: 0; border-radius: 999px; cursor: pointer;
      background: linear-gradient(180deg, #a06a34, #5e3818); color: #eafff8;
      font-family: inherit; font-size: 20px; font-weight: 800; letter-spacing: .02em;
    }
    .rules-dont {
      display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;
      font-size: 16px; font-weight: 600; color: rgba(238, 244, 245, .85);
    }
    .rules-dont input { width: 22px; height: 22px; accent-color: #a06a34; cursor: pointer; }
  `]
}
