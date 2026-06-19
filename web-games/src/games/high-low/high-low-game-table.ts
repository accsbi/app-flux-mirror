import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { AppLanguage } from '../../shared/config/app-config'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import type { HLConfig } from './high-low-config'
import { hlGet } from './high-low-config'
import { buildHighLowAssetUrl, buildHighLowCommonAssetUrl } from './high-low-assets'
import { loadBgmEnabledSetting, saveBgmEnabledSetting } from '../../shared/infra/bgm-setting'
import { ensurePlayableSharedCoin, saveSharedCoin } from '../../shared/infra/shared-coin-store'
import { isAndroidApp, countGameForAd, WEB_AD_COUNT_KEY, notifyNativeGameEnd } from '../../shared/infra/web-ad-mock'
import '../../shared/ui/panels/ad-mock-dialog'
import {
  CARDS_PER_PLAYER,
  CPU_THINK_MS,
  CARD_OPEN_DELAY_MS,
  OPEN_HOLD_MS,
  createInitialState,
  cpuChooseDeclaration,
  judge
} from './high-low-logic'
import type { Card, Declaration, GameState, Player } from './high-low-types'
import { sharedGameHostStyles, sharedGameStageStyles } from '../../shared/ui/styles/shared-game-layout-styles'
import { sharedBetStatusStyles, sharedOverlayStyles } from '../../shared/ui/styles/shared-game-ui-styles'
import { applyStageScale } from '../../shared/ui/styles/stage-layout'
import { utilities } from '../../shared/ui/styles/utilities'
import { coinIcon } from '../../shared/ui/icons/coin-icon'
import '../../shared/ui/chrome/game-top-header'
import '../../shared/ui/chrome/game-footer-bar'
import '../../shared/ui/chrome/game-feedback'
import type { GameFeedback } from '../../shared/ui/chrome/game-feedback'
import { renderSettingsPanel } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'

import { LANGUAGE_KEY as LANG_KEY, SOUND_ENABLED_KEY as SOUND_KEY } from '../../shared/config/storage-keys'

const cardUrl = (c: Card) => buildHighLowCommonAssetUrl(`cards/${c.suit}_${c.rank}.png`)
const backUrl = () => buildHighLowCommonAssetUrl('cards/back_card.png')
const bgUrl = () => buildHighLowCommonAssetUrl('images/background.webp')

// 広告の出し方（基点はどちらも「Next Turn PLAYER」タップ時）:
//   ・WEB ブラウザのみ … 全カードゲーム共通カウンタ(WEB_AD_COUNT_KEY)に加算し、7 ごとにモック表示。ネット確認なし。
//   ・Android … PLAYER 攻撃ターンごとに notifyNativeGameEnd() で native へ通知するだけ。
//               7回カウント・課金・ネット確認・実広告表示は全て native（Web コピーで上書きされない）。

@customElement('high-low-game-table')
export class HighLowGameTable extends LitElement {
  @state() language: AppLanguage = 'en'
  @state() config: HLConfig = {}
  @state() private activePanel: 'settings' | 'guide' | null = null
  @state() private effectEnabled = true
  @state() private bgmEnabled = false
  @state() private coin = 100              // カードゲーム共通コイン
  @state() private confirmHome = false     // ホーム戻り確認
  @state() private opened = false          // open フェーズで攻めカードを公開済みか
  @state() private adMockOpen = false      // WEB の広告モックダイアログ
  // オフライン時(Androidのみ)の広告ブロック警告。ネイティブが「広告タイミング(7回目)＋オフライン」を
  // 判定して window.__onOfflineAdBlocked() を呼んだ時だけ true。文言はアプリ内言語で localized。
  @state() private isOfflineAdWarningOpen = false
  @state() private soundHelpOpen = false   // 設定内「?」サウンドヘルプ
  private adMockCount = 0
  private adPendingDeal = false            // 広告モックを閉じたら次ラウンドを配る

  // ゲーム状態（深いオブジェクトなので変更後は requestUpdate で再描画）
  private G: GameState = createInitialState()
  private timers: ReturnType<typeof setTimeout>[] = []

  // 共有 UI クローム文言（ホーム/設定/ガイド・ホーム確認ダイアログ）の唯一の正
  private get chrome() { return getSharedChromeText(this.language) }

  private m(k: string, fb = '') { return hlGet(this.config, this.language, 'menu', k, fb) }
  private o(k: string, fb = '') { return hlGet(this.config, this.language, 'overview_info', k, fb) }

  connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('resize', this.onResize)
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ja' || saved === 'zh' || saved === 'en') this.language = saved
    this.effectEnabled = localStorage.getItem(SOUND_KEY) !== 'false'
    this.bgmEnabled = loadBgmEnabledSetting()
    // ネイティブ(Flutter)が広告タイミングでオフラインを検知したら呼ぶ。アプリ内言語で警告を出す。
    ;(window as Window & { __onOfflineAdBlocked?: () => void }).__onOfflineAdBlocked = this.onOfflineAdBlocked
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.onResize)
    this.clearTimers()
    const w = window as Window & { __onOfflineAdBlocked?: () => void }
    if (w.__onOfflineAdBlocked === this.onOfflineAdBlocked) delete w.__onOfflineAdBlocked
    super.disconnectedCallback()
  }

  // オフライン広告ブロック警告を出す（ネイティブから呼ばれる）。
  private readonly onOfflineAdBlocked = (): void => { this.isOfflineAdWarningOpen = true }

  firstUpdated(): void {
    this.onResize()
    this.startGame() // メニューの START で本ゲームに入った直後から開始
  }

  private readonly onResize = () => applyStageScale(this)
  private clearTimers() { this.timers.forEach((t) => clearTimeout(t)); this.timers = [] }

  private playEffect(name: string) {
    if (!this.effectEnabled) return
    const a = new Audio(buildHighLowAssetUrl(`effects/${name}.mp3`))
    a.currentTime = 0
    void a.play().catch(() => undefined)
  }
  private sound() { this.playEffect('submit') }

  // ── プレイヤー役 ──────────────────────────────────────────
  private defendPlayer(): Player { return Object.values(this.G.players).find((p) => p.role === 'defend')! }
  private attackPlayer(): Player { return Object.values(this.G.players).find((p) => p.role === 'attack')! }

  // ── ゲームフロー（app.js 準拠）──────────────────────────
  private startGame() { this.coin = ensurePlayableSharedCoin(); this.G = createInitialState(); this.dealTurn() }

  private dealTurn() {
    const def = this.defendPlayer(), att = this.attackPlayer()
    if (def.deck.length === 0 || att.deck.length === 0) { this.endGame(); return }
    this.G.defendCard = def.deck.pop()!
    this.G.attackCard = att.deck.pop()!
    this.G.declaration = null
    this.G.result = null
    this.G.phase = 'declare'
    this.G.round++
    this.G.busy = false
    this.requestUpdate()
    if (att.id === 'p2') {
      this.G.busy = true
      this.timers.push(setTimeout(() => this.cpuDeclare(), CPU_THINK_MS))
    }
  }

  private cpuDeclare() { this.declare(cpuChooseDeclaration(this.G.defendCard!.value)) }

  private playerDeclare(decl: Declaration) {
    if (this.G.busy || this.G.phase !== 'declare') return
    this.G.busy = true
    this.sound()
    this.declare(decl)
  }

  private declare(decl: Declaration) {
    this.G.declaration = decl
    this.G.result = judge(this.G.defendCard!, this.G.attackCard!, decl)
    this.G.phase = 'open'
    this.opened = false
    this.requestUpdate()
    // CARD_OPEN_DELAY_MS 待ってから、音と一緒に攻めカードを開く
    this.timers.push(setTimeout(() => {
      this.opened = true
      this.playEffect('card_open')
      this.requestUpdate()
      // OPEN_HOLD_MS の間、開いたカードを見せたまま保持してから 当たり/ミスの音 + コイン変動 + 結果へ
      this.timers.push(setTimeout(() => this.resolveTurn(), OPEN_HOLD_MS))
    }, CARD_OPEN_DELAY_MS))
  }

  private resolveTurn() {
    // コイン変動は PLAYER が Attack の番のみ。CPU が Attack の番（CPU BINGO 等）は一切変動させない。
    const playerIsAttacker = this.attackPlayer().id === 'p1'
    let delta = 0
    if (this.G.result === 'win') { if (playerIsAttacker) delta = 10; this.playEffect('bingo') }   // 当たり: PLAYER攻撃時のみ +10
    else if (this.G.result === 'tie') { delta = 0 }                                                // 引き分け(同値): 変動なし・無音
    else { if (playerIsAttacker) delta = -10; this.playEffect('miss') }                            // ミス: PLAYER攻撃時のみ -10
    this.coin = saveSharedCoin(this.coin + delta)
    this.applyTurnResult()
    this.G.phase = 'result'
    this.G.busy = false
    this.requestUpdate()
  }

  private applyTurnResult() {
    const att = this.attackPlayer()
    const cards = [this.G.defendCard!, this.G.attackCard!]
    if (this.G.result === 'win') att.acquired.push(...cards)
    else this.G.discard.push(...cards)
  }

  private nextTurn() {
    if (this.G.busy) return
    this.playEffect('card_open')
    this.opened = false
    this.G.players.p1.role = this.G.players.p1.role === 'attack' ? 'defend' : 'attack'
    this.G.players.p2.role = this.G.players.p2.role === 'attack' ? 'defend' : 'attack'
    this.G.defendCard = this.G.attackCard = null
    this.G.declaration = this.G.result = null
    const { p1, p2 } = this.G.players
    if (p1.deck.length === 0 && p2.deck.length === 0) { this.endGame(); return }
    // 広告カウントは「PLAYER(p1)が攻撃する番に入る時(=Next Turn PLAYER)」だけ行う。
    // CPU が攻撃する番(CPU BINGO 等)では一切加算しない。両ターンで加算すると、
    // CPU の番のタイミングで広告(モック/実広告)が割り込む不具合になるため。
    const playerWillAttack = p1.role === 'attack'
    if (!playerWillAttack) {
      this.dealTurn()
      return
    }
    if (isAndroidApp()) {
      // Android: PLAYER 攻撃ターン(=1カウント単位)を native へ通知するだけ。
      // 7回カウント/課金/ネット/実広告表示は全て native（Web コピーで上書きされない）。
      notifyNativeGameEnd()
      this.dealTurn()
    } else {
      // WEB ブラウザのみ: 共通カウンタ(card_games_web_ad_count)を +1 し、7 ごとにモック表示。ネット確認なし。
      const { count, show } = countGameForAd(WEB_AD_COUNT_KEY)
      if (show) {
        this.adMockCount = count
        this.adPendingDeal = true
        this.adMockOpen = true
      } else {
        this.dealTurn()
      }
    }
  }

  private endGame() {
    this.G.phase = 'gameover'
    // 最終的に PLAYER 勝利なら勝利音 + WIN BONUS +100（1ゲーム勝利時のコイン加算）
    if (this.G.players.p1.acquired.length > this.G.players.p2.acquired.length) {
      this.playEffect('win')
      this.coin = saveSharedCoin(this.coin + 100)
    }
    this.requestUpdate()
  }
  private restartGame() { this.sound(); this.clearTimers(); this.startGame() }

  private setEffect(v: boolean) { this.effectEnabled = v; localStorage.setItem(SOUND_KEY, String(v)); if (v) this.sound() }
  private setBgm(v: boolean) { this.bgmEnabled = v; saveBgmEnabledSetting(v) }
  // 言語プルダウン選択は無音（select の change/input 二重発火対策）。OK 等の音は維持。
  private setLanguage(lang: AppLanguage) { this.language = lang; localStorage.setItem(LANG_KEY, lang) }
  private onFooterFeedback() { this.sound(); this.renderRoot.querySelector<GameFeedback>('game-feedback')?.open() }
  private emitHome() { this.sound(); this.dispatchEvent(new CustomEvent('go-home', { bubbles: true, composed: true })) }

  // Android システムバック（戻る）の盤面側ハンドラ。全カードゲーム共通方針：
  //   開いているパネル/ダイアログを「上から1つだけ」閉じ、何も開いていなければ
  //   「スタートに戻る」確認ダイアログ(confirmHome)を出す（HOMEボタンと同じ挙動）。
  //   常に true を返す＝ゲーム中は決してアプリを閉じない（落ちない）。
  // standalone 殻(high-low-standalone-app)が screen==='game' のときに呼ぶ。
  handleSystemBack(): boolean {
    if (this.adMockOpen) { this.adMockOpen = false; return true }
    if (this.isOfflineAdWarningOpen) { this.isOfflineAdWarningOpen = false; return true }
    if (this.confirmHome) { this.sound(); this.confirmHome = false; return true }
    if (this.activePanel === 'settings' && this.soundHelpOpen) { this.sound(); this.soundHelpOpen = false; return true }
    if (this.activePanel) { this.sound(); this.activePanel = null; return true }
    this.sound(); this.confirmHome = true; return true
  }

  // ── 小パーツ ────────────────────────────────────────────
  private renderDeckStack(shown: number) {
    if (shown <= 0) return html`<div class="pile-empty"></div>`
    if (shown === 1) return html`<img src=${backUrl()} alt="" class="pile-back pile-back-0">`
    return html`
      <img src=${backUrl()} alt="" class="pile-back pile-back-1">
      <img src=${backUrl()} alt="" class="pile-back pile-back-0">`
  }

  private renderAcquiredStack(acquired: Card[]) {
    if (acquired.length === 0) return null
    const MAX_FAN = 10, OFFSET = 10
    const show = acquired.slice(-MAX_FAN)
    const n = show.length
    // 獲得した札は実際には伏せて積まれる＝常に裏向き（最後の1枚も表にしない）。P1/CPU 共通。
    return show.map((_, i) => {
      const top = (n - 1 - i) * OFFSET
      return html`<img src=${backUrl()} alt="" class="acquired-card" style=${`top:${top}px;left:0;z-index:${i + 1}`}>`
    })
  }

  /** カードスロット（裏bg + 表fg の重ね）。phase に応じて表/裏。 */
  private renderCardSlot(player: Player) {
    const phase = this.G.phase
    const hasDeck = player.deck.length >= 1
    // PLAYER(p1) は下段にラベルがあるため、表向きに開くカード(card-fg)を上側に重ねて
    // 上段 CPU と上下対称にする（CPU=表が下／PLAYER=表が上）。
    const flipV = player.id === 'p1' ? ' flip-v' : ''
    // declare / open / result の間は両者のカードを見せ続ける。
    // result でも開いた攻めカードを伏せ戻さない（結果(BINGO/MISS)と一緒に見せたまま、
    // Next Turn を押すまで残す）。
    let src = backUrl(), flip = ''
    if (phase === 'declare' || phase === 'open' || phase === 'result') {
      if (player.role === 'defend' && this.G.defendCard) {
        src = cardUrl(this.G.defendCard)
      } else if (player.role === 'attack' && this.G.attackCard && (this.opened || phase === 'result')) {
        src = cardUrl(this.G.attackCard); flip = phase === 'open' ? ' flip-in' : ''
      }
    }
    const bg = hasDeck ? html`<img src=${backUrl()} alt="" class="simple-card card-bg">` : null
    return html`<div class="card-stack-wrap${hasDeck ? '' : ' one'}${flipV}">${bg}<img src=${src} alt="" class="simple-card card-fg${flip}"></div>`
  }

  private renderChip(player: Player) {
    const active = this.G.phase === 'declare' && player.role === 'attack'
    const roleTxt = player.role === 'defend' ? 'Defend' : 'Attack'
    const cls = player.id === 'p1' ? 'badge-p1' : 'badge-p2'
    const act = active ? (player.id === 'p1' ? ' p1-active' : ' cpu-active') : ''
    return html`<span class="combined-chip ${cls}${act}">${player.name} ${roleTxt}</span>`
  }

  // ── メイン盤面（declare / open / result）─────────────────
  private renderBoard() {
    const { phase, players } = this.G
    const p1 = players.p1, p2 = players.p2
    const att = this.attackPlayer()
    const p1IsAttack = p1.role === 'attack'
    const isDeclare = phase === 'declare'
    const p2DeckShown = Math.max(0, p2.deck.length - 1)
    const p1DeckShown = Math.max(0, p1.deck.length - 1)
    const attName = att.name
    const nextAttName = att.id === 'p1' ? this.G.players.p2.name : this.G.players.p1.name

    return html`<div class="game-board">
      <div class="chip-row">${this.renderChip(p2)}</div>

      <!-- 上段 P2(CPU): [獲得] [カード] [デッキ] -->
      <div class="card-row">
        <div class="pile-side">
          <p class="pile-count acquired-label">${p2.acquired.length}</p>
          <div class="acquired-stack">${this.renderAcquiredStack(p2.acquired)}${p2.acquired.length ? html`<span class="acquired-bingo">BINGO!</span>` : null}</div>
        </div>
        <div class="card-center"><div class="card-slot">${this.renderCardSlot(p2)}</div></div>
        <div class="pile-side">
          <p class="pile-count">${p2DeckShown}</p>
          <div class="deck-stack">${this.renderDeckStack(p2DeckShown)}</div>
        </div>
      </div>

      <!-- 中段 -->
      <div class="banner-row">
        ${isDeclare ? html`
          <div class="br-state br-declare-col">
            <span class="action-msg">${p1IsAttack ? 'Choose HIGH or LOW' : 'CPU is thinking…'}</span>
            <div class="hl-btns-row ${p1IsAttack ? 'player-turn' : ''}">
              <button class="btn btn-high btn-hl ${this.G.declaration === 'high' ? 'declared' : ''}"
                ?disabled=${!p1IsAttack} @click=${() => this.playerDeclare('high')}>HIGH</button>
              <button class="btn btn-low btn-hl ${this.G.declaration === 'low' ? 'declared' : ''}"
                ?disabled=${!p1IsAttack} @click=${() => this.playerDeclare('low')}>LOW</button>
            </div>
          </div>` : null}
        ${phase === 'open' && this.G.declaration ? html`
          <div class="br-state"><span class="simple-decl">${this.G.declaration.toUpperCase()}!</span></div>` : null}
        ${phase === 'result' && this.G.result ? html`
          <div class="br-state br-result-col">
            <div class="simple-banner ${this.G.result === 'win' ? 'win' : this.G.result === 'tie' ? 'tie' : 'lose'}">
              ${this.G.result === 'win' ? `${attName} BINGO` : this.G.result === 'tie' ? 'TIE' : `${attName} MISS`}
            </div>
            <button class="btn btn-next full-w ${att.id === 'p1' ? 'btn-next-cpu' : 'btn-next-player'}" @click=${() => this.nextTurn()}>${p1.deck.length === 0 && p2.deck.length === 0 ? 'RESULT' : `Next Turn ${nextAttName}`}</button>
          </div>` : null}
      </div>

      <!-- 下段 P1(PLAYER): [デッキ] [カード] [獲得] -->
      <div class="card-row">
        <div class="pile-side">
          <p class="pile-count">${p1DeckShown}</p>
          <div class="deck-stack">${this.renderDeckStack(p1DeckShown)}</div>
        </div>
        <div class="card-center"><div class="card-slot">${this.renderCardSlot(p1)}</div></div>
        <div class="pile-side">
          <p class="pile-count acquired-label">${p1.acquired.length}</p>
          <div class="acquired-stack">${this.renderAcquiredStack(p1.acquired)}${p1.acquired.length ? html`<span class="acquired-bingo">BINGO!</span>` : null}</div>
        </div>
      </div>

      <div class="chip-row">${this.renderChip(p1)}</div>
    </div>`
  }

  private renderGameover() {
    const p1 = this.G.players.p1, p2 = this.G.players.p2
    const isP1 = p1.acquired.length > p2.acquired.length
    const isP2 = p2.acquired.length > p1.acquired.length
    const winner = isP1 ? 'PLAYER Wins!' : isP2 ? 'CPU Wins!' : 'Draw!'
    return html`<div class="gameover-screen">
      <div class="winner-txt">${winner}</div>
      <div class="final-scores">
        <div class="final-row ${isP1 ? 'winner-row' : ''}">
          <span class="ptag p1">${p1.name}</span><span class="final-count">${p1.acquired.length} cards</span>
        </div>
        <div class="final-row ${isP2 ? 'winner-row' : ''}">
          <span class="ptag p2">${p2.name}</span><span class="final-count">${p2.acquired.length} cards</span>
        </div>
      </div>
      <button class="btn btn-start full-w" @click=${() => this.restartGame()}>Play Again</button>
      <button class="btn btn-ghost full-w" @click=${() => { this.sound(); this.confirmHome = true }}>${this.chrome.home}</button>
    </div>`
  }

  private renderSettings() {
    return html`<div class="overlay">
      <section class="modal">
        ${renderSettingsPanel({
          language: this.language,
          effectEnabled: this.effectEnabled,
          bgmEnabled: this.bgmEnabled,
          soundHelpOpen: this.soundHelpOpen,
          showClearCache: false,
          onClose: () => { this.sound(); this.activePanel = null },
          onEffectChange: (v) => this.setEffect(v),
          onBgmChange: (v) => this.setBgm(v),
          onLanguageChange: (l) => this.setLanguage(l),
          onOpenSoundHelp: () => { this.sound(); this.soundHelpOpen = true },
          onCloseSoundHelp: () => { this.sound(); this.soundHelpOpen = false }
        })}
      </section>
    </div>`
  }

  private renderGuide() {
    return html`<div class="overlay">
      <section class="modal">
        <guide-overview-panel
          .title=${this.chrome.guideOverview}
          .lines=${(this.o('overview_intro', '')).split('\n')}
          .okLabel=${this.m('back', 'Back')}
          @guide-close=${() => { this.sound(); this.activePanel = null }}
        ></guide-overview-panel>
      </section>
    </div>`
  }

  render() {
    const phase = this.G.phase
    const isPlaying = phase === 'declare' || phase === 'open' || phase === 'result'
    return html`
      <div class="screen-bg">
        <div class="stage" style="background-image:url('${bgUrl()}')">
          <div class="table">
            <section class="region-header">
              <game-top-header
                .homeLabel=${this.chrome.home}
                .settingsLabel=${this.chrome.settings}
                .guideLabel=${this.chrome.guide}
                @header-home=${() => { this.sound(); this.confirmHome = true }}
                @header-settings=${() => { this.sound(); this.activePanel = 'settings' }}
                @header-guide=${() => { this.sound(); this.activePanel = 'guide' }}
              ></game-top-header>
              <header class="bet-status">${coinIcon()} COIN ${this.coin}</header>
              <div class="round-badge ${isPlaying ? '' : 'invisible'}">Round ${this.G.round} / ${CARDS_PER_PLAYER}</div>
            </section>

            <section class="region-content">
              <div class="main-area">
                ${isPlaying ? this.renderBoard() : null}
                ${phase === 'gameover' ? this.renderGameover() : null}
              </div>
            </section>

            <section class="region-footer">
              <game-footer-bar
                showFeedback
                @footer-feedback=${this.onFooterFeedback}
              ></game-footer-bar>
            </section>
          </div>

          <!-- モーダルはステージ全体を暗転させる（他ゲームと同じ全面グレーアウト）。
               region-content 内に置くとヘッダー/フッターが暗転されず透けるため、stage 直下に配置。 -->
          ${this.activePanel === 'settings' ? this.renderSettings() : null}
          ${this.activePanel === 'guide' ? this.renderGuide() : null}
          ${this.confirmHome ? html`
            <div class="overlay">
              <section class="modal">
                <confirm-dialog-panel
                  .title=${this.chrome.leaveTitle}
                  .message=${this.chrome.leaveMessage}
                  .okLabel=${this.chrome.ok}
                  .cancelLabel=${this.chrome.cancel}
                  @confirm-accept=${() => this.emitHome()}
                  @confirm-cancel=${() => { this.sound(); this.confirmHome = false }}
                ></confirm-dialog-panel>
              </section>
            </div>` : null}

          <!-- オフライン(Androidのみ)で広告を出せないときの統一警告。OK でスタート(ホーム)へ戻す。文言はアプリ内言語。 -->
          ${this.isOfflineAdWarningOpen ? html`
            <div class="overlay">
              <section class="modal">
                <confirm-dialog-panel
                  .title=${this.chrome.offlineAdTitle}
                  .message=${this.chrome.offlineAdMessage}
                  .okLabel=${this.chrome.ok}
                  @confirm-accept=${() => { this.isOfflineAdWarningOpen = false; this.emitHome() }}
                ></confirm-dialog-panel>
              </section>
            </div>` : null}

          <!-- WEB の広告モック（実広告枠の代わり）。Android では実広告なので出さない。共有部品。 -->
          ${this.adMockOpen ? html`
            <ad-mock-dialog
              .count=${this.adMockCount}
              .okLabel=${this.chrome.ok}
              @ad-mock-close=${() => {
                this.sound()
                this.adMockOpen = false
                if (this.adPendingDeal) { this.adPendingDeal = false; this.dealTurn() }
              }}
            ></ad-mock-dialog>` : null}

        </div>

        <!-- フィードバックは拡大ステージ(.stage)の transform 外に出す＝position:fixed が viewport 基準で
             効き、スマホのキーボードでも縮まず文字も実 px のまま。Memory と同じ配置（共通部品 game-feedback）。 -->
        <game-feedback
          .lang=${this.language}
          gameTitle="high-low-game"
          @feedback-interact=${() => this.sound()}
        ></game-feedback>
      </div>`
  }

  static styles = [
    sharedGameHostStyles,
    sharedGameStageStyles,
    sharedBetStatusStyles,
    sharedOverlayStyles,
    utilities,
    css`
    /* 英語UI（説明以外）は Cinzel。日本語/中国語グリフは明朝にフォールバック。 */
    :host { font-family: 'Cinzel', 'Noto Serif JP', 'Hiragino Mincho ProN', Georgia, serif; }
    .table { width:100%; height:100%; display:flex; flex-direction:column; padding:0 8px; box-sizing:border-box; }
    .region-header { flex:0 0 auto; display:flex; flex-direction:column; gap:2px; padding-top:4px; }
    .region-content { flex:1 1 0; min-height:0; position:relative; overflow:hidden; display:flex; flex-direction:column; }
    .region-footer { flex:0 0 8%; min-height:0; }
    /* メイン盤面のグリッド背景枠（Memory の .battle-panel と同じ意匠：角丸・薄縁・半透明濃緑・ぼかし） */
    .main-area { flex:1 1 0; min-height:0; position:relative; overflow:hidden;
      margin:2px 0 4px; border-radius:18px; border:1px solid rgba(255,255,255,.14);
      background:rgba(7,24,18,.52); box-shadow:0 12px 28px rgba(0,0,0,.28); backdrop-filter:blur(8px); }

    /* 【レスポンシブ方針】このゲームは 540×960 の論理ステージを transform:scale(--game-scale) で
       端末ごとに一様縮小して全画面にフィットさせる。したがって盤面内の寸法は vw を使わず固定 px で
       書く（vw=実ビューポート基準なので scale と二重に掛かり、端末ごとにトランプ等の大きさがバラつく）。
       PC でちょうど良かった値＝従来 clamp の最大値に固定し、全端末で同じ比率になるようにする。 */
    .round-badge { text-align:center; font-size:16px; font-weight:700;
      color:rgba(242,246,247,.85); background:rgba(0,0,0,.35); border-radius:999px; padding:2px 16px; align-self:center; }
    .round-badge.invisible { visibility:hidden; }
    /* コイン表示は Casino War と同じ共有スタイル(.bet-status, padding:2px 8px 6px)を使用 */

    /* 3カラム盤面 */
    .game-board { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:space-evenly; }
    .chip-row { display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .combined-chip { font-size:22px; font-weight:900; padding:5px 22px; border-radius:999px;
      white-space:nowrap; letter-spacing:.04em; display:inline-block; color:#fff;
      border:1px solid #b9933c; box-shadow:0 2px 0 rgba(0,0,0,.3); }
    /* PLAYER(p1)=ワインレッド系(14) / CPU(p2)=青紫系(05)。番が来たら同系色で発光。 */
    .badge-p1 { background:linear-gradient(180deg,#70233a,#35101d); }
    .badge-p2 { background:linear-gradient(180deg,#343e7c,#181d4a); }
    .p1-active { animation:pulse-p1 1.2s ease-in-out infinite; }
    .cpu-active { animation:pulse-p2 1.2s ease-in-out infinite; }
    @keyframes pulse-p1 { 0%,100%{box-shadow:0 0 0 2px rgba(112,35,58,.55),0 0 10px rgba(112,35,58,.35)} 50%{box-shadow:0 0 0 4px rgba(112,35,58,.95),0 0 24px rgba(112,35,58,.75)} }
    @keyframes pulse-p2 { 0%,100%{box-shadow:0 0 0 2px rgba(52,62,124,.55),0 0 10px rgba(52,62,124,.35)} 50%{box-shadow:0 0 0 4px rgba(52,62,124,.95),0 0 24px rgba(52,62,124,.75)} }

    .card-row { display:flex; align-items:flex-start; flex-shrink:0; width:100%; padding:2px 6px; }
    .pile-side { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; }
    .card-center { flex:0 0 160px; display:flex; flex-direction:column; align-items:center; }
    .card-slot { position:relative; }
    .pile-count { margin:0; font-size:20px; font-weight:700; color:rgba(242,246,247,.85); white-space:nowrap; }
    .acquired-label { color:#c8ff8a; }

    .deck-stack { position:relative; width:96px; height:134px; }
    .pile-back { position:absolute; width:96px; height:auto; border-radius:7px; }
    .pile-back-1 { transform:rotate(-6deg) translate(-5px,3px); z-index:1; }
    .pile-back-0 { z-index:2; }
    .pile-empty { width:96px; height:134px; }
    .acquired-stack { position:relative; width:96px; height:214px; overflow:visible; }
    /* 「BINGO!」は獲得札スタックに重ねる大きめバッジ（カードの近く・読みやすく）。
       absolute なのでレイアウト高さを増やさない＝下のチップ行の隙間を崩さない。 */
    .acquired-bingo { position:absolute; left:50%; top:96px; transform:translateX(-50%);
      z-index:100; font-size:22px; font-weight:900; letter-spacing:.06em; line-height:1;
      color:#0a2a12; background:#c8ff8a; border-radius:999px; padding:5px 16px;
      box-shadow:0 2px 10px rgba(0,0,0,.5); white-space:nowrap; pointer-events:none; }
    .acquired-card { position:absolute; width:96px; height:auto; border-radius:7px; }

    .card-stack-wrap { position:relative; width:160px; height:234px; }
    .simple-card { width:160px; height:auto; border-radius:11px; object-fit:contain; display:block; }
    .card-bg { position:absolute; top:0; left:0; z-index:1; opacity:.9; }
    .card-fg { position:absolute; top:34px; left:0; z-index:2; }
    .card-stack-wrap.one .card-fg { top:17px; }
    /* PLAYER(p1): 上下対称にするため表向き(card-fg)を上、裏(card-bg)を下にずらす */
    .card-stack-wrap.flip-v .card-fg { top:0; }
    .card-stack-wrap.flip-v .card-bg { top:34px; }
    .card-stack-wrap.flip-v.one .card-fg { top:17px; }
    .card-fg.flip-in { animation:flip-in .35s ease-out; }
    @keyframes flip-in { from{transform:rotateY(90deg);opacity:0} to{transform:rotateY(0);opacity:1} }

    .banner-row { position:relative; height:140px; width:100%; flex-shrink:0; }
    .br-state { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:6px 14px; box-sizing:border-box; }
    .br-declare-col { flex-direction:column; gap:10px; width:100%; }
    .action-msg { display:block; width:100%; text-align:center; font-size:20px; font-weight:800; color:#fff; }
    .hl-btns-row { display:flex; width:100%; gap:20px; justify-content:space-between; }
    .hl-btns-row.player-turn { animation:hl-glow 1.4s ease-in-out infinite; }
    @keyframes hl-glow { 0%,100%{filter:drop-shadow(0 0 4px rgba(255,215,48,.4))} 50%{filter:drop-shadow(0 0 16px rgba(255,215,48,.95))} }
    .br-result-col { flex-direction:column; gap:8px; width:100%; }
    .br-result-col .simple-banner, .br-result-col .btn-next { display:block; width:100%; text-align:center; box-sizing:border-box; }
    .simple-decl { font-size:56px; font-weight:900; color:#ffd730;
      text-shadow:0 0 24px rgba(255,215,48,.9),0 3px 8px rgba(0,0,0,.9); animation:pop .35s ease-out; }
    .simple-banner { font-size:30px; font-weight:900; text-align:center; border-radius:12px; padding:10px 24px; animation:pop .25s ease-out; }
    .simple-banner.win { background:rgba(10,30,15,.9); color:#c8ff8a; border:2px solid rgba(200,255,138,.6); }
    .simple-banner.lose { background:rgba(30,10,10,.9); color:#ff8a8a; border:2px solid rgba(255,107,107,.6); }
    .simple-banner.tie { background:rgba(18,22,28,.9); color:#dfe6ea; border:2px solid rgba(223,230,234,.55); }
    @keyframes pop { from{transform:scale(.6);opacity:0} to{transform:scale(1);opacity:1} }

    /* ボタン */
    button { font-family:inherit; cursor:pointer; }
    /* Classic: 金枠＋Cinzel（host継承）＋押し込みの影。色は各 .btn-* の背景で上書き。 */
    .btn { min-height:56px; padding:0 22px; border-radius:999px; border:2px solid #b9933c;
      font-size:18px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:4px; color:#fff;
      text-shadow:0 1px 0 rgba(0,0,0,.45); box-shadow:0 2px 0 rgba(0,0,0,.35), 0 4px 8px rgba(0,0,0,.4); }
    .btn:active { filter:brightness(.82); }
    .btn:disabled { opacity:.35; pointer-events:none; }
    .full-w { width:100%; }
    /* HIGH/LOW は横長の長方形。両端まで広げて左右半分ずつ占める（論理ステージ基準の px）。 */
    .btn-hl { flex:1 1 0 !important; min-width:0 !important; height:92px !important; border-radius:16px !important;
      padding:0 !important; font-size:32px !important; font-weight:900 !important; }
    /* HIGH=明るい赤系(12) / LOW=ターコイズ系(42)。選択時(declared)は同系色で発光。 */
    .btn-high { background:linear-gradient(180deg,#d63b32,#8d1712); }
    .btn-low { background:linear-gradient(180deg,#279895,#105251); }
    .btn-high.declared { animation:high-glow 1s ease-in-out infinite; }
    .btn-low.declared { animation:low-glow 1s ease-in-out infinite; }
    @keyframes high-glow { 0%,100%{box-shadow:0 0 12px rgba(214,59,50,.55)} 50%{box-shadow:0 0 34px rgba(214,59,50,1)} }
    @keyframes low-glow { 0%,100%{box-shadow:0 0 12px rgba(39,152,149,.55)} 50%{box-shadow:0 0 34px rgba(39,152,149,1)} }
    /* Next Turn ボタンの文字は「PLAYER Attack」(combined-chip)と同じ 22px。ボールドにはしない。 */
    .btn-next { background:linear-gradient(180deg,#a06a34,#5e3818); font-size:22px; font-weight:400; }
    /* Next Turn は名前のプレイヤーのチップ装飾色に合わせる:
       Next Turn CPU = CPU(Defend) と同じ青紫系(05) / Next Turn PLAYER = PLAYER(Defend) と同じワインレッド系(14)。 */
    .btn-next.btn-next-cpu { background:linear-gradient(180deg,#343e7c,#181d4a); }
    .btn-next.btn-next-player { background:linear-gradient(180deg,#70233a,#35101d); }
    .btn-start { background:linear-gradient(180deg,#a06a34,#5e3818); }
    .btn-ghost { background:transparent; color:rgba(242,246,247,.72); border-color:rgba(255,255,255,.22); font-size:16px; }

    /* gameover */
    .gameover-screen { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:16px; }
    .gameover-title { font-size:28px; font-weight:800; color:#ffd730; }
    .winner-txt { font-size:24px; font-weight:800; color:#c8ff8a; text-align:center; }
    .final-scores { display:flex; flex-direction:column; gap:8px; width:100%; max-width:320px; }
    .final-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:12px;
      background:rgba(10,23,25,.6); border:1px solid rgba(255,255,255,.12); }
    .final-row.winner-row { border-color:#ffd730; background:rgba(255,215,48,.1); }
    .final-count { font-size:20px; font-weight:800; color:#ffd730; }
    .ptag { display:inline-block; padding:2px 12px; border-radius:999px; font-weight:700; color:#f2f6f7; border:1px solid rgba(255,255,255,.25); }
    .ptag.p1 { background:linear-gradient(180deg,#70233a,#35101d); }
    .ptag.p2 { background:linear-gradient(180deg,#343e7c,#181d4a); }

    /* settings/guide/confirm のモーダル枠は sharedOverlayStyles(.overlay/.modal) に集約。
       中身(settings-panel 等)は各自で色/レイアウトを持つので table 側の上書きは不要。 */
  `]
}
