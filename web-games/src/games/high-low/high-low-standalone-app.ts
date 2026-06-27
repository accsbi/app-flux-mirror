// ── 2026-06-27 修正サマリ（詳細＝docs/HIGH-LOW-MIGRATION-MISTAKES.md・各箇所に inline コメント）──
//  ・VER: __APP_VERSION__(pubspec)のみ＝yaml 同期。config.app_info.version へフォールバックしない(§1c)。
//  ・規約: 外部ライブ terms-of-use.json のみ(loadTermsOfUse)。AAB 同梱へフォールバックしない。未取得は「ネット必要」状態表示。
//  ・Remove Ads 閉じ不能の真因: lit テンプレートのタグ内に HTMLコメントを入れて @remove-ads-close を破壊していた→除去。
//  ※根本: 本ファイルは 700+行の独自殻。正しくは old-maid 同様 StandaloneCardGameApp 継承(≈30行)。MISTAKES §0/§9 参照。
import { LitElement, css, html, type PropertyValues } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { AppLanguage } from '../../shared/config/app-config'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import { LANGUAGE_KEY as LANG_KEY, SOUND_ENABLED_KEY as SOUND_KEY } from '../../shared/config/storage-keys'
import { loadHighLowConfig, hlGet, type HLConfig } from './high-low-config'
import {
  BGM_SETTING_CHANGED_EVENT,
  DEFAULT_BGM_COMMON_RELATIVE,
  loadBgmEnabledSetting,
  saveBgmEnabledSetting
} from '../../shared/infra/bgm-setting'
import { buildHighLowAssetUrl, buildHighLowCommonAssetUrl } from './high-low-assets'
import { buildFeatureImageUrl } from '../../shared/infra/game-feature-image'
import { getGameTitle } from '../../shared/infra/game-title'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import { playTrackedEffect, stopAllEffects, clearEffectSuppression } from '../../shared/infra/submit-sound'
import { HIGH_LOW_WEB_LINKS, buildNewsUrl, buildDetailUrl, buildOtherCardGamesUrl, buildAboutUrl, buildLiveDataUrl } from '../../shared/infra/web-store-links'
import { isAndroidApp } from '../../shared/infra/web-ad-mock'
import {
  type RemoveAdsUiConfigRoot,
  getRemoveAdsUiLanguage,
  loadRemoveAdsUiConfig
} from '../../shared/config/remove-ads-ui-config'
import { getAndroidBillingBridge, readRemoveAdsStateFromBridge } from '../../shared/infra/android-billing-bridge'
import type { BillingResultPayload, RemoveAdsStatePayload } from '../../shared/types/android-bridge'
import '../../shared/ui/panels/remove-ads-dialog-panel'
import { standaloneAppHostStyles, standaloneModalStyles } from '../../shared/ui/styles/standalone-app.styles'
import { applyStageScale } from '../../shared/ui/styles/stage-layout'
import { SceneFadeController, renderSceneFade, sceneFadeStyles, SCENE_FADE_MS } from '../../shared/ui/scene-fade'
import './high-low-game-table'
import '../../shared/ui/menu/standalone-game-menu'
import { renderSettingsModal } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'
// お知らせ・別のカードゲームのモーダルは共通部品を再利用（old-maid=standalone-card-game-app と同一）。
import '../../shared/ui/panels/news-info-modal-panel'
import '../../shared/ui/panels/other-games-modal-panel'
import type { OtherGameItem } from '../../shared/ui/panels/other-games-modal-panel'
import { clearLocalStoragePreservingProgress } from '../../shared/infra/storage-utils'
import { applyInitialDefaultLanguage, markInitialSetupCompleted, shouldShowInitialSetup } from '../../shared/infra/initial-setup'

// ルール説明ダイアログ「次回から表示しない」の保存先
const RULES_HIDDEN_KEY = 'highlow_rules_hidden'

// ★BGM音量（high-low 専用）。0.0〜1.0。共通の DEFAULT_BGM_VOLUME(=0.18) とは別に
//   high-low だけ大きめにする。音量を変えたいときは【この値だけ】を編集する
//   （memorymonsters・カードゲームには影響しない）。
const HIGH_LOW_BGM_VOLUME = 0.30

@customElement('high-low-standalone-app')
export class HighLowStandaloneApp extends LitElement {
  @state() private screen: 'menu' | 'game' | 'settings' | 'guide' = 'menu'
  @state() private language: AppLanguage = 'en'
  @state() private effectEnabled = true
  @state() private bgmEnabled = false
  @state() private config: HLConfig = {}
  // START 時のルール説明ダイアログ
  @state() private showRules = false
  @state() private rulesDontShow = false
  // 設定の「キャッシュクリア」確認
  @state() private showCacheConfirm = false
  // 初回起動時の設定画面(言語選択)。判定は shared/infra/initial-setup 単一ソース。
  @state() private isInitialSetupPending = false
  @state() private isInitialSetupNoticeOpen = false
  // 設定のサウンドヘルプ(?)の開閉
  @state() private isSoundHelpOpen = false
  // 広告削除（Remove Ads）UI。課金は Flutter の AndroidBilling ブリッジ経由で実行（memorymonsters と同方式）。
  @state() private isRemoveAdsOpen = false
  @state() private removeAdsUiConfig: RemoveAdsUiConfigRoot | null = null
  @state() private removeAdsStatusMessage = ''
  // 課金状態。price はストア（Google Play）から取得した表示価格（ブリッジ getRemoveAdsState 由来）。
  @state() private isAdsRemoved = false
  @state() private removeAdsPrice = ''
  // お知らせ・更新情報 / 別のカードゲーム のアプリ内モーダル（共通版と同方式）。
  @state() private isNewsOpen = false
  @state() private isOtherGamesOpen = false
  // card-games-list.json（games-list.csv 由来）。別のカードゲーム一覧に使う。
  @state() private cardGames: Array<{
    file_name: string; title: string; google_play_store_url: string
    store_state: string; web_published: boolean
    google_description?: Record<string, string>
  }> = []

  // 規約（terms-of-use.json）＝全アプリ共通の外部ライブ。ローカル(remove_ads_ui の terms_content)固定にしない
  // （AAB 同梱固定だと出荷後に直せない＝ユーザー指摘）。共有 StandaloneCardGameApp.loadTermsOfUse と同一。
  @state() private termsData: Record<string, { title: string; body: string }> | null = null

  // HOME 復帰のフワッとフェード（kaitensushimaster と同じ演出・全ゲーム統一）
  private readonly sceneFade = new SceneFadeController(this)

  // BGM（他ゲーム＝memorymonsters・カード共通基底 standalone-card-game-app と同方式: Audio + bgm-setting + 設定変更イベント）。
  // WEB 方針: BGM はメニュー/ゲームの両画面で鳴らし、メニューに戻っても止めない（他ゲームと同挙動。
  //   以前は screen==='game' のときだけ鳴らしていたため high-low だけメニュー復帰で止まっていた）。
  // ON/OFF は localStorage(BGM_ENABLED_KEY)にキャッシュされ、次回来訪時もトグルで切替可能。
  private bgmAudio: HTMLAudioElement | null = null
  private hasUserInteraction = false
  // タブ/アプリが非表示・ウィンドウがフォーカスを失っている間は BGM を止める。
  // 特にアプリで背面に回っても鳴り続けるのを防ぐ。WEB/アプリ共通の単一仕組み（分岐なし）。
  private windowBlurred = false

  connectedCallback(): void {
    super.connectedCallback()
    { const t = getGameTitle('high-low'); if (t) document.title = t }
    this.syncSettingsFromStorage()
    this.evaluateInitialSetup()
    void loadHighLowConfig().then(c => { this.config = c })
    void loadRemoveAdsUiConfig().then(c => { this.removeAdsUiConfig = c })
    // 「別のカードゲーム」一覧（Android=ライブ→失敗時バンドル / WEB=同一オリジン）。共通版と同方式。
    void this.loadCardGamesList()
    void this.loadTermsOfUse()
    // 課金: 既存エンタイトルメント/価格をブリッジから取り込み、Flutter からの通知を購読。
    this.syncRemoveAdsStateFromBridge()
    window.__onEntitlementsChanged = this.onEntitlementsChanged
    window.__onBillingResult = this.onBillingResult
    // メニューの設定/ガイド モーダルをゲーム内設定と同じ 540 拡大ステージで描画するための係数。
    window.addEventListener('resize', this.updateScale)
    window.visualViewport?.addEventListener('resize', this.updateScale)
    // BGM 準備＋設定変更/初回操作の購読。
    this.setupBgm()
    window.addEventListener(BGM_SETTING_CHANGED_EVENT, this.onBgmSettingChanged as EventListener)
    window.addEventListener('pointerdown', this.onFirstUserInteraction)
    window.addEventListener('keydown', this.onFirstUserInteraction)
    // フォーカス移動/非表示で BGM 停止（WEB=タブ切替・アプリ=背面化 を同じ仕組みで処理）。
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('blur', this.onWindowBlur)
    window.addEventListener('focus', this.onWindowFocus)
    // Android システムバック（戻る）の受け口。native(highandlow_page_mobile.dart)が
    //   window.__HIGHANDLOW_APP__?.onAndroidBack?.() ?? false を呼ぶ。
    //   true=消費（アプリを閉じない）／false=メニュー最上段なので閉じる。
    //   memorymonsters(__MEMORYMONSTERS_APP__)・3in1(__CASINO_HUB_APP__) と同方式に統一。
    ;(window as Window & { __HIGHANDLOW_APP__?: { onAndroidBack: () => boolean } }).__HIGHANDLOW_APP__ = {
      onAndroidBack: () => this.handleSystemBack()
    }
    // BK-1: ブラウザ戻る(popstate)を監視。
    window.addEventListener('popstate', this.onPopState)
    if (this.screen === 'game') this.armHistoryGuard()
  }

  firstUpdated(): void {
    this.updateScale()
  }

  private readonly updateScale = (): void => {
    applyStageScale(this)
  }

  // screen / bgmEnabled が変わるたびに BGM 再生状態を再評価（ゲーム入退室・トグル反映）。
  updated(changed: PropertyValues): void {
    if (changed.has('screen') || changed.has('bgmEnabled')) {
      this.updateBgmPlayback()
    }
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
    delete window.__onEntitlementsChanged
    delete window.__onBillingResult
    delete (window as Window & { __HIGHANDLOW_APP__?: { onAndroidBack: () => boolean } }).__HIGHANDLOW_APP__
    window.removeEventListener('popstate', this.onPopState)
    this.teardownBgm()
    super.disconnectedCallback()
  }

  // Android システムバック（戻る）の単一処理。開いているモーダル/画面を「上から1つだけ」
  // 閉じ、最後はメニュー(start)へ戻す。menu 最上段でだけ false を返して native にアプリ終了を委ねる。
  //   - guide / settings（メニュー階層）→ メニューへ
  //   - game → 盤面(high-low-game-table)の handleSystemBack に委譲（パネル閉じ or スタート戻り確認）
  // これで「ゲーム/ガイド/設定中の戻るで勝手に落ちる」不具合を解消し、3ゲームで挙動を統一する。
  // ── BK-1: ブラウザ「戻る」(popstate) ガード ──────────────────
  // ゲーム中にブラウザ戻ると、Android 戻ると同じ handleSystemBack() を呼び（スタート戻り確認等を
  // 再利用）、確認なしの素通り離脱を防ぐ。
  private historyGuardArmed = false

  private armHistoryGuard(): void {
    if (this.historyGuardArmed) return
    history.pushState({ cardGameBackGuard: true }, '')
    this.historyGuardArmed = true
  }

  private readonly onPopState = (): void => {
    this.historyGuardArmed = false
    const handled = this.handleSystemBack()
    if (handled || this.screen !== 'menu') {
      this.armHistoryGuard()
    }
  }

  private handleSystemBack(): boolean {
    if (this.isInitialSetupNoticeOpen) { this.closeInitialSetupNotice(); return true }
    if (this.showCacheConfirm) { this.playSubmit(); this.showCacheConfirm = false; return true }
    if (this.isSoundHelpOpen) { this.playSubmit(); this.isSoundHelpOpen = false; return true }
    if (this.isRemoveAdsOpen) { this.closeRemoveAds(); return true }
    if (this.isNewsOpen) { this.playSubmit(); this.isNewsOpen = false; return true }
    if (this.isOtherGamesOpen) { this.playSubmit(); this.isOtherGamesOpen = false; return true }
    if (this.showRules) { this.playSubmit(); this.showRules = false; return true }
    if (this.screen === 'settings') { this.closeSettings(); return true }
    if (this.screen === 'guide') { this.playSubmit(); this.screen = 'menu'; return true }
    if (this.screen === 'game') {
      const table = this.renderRoot.querySelector('high-low-game-table') as
        | (HTMLElement & { handleSystemBack?: () => boolean })
        | null
      if (table?.handleSystemBack?.()) { return true }
      // 盤面が未マウント等のフォールバック：メニューへ戻す（落とさない）。
      this.fadeToMenu()
      return true
    }
    return false
  }

  // 「お知らせ・更新情報」: 2ボタン式モーダル（最新版を確認/このアプリについて）。共通版 onNews と同方式。
  private onNews(): void { this.playSubmit(); this.isNewsOpen = true }
  private closeNews(): void { this.playSubmit(); this.isNewsOpen = false }
  // 「別のカードゲーム」: アプリ内モーダルで一覧（Android のみメニューに表示）。共通版 onOtherGames と同方式。
  private onOtherGames(): void { this.playSubmit(); this.isOtherGamesOpen = true }
  private closeOtherGames(): void { this.playSubmit(); this.isOtherGamesOpen = false }

  // 一覧 JSON（card-games-list.json）を読む。Android=ライブ(app-flux-mirror)→失敗時バンドル / WEB=同一オリジン。
  // 共通版 loadCardGamesList と同一ロジック。全滅時は一覧空でモーダルは開く（致命的でない）。
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
        // 次(フォールバック)へ。
      }
    }
  }

  // 規約 JSON（terms-of-use.json）を **外部ライブのみ**取得。
  //   Android = app-flux-mirror（外部・全アプリ共通・再デプロイで即反映）。
  //   WEB     = 同一オリジン(buildGameAssetUrl)＝本番サイトそのもの＝最新。
  // **AAB 同梱(appassets)へはフォールバックしない**（同梱の古いコピーを出すと出荷後に差し替え不能＝禁止）。
  // 取得失敗（機内モード等）時は termsData=null のまま＝規約ボタン自体を出さない（オフラインで購入もできない）。
  private async loadTermsOfUse(): Promise<void> {
    const url = isAndroidApp()
      ? buildLiveDataUrl('web-games/game-assets/configs/terms-of-use.json') // 外部ライブのみ
      : buildGameAssetUrl('configs/terms-of-use.json')                      // WEB=同一オリジン=本番サイト
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as Record<string, { title: string; body: string }>
      if (data && typeof data === 'object') this.termsData = data
    } catch {
      // 外部ライブ取得失敗＝規約は出さない（同梱へフォールバックしない）。
    }
  }

  // 規約は外部ライブ(termsData)が唯一の正。未取得(オフライン)時は「ネット環境が必要」の**状態表示**を出す
  // （＝規約の代替や同梱の古い規約ではない。ユーザー要望の警告。文言は config の共有 chrome 由来）。
  private get termsTitleOrOfflineNotice(): string {
    const t = this.termsData?.[this.language]?.title
    return t && t.trim() ? t : this.chrome.offlineAdTitle       // 'ネットワーク接続が必要です'
  }
  private get termsBodyOrOfflineNotice(): string {
    const b = this.termsData?.[this.language]?.body
    return b && b.trim() ? b : this.chrome.externalLinkNote     // 'インターネット環境が必要です'
  }

  // モーダルに渡す項目：現在のゲーム(high-low)を除外し、web_published かつ非hidden を動的に。共通版 otherGameItems と同一。
  private otherGameItems(): OtherGameItem[] {
    return this.cardGames
      .filter((g) => g.file_name !== 'high-low' && g.web_published && g.store_state !== 'hidden')
      .map((g) => ({
        title: g.title,
        description: g.google_description?.[this.language] ?? g.google_description?.en ?? '',
        featImageUrl: isAndroidApp()
          ? buildLiveDataUrl(`site-assets/images/games-apps/${g.file_name}/${g.file_name}-feat.webp`)
          : buildFeatureImageUrl(g.file_name),
        storeUrl: g.store_state === 'button' ? g.google_play_store_url : '',
        comingSoon: g.store_state === 'comingsoon',
      }))
  }

  // ── BGM（唯一の正は bgm-setting.ts。アセットは共通 common/bgm/ に集約=DEFAULT_BGM_COMMON_RELATIVE）─────────
  private setupBgm(): void {
    if (this.bgmAudio) return
    this.bgmAudio = new Audio(buildHighLowCommonAssetUrl(DEFAULT_BGM_COMMON_RELATIVE))
    this.bgmAudio.loop = true
    this.bgmAudio.preload = 'auto'
    this.bgmAudio.volume = HIGH_LOW_BGM_VOLUME
  }

  private teardownBgm(): void {
    if (!this.bgmAudio) return
    this.bgmAudio.pause()
    this.bgmAudio.src = ''
    this.bgmAudio = null
  }

  private updateBgmPlayback(): void {
    if (!this.bgmAudio) return
    this.bgmAudio.volume = HIGH_LOW_BGM_VOLUME
    // OFF / 初回操作前(ブラウザの自動再生制限) / 非表示・フォーカス喪失中 は鳴らさない。
    // 画面(menu/game)による分岐はしない＝メニューでも鳴らし続ける（他ゲームと統一）。
    if (!this.bgmEnabled || !this.hasUserInteraction || document.hidden || this.windowBlurred) {
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

  // タブ/アプリ非表示・フォーカス移動で BGM を止める／戻る（updateBgmPlayback が条件を再評価）。
  private readonly onVisibilityChange = (): void => {
    // Android WebView は別アプリから復帰しても window 'focus' が飛ばないことがあり、
    // windowBlurred が true のまま固着して BGM が再開しない。可視化＝フォアグラウンド復帰
    // とみなして blur フラグを解除し、focus イベントの到着に依存しないようにする。
    if (!document.hidden) { this.windowBlurred = false }
    this.updateBgmPlayback()
  }
  private readonly onWindowBlur = (): void => { this.windowBlurred = true; this.updateBgmPlayback() }
  private readonly onWindowFocus = (): void => { this.windowBlurred = false; this.updateBgmPlayback() }

  // 共有 UI クローム文言（START / ガイド / 設定 / 戻る）の唯一の正
  private get chrome() { return getSharedChromeText(this.language) }

  private m(key: string, fb = '') { return hlGet(this.config, this.language, 'menu', key, fb) }
  private s(key: string, fb = '') { return hlGet(this.config, this.language, 'settings', key, fb) }
  private o(key: string, fb = '') { return hlGet(this.config, this.language, 'overview_info', key, fb) }
  private g(key: string, fb = '') { return hlGet(this.config, this.language, 'game', key, fb) }
  // VER-1: メニューの VER は Flutter 注入の window.__APP_VERSION__（pubspec の versionName）**のみ**＝yaml と同期。
  // config.app_info.version へフォールバックしない（フォールバック禁止＝§1c）。未注入なら空（＝表面化）。
  private androidAppVersion(): string {
    const injected = (window as Window & { __APP_VERSION__?: string }).__APP_VERSION__
    return (injected ?? '').trim()
  }
  // START 説明は game.quick_start（base MD の `### [ クイックスタート ] {quick_start_app}` 由来）のみ。
  // 直書きフォールバック禁止：未生成ならエラー（このモーダルは設定ロード後にのみ表示される）。
  private get startRulesText(): string {
    const text = this.g('quick_start')
    if (!text) throw new Error(`quick_start がありません (high-low/${this.language})。build_content.py で生成してください（直書きフォールバック禁止）。`)
    return text
  }

  // START 押下：まずゲーム画面（盤面）へ切り替え、その上で（未非表示なら）ルール説明を重ねる。
  private onStart(): void {
    clearEffectSuppression() // BG-3: 直前のホーム戻り抑止が残っていても開始音を鳴らす
    this.playSubmit()
    this.screen = 'game'
    this.rulesDontShow = false
    this.showRules = localStorage.getItem(RULES_HIDDEN_KEY) !== 'true'
    // BK-1: ゲーム突入時にブラウザ戻るガードを張る。
    this.armHistoryGuard()
  }

  // ルール説明 OK：チェックされていれば次回以降非表示にして閉じる（盤面のまま）。
  private confirmRules(): void {
    this.playSubmit()
    if (this.rulesDontShow) localStorage.setItem(RULES_HIDDEN_KEY, 'true')
    this.showRules = false
  }

  // 設定（キャッシュクリア）：Memory と同じ確認 → 進捗/コインを残して clear → 再読込。
  private openClearCacheConfirm(): void { this.playSubmit(); this.showCacheConfirm = true }
  private confirmClearCache(): void {
    this.playSubmit()
    this.showCacheConfirm = false
    clearLocalStoragePreservingProgress()
    window.location.reload()
  }

  // 初回起動: 言語未保存なら既定 en で設定画面を自動表示し、言語選択を促す。
  private evaluateInitialSetup(): void {
    if (!shouldShowInitialSetup()) {
      return
    }
    this.language = applyInitialDefaultLanguage()
    this.isInitialSetupPending = true
    this.screen = 'settings'
    this.showRules = false
    this.showCacheConfirm = false
    this.isRemoveAdsOpen = false
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

  // ゲーム内設定で変えた言語/効果音/BGM を localStorage から取り込み直す（メニュー復帰時に呼ぶ）。
  private syncSettingsFromStorage(): void {
    this.effectEnabled = localStorage.getItem(SOUND_KEY) !== 'false'
    this.bgmEnabled = loadBgmEnabledSetting()
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ja' || saved === 'zh' || saved === 'en') this.language = saved
  }

  // High & Low は専用アセット(buildHighLowAssetUrl)の submit.mp3 を使うため URL は別だが、
  // 再生/追跡/一括停止は共有 submit-sound に集約（ホーム戻り時 stopAllEffects で止まる）。
  private playSubmit(): void {
    playTrackedEffect(buildHighLowAssetUrl('effects/submit.mp3'))
  }

  // ゲーム→メニューのフェード。開始時に再生中の効果音を止める（戻りアニメ中に残さない）。
  private fadeToMenu(): void {
    // BG-3: 再生中 SFX を停止＋フェード中(out+in≈2×)の鳴り込みも抑止。
    stopAllEffects(SCENE_FADE_MS * 2)
    this.sceneFade.run(() => { this.syncSettingsFromStorage(); this.screen = 'menu' })
  }

  private setEffect(enabled: boolean): void {
    const was = this.effectEnabled
    this.effectEnabled = enabled
    localStorage.setItem(SOUND_KEY, String(enabled))
    if (!was && enabled) this.playSubmit()
  }

  private setBgm(enabled: boolean): void {
    this.playSubmit()
    this.bgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
  }

  private setLanguage(lang: AppLanguage): void {
    // 言語プルダウンの選択では音を鳴らさない（select の change/input 二重発火で
    // 二重に鳴るのを防ぐ）。OK 等メニューの他の音は維持。
    this.language = lang
    localStorage.setItem(LANG_KEY, lang)
  }

  private guideLines(): string[] {
    const guide = this.o('guide_content')
    if (!guide) throw new Error('guide_content がありません。build_content.py で生成してください（直書きフォールバック禁止）。')
    return guide.split('\n')
  }

  // ── Remove Ads（広告削除）UI + 課金 ─────────────────────────────
  // 課金は Flutter の window.AndroidBilling ブリッジ経由（memorymonsters-standalone-app.ts と同方式）。
  // 価格は getRemoveAdsState() でストア（Google Play）から取得した値を表示。購入は buyRemoveAds()。
  // 購入/復元の結果は Flutter → window.__onBillingResult / __onEntitlementsChanged で通知される。
  private get removeAdsUi() { return getRemoveAdsUiLanguage(this.removeAdsUiConfig, this.language) }

  // 広告削除文言は config の ads ブロック由来（3in1 ハブと同じ仕組み・playingcardshub に統一）。
  private a(key: string, fb = ''): string { return hlGet(this.config, this.language, 'ads', key, fb) }

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

  // 本文は ads ブロックの benefit（タイトル＋説明）を順に表示（3in1 と同じ並び・同じ文体）。
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
    this.showCacheConfirm = false
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
    if (price.length === 0) {
      return label
    }
    return `${label} ${price}`
  }

  render() {
    if (this.screen === 'game') {
      // 決定音は high-low-game-table 側（emitHome）が鳴らすため、ここでは鳴らさない（二重防止）。
      return html`
        <div class="app-shell">
          <high-low-game-table
            .language=${this.language}
            .config=${this.config}
            @go-home=${() => this.fadeToMenu()}
          ></high-low-game-table>
        </div>
        ${this.showRules ? html`
          <main class="modal-shell"><section class="modal-card rules-card">
            <p class="rules-text">${this.startRulesText}</p>
            <button class="rules-ok" @click=${() => this.confirmRules()}>${this.g('rules_ok', 'OK')}</button>
            <label class="rules-dont">
              <input type="checkbox" .checked=${this.rulesDontShow}
                @change=${(e: Event) => { this.rulesDontShow = (e.target as HTMLInputElement).checked }}>
              <span>${this.g('rules_dont_show', '次回から表示しない')}</span>
            </label>
          </section></main>` : null}
        ${renderSceneFade(this.sceneFade.state)}`
    }

    return html`
      <div class="menu-shell">
        <standalone-game-menu
          .title=${(getGameTitle('high-low') ?? this.m('title', 'Classic Simple High & Low'))}
          .backgroundImageSrc=${buildGameAssetUrl('images/background.webp')}
          .heroImageSrc=${buildFeatureImageUrl('high-low')}
          .heroImageAlt=${(getGameTitle('high-low') ?? this.m('title', 'Classic Simple High & Low'))}
          .startLabel=${this.chrome.start}
          .guideLabel=${this.chrome.guideOverview}
          .settingsLabel=${this.chrome.settings}
          .backLabel=${isAndroidApp() ? '' : this.chrome.back}
          .storeNotice=${isAndroidApp() ? '' : this.chrome.alsoOnGooglePlay}
          .storeTitle=${isAndroidApp() ? '' : (getGameTitle('high-low') ?? HIGH_LOW_WEB_LINKS.title)}
          .storeUrl=${isAndroidApp() ? '' : (this.config?.app_info?.play_store_url ?? '')}
          .storeState=${isAndroidApp() ? 'hidden' : (this.config?.app_info?.store_state ?? 'button')}
          .storeBadgeSrc=${isAndroidApp() ? '' : HIGH_LOW_WEB_LINKS.storeBadgeUrl}
          .storeBadgeAlt=${HIGH_LOW_WEB_LINKS.storeBadgeAlt}
          .youtubeUrl=${isAndroidApp() ? '' : (this.config?.app_info?.youtube_url ?? '')}
          .youtubeBadgeSrc=${isAndroidApp() ? '' : HIGH_LOW_WEB_LINKS.youtubeBadgeUrl}
          .youtubeBadgeAlt=${HIGH_LOW_WEB_LINKS.youtubeBadgeAlt}
          .newsLabel=${isAndroidApp() ? this.chrome.newsShort : this.chrome.news}
          .newsUrl=${buildDetailUrl('high-low', this.language)}
          .version=${isAndroidApp() ? this.androidAppVersion() : ''}
          .extraActionLabel=${isAndroidApp() ? this.chrome.removeAds : ''}
          .otherGamesLabel=${isAndroidApp() ? this.chrome.otherCardGames : ''}
          .otherGamesUrl=${isAndroidApp() ? buildOtherCardGamesUrl(this.language) : ''}
          .externalIconSrc=${isAndroidApp() ? buildGameAssetUrl('common/images/external_link.svg') : ''}
          .externalNote=${isAndroidApp() ? this.chrome.externalLinkNote : ''}
          @menu-back=${() => this.dispatchEvent(new CustomEvent('menu-back', { bubbles: true, composed: true }))}
          @menu-start=${() => this.onStart()}
          @menu-guide=${() => { this.playSubmit(); this.screen = 'guide' }}
          @menu-settings=${() => { this.playSubmit(); this.screen = 'settings' }}
          @menu-extra=${this.openRemoveAds}
          @menu-news=${() => this.onNews()}
          @menu-other-games=${() => this.onOtherGames()}
        ></standalone-game-menu>

        ${this.isRemoveAdsOpen ? html`
          <main class="modal-shell"><section class="modal-card">
            <remove-ads-dialog-panel
              .title=${this.chrome.removeAds}
              .lines=${this.removeAdsLines()}
              .closeLabel=${this.removeAdsUi?.close_label || 'X'}
              .showPurchase=${true}
              .purchaseLabel=${this.isAdsRemoved
                ? this.removeAdsMessages.already
                : this.withRemoveAdsPrice(this.a('purchase_button') || this.removeAdsUi?.purchase_label || 'Purchase')}
              .cancelLabel=${this.removeAdsUi?.cancel_label || 'Cancel'}
              .showTerms=${true}
              .termsLabel=${this.removeAdsUi?.terms_label || 'Terms'}
              .termsTitle=${this.termsTitleOrOfflineNotice}
              .termsCloseLabel=${this.removeAdsUi?.terms_close_label || 'Close'}
              .termsContent=${this.termsBodyOrOfflineNotice}
              .priceLabel=${this.removeAdsPrice}
              .statusLabel=${this.removeAdsStatusMessage}
              .purchased=${this.isAdsRemoved}
              @remove-ads-purchase=${this.onRemoveAdsPurchase}
              @remove-ads-close=${this.closeRemoveAds}
            ></remove-ads-dialog-panel>
          </section></main>` : null}

        ${this.isNewsOpen ? html`
          <main class="modal-shell"><section class="modal-card">
            <news-info-modal-panel
              .title=${this.chrome.newsModalTitle}
              .checkLatestLabel=${this.chrome.checkLatest}
              .aboutLabel=${this.chrome.aboutThisApp}
              .backLabel=${this.chrome.back}
              .storeUrl=${this.config?.app_info?.play_store_url ?? ''}
              .aboutUrl=${buildAboutUrl('high-low', this.language)}
              @news-info-close=${() => this.closeNews()}
            ></news-info-modal-panel>
          </section></main>` : null}

        ${this.isOtherGamesOpen ? html`
          <main class="modal-shell"><section class="modal-card">
            <other-games-modal-panel
              .title=${this.chrome.otherCardGames}
              .games=${this.otherGameItems()}
              .playLabel=${'Google Play'}
              .comingSoonLabel=${this.chrome.comingSoon}
              .okLabel=${this.chrome.back}
              @other-games-close=${() => this.closeOtherGames()}
            ></other-games-modal-panel>
          </section></main>` : null}

        ${this.screen === 'guide' ? html`
          <main class="modal-shell"><section class="modal-card">
            <guide-overview-panel
              .title=${this.chrome.guideOverview}
              .lines=${this.guideLines()}
              .okLabel=${this.m('back', 'Back')}
              @guide-close=${() => { this.playSubmit(); this.screen = 'menu' }}
            ></guide-overview-panel>
          </section></main>` : null}

        ${this.screen === 'settings'
          ? renderSettingsModal({
            language: this.language,
            effectEnabled: this.effectEnabled,
            bgmEnabled: this.bgmEnabled,
            isInitialSetup: this.isInitialSetupPending,
            soundHelpOpen: this.isSoundHelpOpen,
            onClose: () => this.closeSettings(),
            onEffectChange: (enabled) => this.setEffect(enabled),
            onBgmChange: (enabled) => this.setBgm(enabled),
            onLanguageChange: (lang) => this.setLanguage(lang),
            onClearCache: () => this.openClearCacheConfirm(),
            onOpenSoundHelp: () => { this.playSubmit(); this.isSoundHelpOpen = true },
            onCloseSoundHelp: () => { this.playSubmit(); this.isSoundHelpOpen = false }
          })
          : null}

        ${this.showCacheConfirm ? html`
          <main class="modal-shell"><section class="modal-card">
            <confirm-dialog-panel
              .title=${this.s('clear_cache', 'Clear Cache')}
              .message=${this.s('clear_cache_confirm_message', 'Clear saved data on this device? (Coins and progress are kept.)')}
              .okLabel=${this.chrome.ok}
              .cancelLabel=${this.chrome.cancel}
              @confirm-accept=${() => this.confirmClearCache()}
              @confirm-cancel=${() => { this.playSubmit(); this.showCacheConfirm = false }}
            ></confirm-dialog-panel>
          </section></main>` : null}

        ${this.isInitialSetupNoticeOpen ? html`
          <main class="modal-shell"><section class="modal-card">
            <guide-overview-panel
              .title=${this.chrome.initialSetupDoneTitle}
              .lines=${[this.chrome.initialSetupDoneMessage]}
              .okLabel=${this.chrome.ok}
              @guide-close=${() => this.closeInitialSetupNotice()}
            ></guide-overview-panel>
          </section></main>` : null}
      </div>
      ${renderSceneFade(this.sceneFade.state)}`
  }

  // 問い合わせ（お問い合わせ）は一時的に無効化中。
  // 再開する場合は、上の <standalone-game-menu> に
  //   .extraActionLabel=${this.m('contact', 'お問い合わせ')}
  //   @menu-extra=${() => this.openContact()}
  // を戻し、main.high-low.ts の contact-form.js 読み込みも復活させること。
  // private openContact(): void {
  //   this.playSubmit()
  //   const w = window as unknown as { AppFluxContact?: { open: (app: string) => void } }
  //   w.AppFluxContact?.open('high-low')
  // }

  static styles = [standaloneAppHostStyles, standaloneModalStyles, sceneFadeStyles, css`
    .rules-card { display:grid; gap:14px; }
    .rules-text {
      margin:0; white-space:pre-line; text-align:left;
      font-size:17px; line-height:1.6; font-weight:600; color:#eef4f5;
      max-height:60vh; overflow-y:auto;
    }
    .rules-ok {
      min-height:64px; border:0; border-radius:999px; cursor:pointer;
      background:linear-gradient(180deg,#a06a34,#5e3818); color:#eafff8;
      font-family:inherit; font-size:20px; font-weight:800; letter-spacing:.02em;
    }
    .rules-dont {
      display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer;
      font-size:16px; font-weight:600; color:rgba(238,244,245,.85);
    }
    .rules-dont input { width:22px; height:22px; accent-color:#a06a34; cursor:pointer; }
  `]
}
