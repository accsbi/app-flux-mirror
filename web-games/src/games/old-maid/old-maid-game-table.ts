import { LitElement, css, html, type TemplateResult, nothing } from 'lit'
import { customElement, state, query } from 'lit/decorators.js'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import { sharedGameHostStyles, sharedGameStageStyles } from '../../shared/ui/styles/shared-game-layout-styles'
import { sharedOverlayStyles, sharedBetStatusStyles } from '../../shared/ui/styles/shared-game-ui-styles'
import { loadSharedCoin } from '../../shared/infra/shared-coin-store'
import { applyStageScale, STAGE_WIDTH } from '../../shared/ui/styles/stage-layout'
import { renderSettingsPanel } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'
import '../../shared/ui/chrome/game-feedback'
import { classicButtonStyles } from '../../shared/ui/classic-button.styles'
import type { GameFeedback } from '../../shared/ui/chrome/game-feedback'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import type { AppLanguage } from '../../shared/config/app-config'
import { SOUND_ENABLED_KEY, LANGUAGE_KEY } from '../../shared/config/storage-keys'
import { loadBgmEnabledSetting, saveBgmEnabledSetting } from '../../shared/infra/bgm-setting'
import { OldMaidEngine, SEATS, type Seat, type OMCard } from './old-maid-engine'
import '../../shared/ui/chrome/game-top-header'
import '../../shared/ui/chrome/game-footer-bar'

// タイミング（Flutter 準拠）
const CPU_THINK_MS = 900 // CPUが引くまでの間
const CURSOR_STEP_MS = 220 // カーソルが1枚ずつ動く間隔（元800msだが見やすさ優先で速め）
const PAIR_BLINK_MS = 1200 // ペアが揃ったときの点滅時間
const PICK_ANIM_MS = 260 // 引いたカードが動くアニメ

const CARD_W = 128
const CARD_H = 179
const SIDE_AVAIL_H = 380

const T = {
  parent: { ja: '親を決めます', en: 'Decide the parent', zh: '决定庄家' },
  parentIs: {
    ja: (n: string) => `親は ${n} です`,
    en: (n: string) => `Parent is ${n}`,
    zh: (n: string) => `庄家是 ${n}`,
  },
  removePairs: {
    ja: '手札の同じ数字のペアを捨てます',
    en: 'Discard matching pairs from your hand',
    zh: '弃掉手中成对的牌',
  },
  drawFrom: {
    ja: (n: string) => `${n} から1枚引いてください`,
    en: (n: string) => `Draw a card from ${n}`,
    zh: (n: string) => `从 ${n} 抽一张牌`,
  },
  cpuTurn: {
    ja: (n: string) => `${n} の番`,
    en: (n: string) => `${n}'s turn`,
    zh: (n: string) => `${n} 的回合`,
  },
  cpuPause: {
    ja: (n: string) => `次は ${n} が引きます`,
    en: (n: string) => `${n} will draw next`,
    zh: (n: string) => `接下来 ${n} 抽牌`,
  },
  shuffle: { ja: 'シャッフル', en: 'Shuffle', zh: '洗牌' },
  ok: { ja: 'OK', en: 'OK', zh: '确定' },
  again: { ja: 'もう一度', en: 'Play Again', zh: '再来一局' },
  menu: { ja: 'メニューへ', en: 'Menu', zh: '返回菜单' },
  you: { ja: 'あなた', en: 'YOU', zh: '你' },
}

const GUIDE_LINES: Record<AppLanguage, string[]> = {
  ja: [
    '4人で遊ぶババ抜きです。',
    '自分の番に、引く相手の伏せ札から1枚を引きます。',
    '同じ数字のペアは自動で場に捨てられます。',
    '手札が無くなった人から順に「あがり」。',
    '最後にジョーカーを持っていた人が負けです。',
  ],
  en: [
    'Old Maid played by 4 players.',
    'On your turn, draw one face-down card from the next player.',
    'Matching pairs are discarded automatically.',
    'Players who run out of cards finish in order.',
    'Whoever is left holding the Joker loses.',
  ],
  zh: [
    '4人抽乌龟（找鬼牌）游戏。',
    '轮到你时，从下家的暗牌中抽一张。',
    '成对的牌会自动弃掉。',
    '先出完牌的人依次完成。',
    '最后留着鬼牌(Joker)的人输。',
  ],
}

function calcSpacing(count: number, cardLen: number, avail: number, overlap = 0.5): number {
  if (count <= 1) return 0
  const maxSpacing = (avail - cardLen) / (count - 1)
  const target = cardLen * overlap
  const s = Math.min(maxSpacing, target)
  return s < 0 ? 0 : s
}
function drawFanSpacing(count: number, cardLen: number, avail: number): number {
  if (count <= 1) return 0
  const maxSpacing = (avail - cardLen) / (count - 1)
  const factor = count >= 9 ? 0.36 : count === 8 ? 0.42 : count === 7 ? 0.48 : count === 6 ? 0.55 : 0.66
  const s = Math.min(maxSpacing, cardLen * factor)
  return s < 0 ? 0 : s
}
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Old Maid（ババ抜き）。Flutter 版 OldMaidGame.dart を忠実移植。
// フロー: 親決め → 親発表+ペア除去 → 親から開始CPU引き → プレイヤー/CPUのターン制 → 順位表示。
// 演出: CPUカーソルの走査 / ペア揃いの点滅(1.2s) / 引くアクション / シャッフルポーズ。
@customElement('old-maid-game-table')
export class OldMaidGameTable extends LitElement {
  private readonly engine = new OldMaidEngine()
  @state() private rev = 0
  @state() private phase: 'parent' | 'arrange' | 'opening' | 'player' | 'cpuPause' | 'cpu' | 'over' = 'parent'
  @state() private message = ''
  @state() private activePanel: 'settings' | 'guide' | null = null
  @state() private selectedLanguage: AppLanguage = 'en'
  @state() private isSoundEnabled = true
  @state() private isBgmEnabled = false
  @state() private soundHelpOpen = false
  @state() private confirmHomeOpen = false

  // 演出用 state
  @state() private cursorSeat: Seat | null = null
  @state() private cursorIndex = 0
  @state() private blinkCards = new Set<OMCard>()
  @state() private blinkOn = false
  @state() private pickIndex: number | null = null
  @state() private pendingCpuTarget: Seat | null = null
  private busy = false
  private cursorTimer: number | null = null
  private blinkTimer: number | null = null

  @query('game-feedback') private feedbackEl?: GameFeedback

  static styles = [
    sharedGameHostStyles,
    sharedGameStageStyles,
    sharedOverlayStyles,
    sharedBetStatusStyles,
    css`
      /* 他ゲーム(blackjack/casino-war/high-low/memory)と同一のヘッダー/フッター規約。
         フッター位置がズレないよう flex 縦並び + --footer-height-rate/--table-row-gap を統一。 */
      :host {
        --footer-height-rate: 8%;
        --table-row-gap: 8px;
      }
      .table {
        position: absolute;
        inset: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--table-row-gap);
        padding: 0 8px 0;
        box-sizing: border-box;
        color: #fff;
        overflow: hidden;
      }
      .region-header {
        display: grid;
        gap: 8px;
        padding-top: 4px;
        flex: 0 0 auto;
      }
      .region-footer {
        display: grid;
        align-items: end;
        flex: 0 0 var(--footer-height-rate);
        margin-top: auto;
        min-height: 0;
      }
      /* ヘッダーとフッターの間の対局エリア */
      .play {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        grid-template-rows: auto 1fr auto auto auto;
        gap: 6px;
      }
      .row {
        position: relative;
        margin: 0 auto;
        height: ${CARD_H}px;
      }
      /* カード画像は透明パディング＋角丸が焼き込み済み。影は box-shadow(矩形=ダブって見える)ではなく
         drop-shadow(アルファ形状に追従)を使う＝他ゲーム(casino-war)と同一。border-radius も付けない。 */
      .row img {
        position: absolute;
        top: 0;
        width: ${CARD_W}px;
        height: ${CARD_H}px;
        object-fit: contain;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
      }
      .area-top {
        display: flex;
        justify-content: center;
        padding-top: 4px;
      }
      /* どのカードから引くか等のメッセージ（専用バンド＝カードに重ねない） */
      .msg-band {
        min-height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 23px;
        font-weight: 800;
        color: #fff;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
        padding: 2px 12px;
      }
      .mid {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 1.4fr 1fr;
        align-items: center;
        min-height: 0;
      }
      .col-left {
        justify-self: start;
        transform: translateX(-42%);
      }
      .col-right {
        justify-self: end;
        transform: translateX(42%);
      }
      .vcol {
        position: relative;
        width: ${CARD_H}px;
      }
      .vcard {
        position: absolute;
        left: 0;
        width: ${CARD_H}px;
        height: ${CARD_W}px;
      }
      .vcard img {
        position: absolute;
        left: 50%;
        top: 50%;
        width: ${CARD_W}px;
        height: ${CARD_H}px;
        object-fit: contain;
        transform: translate(-50%, -50%) rotate(90deg);
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
      }
      /* 中央＝捨て札の山。少し下寄せ。 */
      .center {
        position: relative;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        min-height: 0;
        padding-bottom: 6px;
      }
      .discard-pile {
        position: relative;
        width: 240px;
        height: 190px;
      }
      .discard-pair {
        position: absolute;
        left: 50%;
        top: 50%;
        margin: -56px 0 0 -57px;
      }
      .discard-pair img {
        width: 78px;
        height: 109px;
        object-fit: contain;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
      }
      .discard-pair .d2 {
        position: absolute;
        left: 44px;
        top: 0;
      }
      /* 引きファン（自分の番に引き相手の伏せ札を選ぶ） */
      .area-fan {
        position: relative;
        height: ${CARD_H}px;
        display: flex;
        justify-content: center;
      }
      /* 引く相手の手札はグレーアウト（その札は引きファンに移っている） */
      .dimmed {
        filter: grayscale(1) brightness(0.6);
        opacity: 0.5;
      }
      .fan {
        position: relative;
      }
      /* 引きファンの強調枠（ここから引く） */
      .fan.framed::before {
        content: '';
        position: absolute;
        left: -12px;
        right: -12px;
        top: -10px;
        bottom: -10px;
        border: 3px solid #ffd479;
        border-radius: 14px;
        box-shadow: 0 0 16px rgba(255, 212, 121, 0.55);
        background: rgba(255, 212, 121, 0.08);
        animation: fanPulse 1.1s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes fanPulse {
        0%,
        100% {
          box-shadow: 0 0 12px rgba(255, 212, 121, 0.4);
        }
        50% {
          box-shadow: 0 0 22px rgba(255, 212, 121, 0.75);
        }
      }
      .fan img {
        position: absolute;
        top: 0;
        width: ${CARD_W}px;
        height: ${CARD_H}px;
        object-fit: contain;
        opacity: 0.92;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
        cursor: pointer;
        transition: transform ${PICK_ANIM_MS}ms ease, opacity ${PICK_ANIM_MS}ms ease;
      }
      .fan img:hover {
        transform: translateY(-16px);
        z-index: 20;
      }
      .fan img.picking {
        transform: translateY(-150px) scale(1.05);
        opacity: 0;
        z-index: 30;
      }
      /* プレイヤー手札（表向き） */
      .area-hand {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        padding-bottom: 6px;
      }
      .area-hand .row img {
        transition: outline 0.1s ease, transform 0.1s ease;
      }
      /* ペア点滅: 矩形 outline ではなくカード形状に沿った赤グロー（ダブり防止） */
      .area-hand .row img.blink {
        filter: drop-shadow(0 0 4px #ff3b30) drop-shadow(0 0 8px #ff3b30) brightness(1.08);
        transform: translateY(-12px);
        z-index: 12;
      }
      .area-hand .row img.blink-off {
        transform: none;
      }
      /* カーソル（CPUが引く山の上をなぞる） */
      .cursor {
        position: absolute;
        width: 0;
        height: 0;
        border-left: 13px solid transparent;
        border-right: 13px solid transparent;
        border-top: 18px solid #ffd479;
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
        z-index: 18;
        pointer-events: none;
      }
      /* 順位 1st/2nd/3rd/4th */
      .rank {
        position: absolute;
        font-size: 46px;
        font-weight: 900;
        text-shadow: 0 3px 8px rgba(0, 0, 0, 0.7);
        z-index: 16;
      }
      .rank.r1 {
        color: #ffd479;
      }
      .rank.r2 {
        color: #9ad0ff;
      }
      .rank.r3 {
        color: #ffb27a;
      }
      .rank.r4 {
        color: #ff7a7a;
      }
      .result-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        background: rgba(0, 0, 0, 0.6);
        z-index: 30;
      }
      .result-title {
        font-size: 52px;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-shadow: 0 3px 12px rgba(0, 0, 0, 0.6);
      }
      .result-title.win {
        color: #ffd479;
      }
      .result-title.lose {
        color: #ff9a8a;
      }
      .btn {
        min-width: 240px;
        min-height: 58px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(180deg, #a06a34, #5e3818);
        color: #fff;
        font-size: 21px;
        font-weight: 800;
        cursor: pointer;
      }
      .dialog {
        text-align: center;
      }
      .dialog p {
        font-size: 19px;
        font-weight: 700;
        margin: 0 0 16px;
        color: #f2e8d4;
      }
      .dialog .btn-row {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
    `,
    classicButtonStyles,
  ]

  connectedCallback(): void {
    super.connectedCallback()
    window.addEventListener('resize', this.updateScale)
    this.loadSettings()
    this.newGame()
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    this.stopCursor()
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer)
    super.disconnectedCallback()
  }

  firstUpdated(): void {
    this.updateScale()
  }

  private loadSettings(): void {
    this.isSoundEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'
    this.isBgmEnabled = loadBgmEnabledSetting()
    const lang = localStorage.getItem(LANGUAGE_KEY)
    if (lang === 'ja' || lang === 'zh' || lang === 'en') this.selectedLanguage = lang
  }

  private readonly updateScale = (): void => applyStageScale(this)
  private bump(): void {
    this.rev++
  }
  private assetUrl(p: string): string {
    return buildGameAssetUrl(p)
  }
  private cardUrl(c: OMCard): string {
    return this.assetUrl(`cards/${c.imagePath}`)
  }
  private backUrl(): string {
    return this.assetUrl('cards/back_card.png')
  }
  private tt<K extends keyof typeof T>(k: K): (typeof T)[K][AppLanguage] {
    return T[k][this.selectedLanguage]
  }
  private label(seat: Seat): string {
    return seat === 'player' ? (this.tt('you') as string) : seat.toUpperCase()
  }
  private playSound(name: string): void {
    if (!this.isSoundEnabled) return
    try {
      const a = new Audio(this.assetUrl(`old-maid/effects/${name}.mp3`))
      a.volume = 0.6
      void a.play().catch(() => undefined)
    } catch {
      /* ignore */
    }
  }

  // ── フロー ──
  private newGame(): void {
    this.engine.start()
    this.phase = 'parent'
    this.message = ''
    this.cursorSeat = null
    this.blinkCards = new Set()
    this.pickIndex = null
    this.pendingCpuTarget = null
    this.activePanel = null
    this.busy = false
    this.stopCursor()
    this.playSound('start')
    this.bump()
  }

  // 親決め OK → 親発表（arrange）
  private onParentOk(): void {
    this.playSound('submit_btn')
    this.phase = 'arrange'
    this.message = (this.tt('parentIs') as (n: string) => string)(this.label(this.engine.parent))
    this.bump()
  }

  // ペア除去 OK → 初期ペア除去 → 親から開始CPU引き
  private async onArrangeOk(): Promise<void> {
    this.playSound('deal_cards_btn')
    const before = this.engine.finished.length
    this.engine.removeAllPairs()
    this.afterFinishedChange(before)
    this.message = ''
    this.bump()
    await delay(400)
    await this.runOpening()
  }

  private async runOpening(): Promise<void> {
    this.phase = 'opening'
    this.busy = true
    const startIdx = SEATS.indexOf(this.engine.parent)
    for (let i = 0; i < SEATS.length; i++) {
      const seat = SEATS[(startIdx + i) % SEATS.length]
      if (seat === 'player') break
      await this.cpuDraw(seat)
      if (this.checkOver()) return
    }
    this.busy = false
    this.toPlayerTurn()
  }

  private toPlayerTurn(): void {
    if (this.checkOver()) return
    if (this.engine.hands.player.length === 0) {
      // プレイヤーは上がり済み → CPU だけで進める
      void this.runCpuSequence()
      return
    }
    const src = this.engine.drawSource('player')
    if (!src) {
      void this.runCpuSequence()
      return
    }
    this.phase = 'player'
    this.message = (this.tt('drawFrom') as (n: string) => string)(this.label(src))
    this.bump()
  }

  // プレイヤーが引きファンの1枚をクリック
  private async onPlayerPick(index: number): Promise<void> {
    if (this.phase !== 'player' || this.busy) return
    const source = this.engine.drawSource('player')
    if (!source) return
    this.busy = true
    // 引くアクション（カードが浮いて消える）
    this.pickIndex = index
    this.bump()
    await delay(PICK_ANIM_MS)
    this.pickIndex = null
    const card = this.engine.draw('player', source, index)
    this.message = ''
    this.bump()
    // 引いたカードでペアができたら点滅 → 除去
    await this.resolvePlayerPairs(card)
    if (this.checkOver()) return
    // 次は CPU が引く（シャッフル/OK のポーズを挟む）
    const next = this.nextCpuTarget()
    if (next) {
      this.pendingCpuTarget = next
      this.phase = 'cpuPause'
      this.message = (this.tt('cpuPause') as (n: string) => string)(this.label(next))
      this.busy = false
      this.bump()
      return
    }
    this.busy = false
    this.toPlayerTurn()
  }

  // 引いた直後のペア点滅（Flutter _handlePlayerPairs 相当：1200ms 点滅してから除去）
  private async resolvePlayerPairs(drawn: OMCard | null): Promise<void> {
    const pairs = this.engine.collectPairs('player')
    if (drawn && drawn.value === 0) this.playSound('player_draw_joker')
    if (pairs.size === 0) {
      if (drawn) this.playSound('card_draw')
      return
    }
    this.playSound('player_card_match')
    this.blinkCards = pairs
    this.blinkOn = true
    this.bump()
    // 点滅（on/off を数回）
    for (let i = 0; i < 5; i++) {
      await delay(PAIR_BLINK_MS / 6)
      this.blinkOn = !this.blinkOn
      this.bump()
    }
    await delay(PAIR_BLINK_MS / 6)
    const before = this.engine.finished.length
    this.engine.removePairs('player')
    this.blinkCards = new Set()
    this.blinkOn = false
    this.afterFinishedChange(before)
    this.bump()
  }

  // シャッフルポーズの「シャッフル」
  private onShuffle(): void {
    const next = this.pendingCpuTarget
    if (!next) return
    const src = this.engine.drawSource(next)
    if (src) {
      this.engine.shuffleHand(src)
      this.playSound('card_draw')
      this.bump()
    }
  }
  // シャッフルポーズの「OK」→ CPU 連続引き
  private async onCpuPauseOk(): Promise<void> {
    this.pendingCpuTarget = null
    this.message = ''
    await this.runCpuSequence()
  }

  private async runCpuSequence(): Promise<void> {
    this.phase = 'cpu'
    this.busy = true
    for (const seat of ['cpu1', 'cpu2', 'cpu3'] as Seat[]) {
      await this.cpuDraw(seat)
      if (this.checkOver()) return
    }
    this.busy = false
    this.toPlayerTurn()
  }

  private nextCpuTarget(): Seat | null {
    for (const seat of ['cpu1', 'cpu2', 'cpu3'] as Seat[]) {
      if (this.engine.hands[seat].length === 0) continue
      if (this.engine.drawSource(seat)) return seat
    }
    return null
  }

  // CPU が1枚引く（カーソル走査 → 着地 → 引く → ペア除去）
  private async cpuDraw(seat: Seat): Promise<void> {
    this.engine.updateFinished()
    if (this.engine.hands[seat].length === 0) return
    const source = this.engine.drawSource(seat)
    if (!source) return
    this.message = (this.tt('cpuTurn') as (n: string) => string)(this.label(seat))
    const srcLen = this.engine.hands[source].length
    this.startCursor(source, srcLen)
    this.bump()
    await delay(CPU_THINK_MS)
    this.stopCursor()
    const idx = this.cursorIndex < srcLen ? this.cursorIndex : Math.floor(Math.random() * srcLen)
    const drawn = this.engine.draw(seat, source, idx)
    const before = this.engine.finished.length
    this.engine.removePairs(seat)
    if (drawn && this.engine.finished.length === before) this.playSound('card_draw')
    this.cursorSeat = null
    this.afterFinishedChange(before)
    this.message = ''
    this.bump()
    await delay(180)
  }

  private startCursor(seat: Seat, count: number): void {
    this.stopCursor()
    this.cursorSeat = seat
    this.cursorIndex = count > 1 ? Math.floor(Math.random() * count) : 0
    let dir = Math.random() < 0.5 ? 1 : -1
    if (count <= 1) return
    this.cursorTimer = window.setInterval(() => {
      let next = this.cursorIndex + dir
      if (next <= 0) {
        next = 0
        dir = 1
      } else if (next >= count - 1) {
        next = count - 1
        dir = -1
      }
      this.cursorIndex = next
      this.bump()
    }, CURSOR_STEP_MS)
  }
  private stopCursor(): void {
    if (this.cursorTimer) {
      window.clearInterval(this.cursorTimer)
      this.cursorTimer = null
    }
  }

  // 終了者が増えたら順位音
  private afterFinishedChange(beforeLen: number): void {
    this.engine.updateFinished()
    const afterLen = this.engine.finished.length
    if (afterLen > beforeLen) {
      // 新たに上がった人の順位音（1位=1st、それ以外=2nd_3rd_4th）
      for (let r = beforeLen; r < afterLen; r++) {
        this.playSound(r === 0 ? '1st' : '2nd_3rd_4th')
      }
    }
  }

  private checkOver(): boolean {
    if (this.engine.isGameOver()) {
      this.stopCursor()
      this.phase = 'over'
      this.busy = false
      this.cursorSeat = null
      this.message = ''
      this.bump()
      return true
    }
    return false
  }

  private goHome(): void {
    this.dispatchEvent(new CustomEvent('go-home', { bubbles: true, composed: true }))
  }
  // Home は他ゲームと同じく確認ダイアログを挟む（誤操作で中断しない）。
  private requestHome(): void {
    this.confirmHomeOpen = true
  }
  private closePanel(): void {
    this.activePanel = null
    this.soundHelpOpen = false
  }
  private setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
  }
  private setBgmEnabled(enabled: boolean): void {
    this.isBgmEnabled = enabled
    saveBgmEnabledSetting(enabled)
  }
  private rankOf(seat: Seat): number {
    const i = this.engine.finished.indexOf(seat)
    return i >= 0 ? i + 1 : 4
  }
  private rankText(seat: Seat): string {
    const r = this.rankOf(seat)
    return ['1st', '2nd', '3rd', '4th'][r - 1]
  }

  // ── 描画 ──
  // プレイヤーの番に「引く相手」＝動的に決まる（CPU3が上がってたら手前のCPU2/CPU1）。
  private get drawSourceSeat(): Seat | null {
    return this.phase === 'player' ? this.engine.drawSource('player') : null
  }

  private renderTopRow(seat: Seat): TemplateResult {
    const n = this.engine.hands[seat].length
    const finished = this.engine.finished.includes(seat)
    if (n === 0) {
      return html`<div class="area-top">${finished ? this.renderRankBadge(seat) : nothing}</div>`
    }
    const avail = STAGE_WIDTH * 0.8
    const spacing = calcSpacing(n, CARD_W, avail, 0.5)
    const total = CARD_W + (n - 1) * spacing
    const showCursor = this.cursorSeat === seat
    const dim = this.drawSourceSeat === seat // 引く相手はグレーアウト（その札は引きファンに出ている）
    return html`
      <div class="area-top">
        <div class="row ${dim ? 'dimmed' : ''}" style="width:${total}px">
          ${Array.from({ length: n }).map(
            (_, i) => html`<img src=${this.backUrl()} alt="card" style="left:${i * spacing}px" />`,
          )}
          ${showCursor
            ? html`<div class="cursor" style="left:${this.cursorIndex * spacing + CARD_W / 2 - 13}px; top:-20px"></div>`
            : nothing}
          ${finished ? this.renderRankBadge(seat) : nothing}
        </div>
      </div>
    `
  }

  private renderSideCol(seat: Seat, side: 'left' | 'right'): TemplateResult {
    const n = this.engine.hands[seat].length
    const finished = this.engine.finished.includes(seat)
    if (n === 0) {
      return html`<div class="col-${side}">${finished ? this.renderRankBadge(seat, side) : nothing}</div>`
    }
    const spacing = calcSpacing(n, CARD_W, SIDE_AVAIL_H, 0.2)
    const total = CARD_W + (n - 1) * spacing
    const showCursor = this.cursorSeat === seat
    const dim = this.drawSourceSeat === seat
    return html`
      <div class="col-${side}">
        <div class="vcol ${dim ? 'dimmed' : ''}" style="height:${total}px">
          ${Array.from({ length: n }).map(
            (_, i) => html`<div class="vcard" style="top:${i * spacing}px"><img src=${this.backUrl()} alt="card" /></div>`,
          )}
          ${showCursor
            ? html`<div class="cursor" style="top:${this.cursorIndex * spacing + CARD_W / 2 - 9}px; ${side === 'left' ? 'right:-6px; transform:rotate(90deg)' : 'left:-6px; transform:rotate(-90deg)'}"></div>`
            : nothing}
          ${finished ? this.renderRankBadge(seat) : nothing}
        </div>
      </div>
    `
  }

  private renderRankBadge(seat: Seat, side: 'left' | 'right' | 'center' = 'center'): TemplateResult {
    const r = this.rankOf(seat)
    // 左右の空席（上がり済みで手札0）は列が画面端に寄る＝中央配置だと "1st" が見切れる。
    // 端から内側に寄せて必ず画面内に収める。
    const style =
      side === 'left'
        ? 'left:14px; top:50%; transform:translateY(-50%)'
        : side === 'right'
          ? 'right:14px; top:50%; transform:translateY(-50%)'
          : 'left:50%; top:50%; transform:translate(-50%,-50%)'
    return html`<div class="rank r${r}" style="${style}">${this.rankText(seat)}</div>`
  }

  private renderDiscard(): TemplateResult {
    const d = this.engine.discarded
    if (d.length === 0) return html`<div class="discard-pile"></div>`
    const pairs = Math.floor(d.length / 2)
    return html`
      <div class="discard-pile">
        ${Array.from({ length: pairs }).map((_, i) => {
          const c1 = d[i * 2]
          const c2 = d[i * 2 + 1]
          const seed = (i * 2654435761) >>> 0
          const ox = ((seed % 100) / 100) * 96 - 48
          const oy = (((seed >> 8) % 100) / 100) * 76 - 38
          const rot = (((seed >> 16) % 100) / 100) * 28 - 14
          return html`<div class="discard-pair" style="transform: translate(${ox}px, ${oy}px) rotate(${rot}deg)">
            <img src=${this.cardUrl(c1)} alt="" />
            ${c2 ? html`<img class="d2" src=${this.cardUrl(c2)} alt="" />` : nothing}
          </div>`
        })}
      </div>
    `
  }

  private renderFan(): TemplateResult {
    if (this.phase !== 'player' && this.pickIndex === null) return html`<div class="area-fan"></div>`
    const source = this.engine.drawSource('player')
    const hand = source ? this.engine.hands[source] : []
    if (!source || hand.length === 0) return html`<div class="area-fan"></div>`
    const avail = STAGE_WIDTH * 0.9
    const spacing = drawFanSpacing(hand.length, CARD_W, avail)
    const total = CARD_W + (hand.length - 1) * spacing
    // 引きファンを枠で強調（ここから引く、と分かるように）。
    return html`
      <div class="area-fan">
        <div class="fan framed" style="width:${total}px">
          ${hand.map(
            (_, i) =>
              html`<img
                class=${this.pickIndex === i ? 'picking' : ''}
                src=${this.backUrl()}
                alt="draw"
                style="left:${i * spacing}px"
                @click=${() => this.onPlayerPick(i)}
              />`,
          )}
        </div>
      </div>
    `
  }

  private renderHand(): TemplateResult {
    const hand = this.engine.hands.player
    const cursorHere = this.cursorSeat === 'player'
    if (hand.length === 0) {
      return html`<div class="area-hand">${this.engine.finished.includes('player') ? this.renderRankBadge('player') : nothing}</div>`
    }
    const avail = STAGE_WIDTH * 0.9
    const spacing = calcSpacing(hand.length, CARD_W, avail, 0.42)
    const total = CARD_W + (hand.length - 1) * spacing
    return html`
      <div class="area-hand">
        <div class="row" style="width:${total}px">
          ${hand.map((c, i) => {
            const isBlink = this.blinkCards.has(c)
            const cls = isBlink ? (this.blinkOn ? 'blink' : 'blink-off') : ''
            return html`<img class=${cls} src=${this.cardUrl(c)} alt="card" style="left:${i * spacing}px" loading="lazy" />`
          })}
          ${cursorHere
            ? html`<div class="cursor" style="left:${this.cursorIndex * spacing + CARD_W / 2 - 13}px; top:-20px"></div>`
            : nothing}
          ${this.phase === 'over' ? this.renderRankBadge('player') : nothing}
        </div>
      </div>
    `
  }

  private renderResult(): TemplateResult {
    const loser = this.engine.loser()
    const win = loser !== 'player'
    return html`
      <div class="result-overlay">
        <div class="result-title ${win ? 'win' : 'lose'}">${win ? 'YOU WIN!' : 'YOU LOSE'}</div>
        <button class="btn classic-btn" @click=${() => this.newGame()}>${this.tt('again')}</button>
        <button class="btn classic-btn" @click=${() => this.goHome()}>${this.tt('menu')}</button>
      </div>
    `
  }

  private renderDialog(): TemplateResult | typeof nothing {
    if (this.phase === 'parent') {
      return html`<section class="overlay"><div class="modal dialog">
        <p>${this.tt('parent')}</p>
        <div class="btn-row"><button class="btn classic-btn" @click=${() => this.onParentOk()}>${this.tt('ok')}</button></div>
      </div></section>`
    }
    if (this.phase === 'arrange') {
      return html`<section class="overlay"><div class="modal dialog">
        <p>${(this.tt('parentIs') as (n: string) => string)(this.label(this.engine.parent))}</p>
        <p>${this.tt('removePairs')}</p>
        <div class="btn-row"><button class="btn classic-btn" @click=${() => void this.onArrangeOk()}>${this.tt('ok')}</button></div>
      </div></section>`
    }
    if (this.phase === 'cpuPause' && this.pendingCpuTarget) {
      return html`<section class="overlay"><div class="modal dialog">
        <p>${(this.tt('cpuPause') as (n: string) => string)(this.label(this.pendingCpuTarget))}</p>
        <div class="btn-row">
          <button class="btn classic-btn" @click=${() => this.onShuffle()}>${this.tt('shuffle')}</button>
          <button class="btn classic-btn" @click=${() => void this.onCpuPauseOk()}>${this.tt('ok')}</button>
        </div>
      </div></section>`
    }
    return nothing
  }

  render() {
    const stageStyle = `background-image: url('${this.assetUrl('images/background.webp')}')`
    const chrome = getSharedChromeText(this.selectedLanguage)
    return html`
      <div class="screen-bg">
        <div class="stage" style=${stageStyle}>
          <div class="table">
            <section class="region-header">
              <game-top-header
                home-label=${chrome.home}
                settings-label=${chrome.settings}
                guide-label=${chrome.guide}
                .coin=${0}
                @header-home=${() => this.requestHome()}
                @header-settings=${() => (this.activePanel = 'settings')}
                @header-guide=${() => (this.activePanel = 'guide')}
              ></game-top-header>
              <!-- old-maid はコインを使わないが、他ゲームと表示位置を揃えるため
                   ツールバー直下に COIN 行（テキストのみ・読み取り専用）で枠を確保する。 -->
              <header class="bet-status">COIN ${loadSharedCoin()}</header>
            </section>

            <div class="play">
              ${this.renderTopRow('cpu2')}
              <div class="mid">
                ${this.renderSideCol('cpu3', 'left')}
                <div class="center"></div>
                ${this.renderSideCol('cpu1', 'right')}
              </div>
              <div class="msg-band">${this.message}</div>
              ${this.renderFan()}
              ${this.renderHand()}
            </div>

            <section class="region-footer">
              <game-footer-bar
                showFeedback
                @footer-feedback=${() => this.feedbackEl?.open()}
              ></game-footer-bar>
            </section>
          </div>

          ${this.renderDialog()}
          ${this.phase === 'over' ? this.renderResult() : nothing}

          ${this.confirmHomeOpen
            ? html`<section class="overlay">
                <div class="modal">
                  <confirm-dialog-panel
                    .title=${chrome.leaveTitle}
                    .message=${chrome.leaveMessage}
                    .okLabel=${chrome.ok}
                    .cancelLabel=${chrome.cancel}
                    @confirm-accept=${() => this.goHome()}
                    @confirm-cancel=${() => (this.confirmHomeOpen = false)}
                  ></confirm-dialog-panel>
                </div>
              </section>`
            : nothing}

          ${this.activePanel === 'settings'
            ? html`<section class="overlay">
                <div class="modal">
                  ${renderSettingsPanel({
                    language: this.selectedLanguage,
                    effectEnabled: this.isSoundEnabled,
                    bgmEnabled: this.isBgmEnabled,
                    soundHelpOpen: this.soundHelpOpen,
                    showClearCache: false,
                    onClose: () => this.closePanel(),
                    onEffectChange: (e) => this.setSoundEnabled(e),
                    onBgmChange: (e) => this.setBgmEnabled(e),
                    onLanguageChange: (next) => {
                      this.selectedLanguage = next
                      localStorage.setItem(LANGUAGE_KEY, next)
                    },
                    onOpenSoundHelp: () => (this.soundHelpOpen = true),
                    onCloseSoundHelp: () => (this.soundHelpOpen = false),
                  })}
                </div>
              </section>`
            : nothing}
          ${this.activePanel === 'guide'
            ? html`<section class="overlay">
                <div class="modal">
                  <guide-overview-panel
                    .title=${chrome.guideOverview}
                    .lines=${GUIDE_LINES[this.selectedLanguage]}
                    .okLabel=${chrome.ok}
                    @guide-close=${() => this.closePanel()}
                  ></guide-overview-panel>
                </div>
              </section>`
            : nothing}

          <game-feedback .lang=${this.selectedLanguage} gameTitle="old-maid-game"></game-feedback>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'old-maid-game-table': OldMaidGameTable
  }
}
