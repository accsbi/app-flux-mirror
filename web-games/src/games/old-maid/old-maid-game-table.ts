import { LitElement, css, html, type TemplateResult, nothing } from 'lit'
import { customElement, state, query } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { buildGameAssetUrl } from '../../shared/infra/game-asset-url'
import { sharedGameHostStyles, sharedGameStageStyles } from '../../shared/ui/styles/shared-game-layout-styles'
import { utilities } from '../../shared/ui/styles/utilities'
import { sharedOverlayStyles, sharedBetStatusStyles, sharedCoinRecoveryStyles } from '../../shared/ui/styles/shared-game-ui-styles'
import { ensurePlayableSharedCoin, saveSharedCoin } from '../../shared/infra/shared-coin-store'
import { clearPendingStake, savePendingStake, takePendingStake } from '../../shared/infra/pending-stake-store'
import { recoverSharedCoin, scheduleCoinRecoveryDialogIfZero } from '../../shared/ui/styles/shared'
import { getAndroidBillingBridge } from '../../shared/infra/android-billing-bridge'
import '../../shared/ui/panels/bet-selector-panel'
import { applyStageScale, STAGE_WIDTH } from '../../shared/ui/styles/stage-layout'
import { renderSettingsPanel } from '../../shared/ui/panels/settings-modal'
import '../../shared/ui/panels/guide-overview-panel'
import '../../shared/ui/panels/confirm-dialog-panel'
import '../../shared/ui/panels/ad-mock-dialog'
import { countGameForAd, isAndroidApp, isOfflineForAd, OLD_MAID_WEB_AD_COUNT_KEY } from '../../shared/infra/web-ad-mock'
import '../../shared/ui/chrome/game-feedback'
import { classicButtonStyles } from '../../shared/ui/classic-button.styles'
import type { GameFeedback } from '../../shared/ui/chrome/game-feedback'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import {
  type AppConfigRoot,
  type AppLanguage,
  getLanguageBlock,
  getLocalizedString,
  loadAppConfig,
  splitTextLines,
} from '../../shared/config/app-config'
import { SOUND_ENABLED_KEY, LANGUAGE_KEY } from '../../shared/config/storage-keys'
import { loadBgmEnabledSetting, saveBgmEnabledSetting } from '../../shared/infra/bgm-setting'
import { OldMaidEngine, SEATS, type Seat, type OMCard } from './old-maid-engine'
import { coinIcon } from '../../shared/ui/icons/coin-icon'
import '../../shared/ui/chrome/game-top-header'
import '../../shared/ui/chrome/game-footer-bar'

// タイミング（Flutter 準拠）
const CPU_THINK_MS = 1100 // CPUが引くまでの「考える」間（序盤・カーソル走査）
const CURSOR_STEP_MS = 260 // カーソルが1枚ずつ動く間隔（序盤）
// ゲーム後半は CPU の判断に「迷い」を出す＝矢印を遅く・思考を長くする。
// 基準は元 Android(simple_old_maid)の広告ポイント＝Player の手札が半分以下→4枚以下。
// 序盤(手札>半分)は上の速さのまま、終盤に向けて下記 EXTRA を最大まで線形に加算する。
const CURSOR_STEP_LATE_EXTRA = 360 // 終盤までにカーソル間隔へ最大 +360ms（→約620ms）
const CPU_THINK_LATE_EXTRA = 900 // 終盤までに思考間へ最大 +900ms（→約2000ms）
const PAIR_BLINK_MS = 1300 // ペアが揃ったときの点滅時間
const PICK_ANIM_MS = 300 // 引いたカードが上へ抜けるアニメ（YOUがCPUから引く）
const PULL_ANIM_MS = 280 // 引かれるカードが上へ抜けるアニメ（CPUがYOUから引く）
// ターン制の「間」を作る（速すぎて操作・状況把握できない対策）。
const POST_DISCARD_MS = 1100 // 初期ペア除去が終わってから最初のCPUが動くまでの間
const POST_CPU_MS = 800 // CPUが1枚引いた結果（捨て札など）を見せてから次へ進む間
const PLAYER_REVEAL_MS = 950 // YOUが引いたカードを「何を引いたか」見せる間
const POST_RESULT_MS = 700 // 揃った/揃わなかった結果を見せてから次のモーダルを出すまでの間

const CARD_W = 128
const CARD_H = 179
const SIDE_AVAIL_H = 380

// BET 機能（POKER/CASINO WAR と共通の共有部品を利用）。文言は shared-chrome-text から取得。
const OM_GAME_ID = 'old-maid'
const OM_MIN_BET = 1 // POKER と同一の最小BET
// 順位ごとの倍率（ハードコード）: 1位×2.0 / 2位×1.5 / 3位×0.5 / 4位×0。index = rank-1。
const OM_RANK_MULTIPLIER = [2.0, 1.5, 0.5, 0]

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
  you: { ja: 'あなた', en: 'YOU', zh: '你' },
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
  @state() private phase: 'bet' | 'parent' | 'arrange' | 'discarding' | 'opening' | 'player' | 'cpuPause' | 'cpu' | 'over' = 'bet'
  @state() private message = ''
  @state() private activePanel: 'settings' | 'guide' | null = null
  @state() private selectedLanguage: AppLanguage = 'en'
  @state() private isSoundEnabled = true
  @state() private isBgmEnabled = false
  @state() private soundHelpOpen = false
  @state() private confirmHomeOpen = false
  // ガイドは他ゲームと同じく config の overview_info から読む（メニューのガイドと同一ソース）。
  @state() private appConfig: AppConfigRoot | null = null

  // ── BET 状態 ───────────────────────────────────────────
  @state() private coin = 100
  @state() private currentBet = OM_MIN_BET
  @state() private isCoinRecoveryDialogOpen = false
  private pendingStake = 0          // 精算前にゲーム中保持している BET（途中終了で返還）
  private betSettled = false        // 順位確定の精算済みフラグ（二重精算防止）
  private lastPayout = 0            // 直近の精算で得た COIN（結果表示用）
  private coinRecoveryTimerId: number | null = null

  // 演出用 state
  @state() private cursorSeat: Seat | null = null
  @state() private cursorIndex = 0
  @state() private blinkCards = new Set<OMCard>()
  @state() private blinkOn = false
  @state() private pickIndex: number | null = null
  // 裏返し（引きファン）を出すのは「YOUがCPUから引く＝自分が札を選んでいる間」だけ。
  // 引かれる時・引いた後の演出中は出さない（意味不明な裏返しの登場を防ぐ）。
  @state() private fanArmed = false
  // 引き札のドラッグ/スワイプ（タップ不発対策＋「引き上げて切る」操作）。
  @state() private dragIndex: number | null = null // ドラッグ中の引き札 index
  @state() private dragDy = 0                       // 上方向の引き上げ量（論理px）
  private dragStartY = 0
  @state() private pulledIndex: number | null = null // CPUがYOUから抜く手札のindex（上へ抜くアニメ）
  @state() private lastDrawnCard: OMCard | null = null // YOUが直前に引いたカード（強調表示）
  @state() private pendingCpuTarget: Seat | null = null
  // 矢印（カーソル）が動いている間、引いている人の席アイコンを光らせる。
  @state() private activeDrawSeat: Seat | null = null
  private busy = false
  private cursorTimer: number | null = null
  private blinkTimer: number | null = null
  // ゲーム進行度（カーソル減速）の基準＝整理後のプレイヤー初期手札枚数。
  private playerInitialHand = 0

  // ── 広告 ─────────────────────────────────────────────────────────
  // Player の手札が初めて3枚以下になった時点で1回だけ表示。WEB=モック / Android=実広告。
  @state() private adMockOpen = false
  // オフライン（Android・機内モード等）で広告タイミングに達した時の警告（遊び続けさせない）。
  @state() private isOfflineAdWarningOpen = false
  @state() private adMockCount = 0
  private adShownThisGame = false
  // 配り直後（初手で手札が既に3枚以下）に出ないよう、プレイヤーが1回引いてから許可する。
  private playerHasActed = false

  @query('game-feedback') private feedbackEl?: GameFeedback

  static styles = [
    sharedGameHostStyles,
    sharedGameStageStyles,
    sharedOverlayStyles,
    sharedBetStatusStyles,
    sharedCoinRecoveryStyles,
    utilities,
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
        position: relative;
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
      /* position:relative + 上段の高さ確保で、CPU2 上がり時の順位バッジ(1st 等)を
         .play 中央ではなく「上段の中央」に出す（空席でも席の位置を保つ）。 */
      .area-top {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: ${CARD_H}px;
        padding-top: 4px;
      }
      /* どのカードから引くか等のメッセージ（専用バンド＝必ず最前面で読めるように） */
      .msg-band {
        position: relative;
        z-index: 12;
        min-height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: 23px;
        font-weight: 800;
        padding: 2px 12px;
      }
      /* 文字がカード地（白/赤/黒）と同化しないよう、テキスト背面に半透明の帯を敷く。 */
      .msg-pill {
        display: inline-block;
        max-width: 100%;
        color: #fff;
        background: rgba(0, 0, 0, 0.62);
        padding: 4px 16px;
        border-radius: 14px;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
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
      /* 中央列は空のスペーサ（捨て札は .play 直下の固定絶対配置に分離）。 */
      .center {
        position: relative;
        min-height: 0;
      }
      /* 捨て札の山＝対局エリアの縦中央に「固定」配置。手札増減でズレず（グリッド非依存）、
         上のCPU列とは重ならない。メッセージ(.msg-band)は z-index で常に前面なので
         捨て札がメッセージの背面に来ても文字は読める。 */
      .discard-pile {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 170px;
        height: 132px;
        z-index: 4;
        pointer-events: none;
        transition: opacity 0.25s ease;
      }
      /* プレイヤーが引くターンだけ、引きファン/メッセージの邪魔をしないよう極薄に。 */
      .discard-pile.is-faint {
        opacity: 0.12;
      }
      .discard-pair {
        position: absolute;
        left: 50%;
        top: 50%;
        margin: -44px 0 0 -50px;
      }
      /* 他のカードと同様、矩形 box-shadow ではなくカード形状に追従する drop-shadow を使う
         （透明余白＋焼き込み角丸の画像に box-shadow を付けると四角い枠がダブって見えるため）。 */
      .discard-pair img {
        width: 62px;
        height: 87px;
        object-fit: contain;
        /* カード自体は不透明（半透明だと重なった下のカードが透けて変に見える）。
           薄くするのはプレイヤーの引きターンだけ＝山ごと .discard-pile.is-faint で行う。 */
        filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.45));
      }
      .discard-pair .d2 {
        position: absolute;
        left: 36px;
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
        cursor: grab;
        /* タッチで「引き上げる」ドラッグ中にスクロール/選択が起きないように。 */
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        transition: transform ${PICK_ANIM_MS}ms ease, opacity ${PICK_ANIM_MS}ms ease;
      }
      .fan img:hover {
        transform: translateY(-16px);
        z-index: 20;
      }
      /* ドラッグ中の札：指/カーソルに即追従させるため transition を切る（translateY はインライン）。 */
      .fan img.dragging {
        transition: none;
        opacity: 1;
        cursor: grabbing;
        filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.6));
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
      /* YOUが直前に引いたカードを強調（何を引いたか分かるように）。
         上下に動くと「ブレ」に見えるので縦移動はせず、発光＋わずかな拡大のみ
         （カードを上へ抜く動きは引きファン/抜かれカード側で行う）。 */
      .area-hand .row img.just-drawn {
        filter: drop-shadow(0 0 6px #ffd479) drop-shadow(0 0 12px #ffd479) brightness(1.12);
        transform: scale(1.07);
        z-index: 13;
      }
      /* CPUがYOUから抜くカード＝スッと上へ持ち上げて抜く（単一の上方向・下がらない）。 */
      .area-hand .row img.pulling {
        transition: transform ${PULL_ANIM_MS}ms ease, opacity ${PULL_ANIM_MS}ms ease;
        transform: translateY(-150px) scale(1.05);
        opacity: 0;
        z-index: 14;
      }
      /* 「親を決めます」前に各席を示すシルエット＋名前（ゲーム開始で消える）。
         中央モーダルに被らないよう CPU2=上 / CPU1・CPU3=モーダル下の左右に固定。 */
      /* ゲーム自身のダイアログ（親決め/整理/CPUポーズ）は盤面を暗幕で覆わず半透明にして、
         下の席アバター・カードを透かす（手本準拠）。設定/ガイド等の chrome モーダルは従来の暗幕のまま。 */
      .overlay.see-through { background: transparent; }
      .modal.see-through { background: rgba(8, 20, 22, 0.66); }
      /* 盤面層のマーカー（モーダルより下＝半透明ダイアログ越しに透ける）。.play 基準。 */
      .seat-avatars {
        position: absolute;
        inset: 0;
        z-index: 15;
        pointer-events: none;
      }
      .seat-avatar {
        position: absolute;
        transform: translate(-50%, -50%);
      }
      .seat-avatar img {
        object-fit: contain;
        border-radius: 8px;
        filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.8));
      }
      /* 矢印（カーソル）が動いている間、引いている本人の席アイコンを光らせる。 */
      .seat-avatar.glow img {
        animation: seatGlow 0.85s ease-in-out infinite;
      }
      @keyframes seatGlow {
        0%,
        100% {
          filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 5px #ffd479);
        }
        50% {
          filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 18px #ffd479)
            drop-shadow(0 0 26px #ffb800) brightness(1.18);
        }
      }
      /* 親決め(big)=大きめ、対局中(small)=小さめで邪魔しない。 */
      .seat-avatars.is-big .seat-avatar img { width: 96px; height: 96px; }
      .seat-avatars.is-small .seat-avatar img { width: 48px; height: 48px; }
      /* 席配置（右回り・固定 / .play 基準）: 上=CPU2 / 左=CPU3 / 右=CPU1 / 下=YOU。 */
      .seat-avatar.a-top { top: 13%; left: 50%; }
      .seat-avatar.a-left { top: 45%; left: 13%; }
      .seat-avatar.a-right { top: 45%; left: 87%; }
      .seat-avatar.a-bottom { top: 90%; left: 50%; }
      /* 対局中は手札やカードに被りにくいよう端へ寄せる。 */
      .seat-avatars.is-small .seat-avatar.a-left { left: 8%; }
      .seat-avatars.is-small .seat-avatar.a-right { left: 92%; }
      .seat-avatars.is-small .seat-avatar.a-bottom { top: 92%; left: 8%; }
      /* 終了画面: 4席のアバター（名前焼き込み）＋順位を必ず見えるように表示。
         中央のリプレイダイアログに被らない位置へ（CPU3/CPU1 は上寄りに退避）。 */
      .seat-avatars.is-result .seat-avatar img { width: 76px; height: 76px; }
      .seat-avatars.is-result .seat-avatar.a-top { top: 11%; left: 50%; }
      .seat-avatars.is-result .seat-avatar.a-left { top: 28%; left: 16%; }
      .seat-avatars.is-result .seat-avatar.a-right { top: 28%; left: 84%; }
      .seat-avatars.is-result .seat-avatar.a-bottom { top: 88%; left: 50%; }
      /* 各アバター直下に「大きく」順位を出す（スマホでも豆粒にならないよう特大＋縁取り）。
         別レイヤの .rank ではなくアバターの一部なので、アイコンの背面に隠れない。 */
      .seat-rank {
        margin-top: 1px;
        text-align: center;
        font-size: 38px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: 0.01em;
        text-shadow: 0 2px 4px #000, 0 0 7px rgba(0, 0, 0, 0.95);
        -webkit-text-stroke: 1.2px rgba(0, 0, 0, 0.6);
      }
      /* 終了画面はアバターも大きいので順位も特大に。 */
      .seat-avatars.is-result .seat-rank { font-size: 50px; }
      .seat-rank.r1 { color: #ffd479; }
      .seat-rank.r2 { color: #9ad0ff; }
      .seat-rank.r3 { color: #ffb27a; }
      .seat-rank.r4 { color: #ff7a7a; }
      /* 「右回り（左の人から引きます）」ヒスト＝ダイアログ下・YOU の上。 */
      .clockwise-hint {
        position: absolute;
        top: 70%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 92%;
        text-align: center;
        font-size: 17px;
        font-weight: 800;
        color: #ffe7a0;
        text-shadow: 0 2px 5px rgba(0, 0, 0, 0.9);
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
    void this.loadConfig()
    this.coin = ensurePlayableSharedCoin()
    // リロード/異常終了で残った BET を一度だけ返還（途中終了時返還の復帰側）。
    this.restoreCoinFromPendingStakeIfNeeded()
    this.newGame()
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.updateScale)
    this.stopCursor()
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer)
    this.clearCoinRecoveryTimer()
    // 順位確定前に盤面が外れた（ホーム/別画面移動）場合は BET を返還。精算済みなら pendingStake=0。
    this.refundPendingStakeIfNeeded()
    super.disconnectedCallback()
  }

  private restoreCoinFromPendingStakeIfNeeded(): void {
    const pending = takePendingStake(OM_GAME_ID)
    if (pending <= 0) return
    this.pendingStake = 0
    this.coin = saveSharedCoin(this.coin + pending)
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
  // メニューのガイドと同一ソース（config overview_info）。ハードコードしない＝共通方式。
  private async loadConfig(): Promise<void> {
    try {
      this.appConfig = await loadAppConfig('old-maid')
      this.bump()
    } catch {
      /* config 取得失敗時はガイド無し（落とさない） */
    }
  }
  private guideLines(): string[] {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.selectedLanguage) : undefined
    const content = getLocalizedString(block?.overview_info, 'guide_content')
    return splitTextLines(content).filter((line) => line.length > 0)
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
  // START/クイックスタート → SELECT BET モーダル → BET確定 → 「親を決めます」→ … の順。
  // 親決め前に BET を確定させるため、newGame は phase='bet' で開始し BET モーダルを出す。
  private newGame(): void {
    this.engine.start()
    this.phase = 'bet'
    this.message = ''
    this.cursorSeat = null
    this.blinkCards = new Set()
    this.pickIndex = null
    this.fanArmed = false
    this.pulledIndex = null
    this.pendingCpuTarget = null
    this.activeDrawSeat = null
    this.adMockOpen = false
    this.adShownThisGame = false
    this.playerHasActed = false
    this.playerInitialHand = 0
    this.activePanel = null
    this.busy = false
    this.stopCursor()
    this.coin = ensurePlayableSharedCoin()
    if (this.currentBet < OM_MIN_BET) this.currentBet = OM_MIN_BET
    if (this.currentBet > this.coin) this.currentBet = this.coin
    this.bump()
  }

  // ── BET ───────────────────────────────────────────────
  private decreaseBet(): void {
    if (this.currentBet > OM_MIN_BET) this.currentBet = Math.max(OM_MIN_BET, this.currentBet - 1)
  }
  private increaseBet(): void {
    if (this.currentBet < this.coin) this.currentBet = Math.min(this.coin, this.currentBet + 1)
  }
  private onBetValueChange(e: CustomEvent<{ value: number }>): void {
    this.currentBet = Math.max(OM_MIN_BET, Math.min(this.coin, Math.floor(e.detail.value)))
  }

  // BET 確定: COIN を差し引き、pendingStake を保存して「親を決めます」へ。
  private confirmBet(): void {
    if (this.coin < OM_MIN_BET || this.currentBet < OM_MIN_BET || this.currentBet > this.coin) return
    this.playSound('submit_btn')
    this.coin = saveSharedCoin(this.coin - this.currentBet)
    this.pendingStake = this.currentBet
    savePendingStake(OM_GAME_ID, this.currentBet)
    this.betSettled = false
    this.lastPayout = 0
    this.phase = 'parent'
    this.playSound('start')
    this.bump()
  }

  // 順位確定時の精算（1位×2.0 / 2位×1.5 / 3位×0.5 / 4位×0）。二重精算しない。
  private settleBet(): void {
    if (this.betSettled) return
    this.betSettled = true
    const rank = this.rankOf('player') // 1..4
    const mult = OM_RANK_MULTIPLIER[rank - 1] ?? 0
    this.lastPayout = Math.floor(this.currentBet * mult)
    this.coin = saveSharedCoin(this.coin + this.lastPayout)
    this.pendingStake = 0
    clearPendingStake(OM_GAME_ID)
    this.scheduleCoinRecoveryDialogIfZero()
  }

  // 途中終了時の BET 返還（pendingStake>0 のときのみ。一度だけ）。
  private refundPendingStakeIfNeeded(): void {
    if (this.pendingStake <= 0) { clearPendingStake(OM_GAME_ID); return }
    this.coin = saveSharedCoin(this.coin + this.pendingStake)
    this.pendingStake = 0
    clearPendingStake(OM_GAME_ID)
  }

  // ── COIN 補充（CASINO WAR と同方式）─────────────────────
  private confirmCoinRecovery(): void {
    this.playSound('submit_btn')
    this.clearCoinRecoveryTimer()
    this.coin = recoverSharedCoin()
    this.isCoinRecoveryDialogOpen = false
    window.setTimeout(() => {
      const bridge = getAndroidBillingBridge()
      bridge?.showRecoveryInterstitialAd?.() ?? bridge?.showInterstitialAd?.()
    }, 0)
  }
  private clearCoinRecoveryTimer(): void {
    if (this.coinRecoveryTimerId !== null) { clearTimeout(this.coinRecoveryTimerId); this.coinRecoveryTimerId = null }
  }
  private scheduleCoinRecoveryDialogIfZero(): void {
    this.clearCoinRecoveryTimer()
    this.coinRecoveryTimerId = scheduleCoinRecoveryDialogIfZero({
      coin: this.coin,
      setOpen: (open) => { this.isCoinRecoveryDialogOpen = open },
      schedule: (cb, delayMs) => window.setTimeout(() => { this.coinRecoveryTimerId = null; cb() }, delayMs)
    })
  }

  // 親決め OK → 親発表（arrange）
  private onParentOk(): void {
    this.playSound('submit_btn')
    this.phase = 'arrange'
    this.message = (this.tt('parentIs') as (n: string) => string)(this.label(this.engine.parent))
    this.bump()
  }

  // ペア除去 OK → 初期ペアを「2枚ずつ中央へ」捨てる演出 → 親から開始CPU引き
  private async onArrangeOk(): Promise<void> {
    this.playSound('deal_cards_btn')
    const before = this.engine.finished.length
    // ダイアログを閉じ、座席アバターも消す（= ゲーム開始）。
    this.phase = 'discarding'
    this.message = this.tt('removePairs') as string
    this.bump()
    await delay(350)
    // 各席から1ペアずつ順に（席を巡回して）まばらに中央へ捨てていく。
    let removedAny = true
    while (removedAny) {
      removedAny = false
      for (const seat of SEATS) {
        if (this.engine.removeOnePair(seat)) {
          removedAny = true
          this.playSound('deal_cards_btn')
          this.bump()
          await delay(240)
        }
      }
    }
    this.afterFinishedChange(before)
    // 進行度（カーソル減速）の基準＝整理後のプレイヤー手札枚数を記録。
    this.playerInitialHand = this.engine.hands.player.length
    this.message = ''
    this.bump()
    // 初期整理が終わってから、最初のCPUが動くまで「間」を置く（即開始で速すぎる対策）。
    await delay(POST_DISCARD_MS)
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
    // 自分が札を選んでいる間だけ裏返しの引きファンを出す。
    this.fanArmed = true
    this.message = (this.tt('drawFrom') as (n: string) => string)(this.label(src))
    this.bump()
    // 元 Android と同じく、プレイヤーの手番に移った所で手札4枚以下なら広告（1ゲーム1回）。
    // この時点はプレイヤー入力待ち＝アニメと競合しない自然な間。
    this.maybeShowHandCountAd()
  }

  // ステージは --game-scale で拡縮されるため、画面pxの移動量を論理pxに戻す係数。
  private get stageScale(): number {
    const v = parseFloat(getComputedStyle(this).getPropertyValue('--game-scale'))
    return v > 0 ? v : 1
  }

  // 引き札を掴む（pointerdown）。以後ドラッグで引き上げる。タップ不発・重なりで押しにくい問題の対策。
  private onFanDown(e: PointerEvent, i: number): void {
    if (this.phase !== 'player' || this.busy) return
    this.dragIndex = i
    this.dragStartY = e.clientY
    this.dragDy = 0
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
    e.preventDefault()
  }

  // 上へドラッグした分だけ札を持ち上げる（指/カーソルに追従。--game-scale 補正）。
  private onFanMove(e: PointerEvent): void {
    if (this.dragIndex === null) return
    this.dragDy = Math.max(0, (this.dragStartY - e.clientY) / this.stageScale)
    this.bump()
  }

  // 離した時：十分引き上げた or 単なるタップ → その札を引く。中途半端ならスナップで戻す。
  private async onFanUp(_e: PointerEvent, i: number): Promise<void> {
    if (this.dragIndex === null) return
    const dy = this.dragDy
    this.dragIndex = null
    this.dragDy = 0
    this.bump()
    if (dy >= 56 || dy < 12) await this.onPlayerPick(i) // 引き上げ（スワイプ）or タップで引く
  }

  private onFanCancel(): void {
    this.dragIndex = null
    this.dragDy = 0
    this.bump()
  }

  // プレイヤーが引きファンの1枚を引く（ドラッグ/スワイプ or タップ）
  private async onPlayerPick(index: number): Promise<void> {
    if (this.phase !== 'player' || this.busy) return
    const source = this.engine.drawSource('player')
    if (!source) return
    this.busy = true
    // プレイヤーが1回引いた＝以後は広告許可（配り直後の初手では出さない）。
    this.playerHasActed = true
    // 札を引いた＝もう選択中ではない。以後（reveal/結果表示中）は裏返しを出さない。
    this.fanArmed = false
    // 引くアクション（カードが浮いて消える）
    this.pickIndex = index
    this.bump()
    await delay(PICK_ANIM_MS)
    this.pickIndex = null
    const card = this.engine.draw('player', source, index)
    // まず「何を引いたか」を強調表示して見せる（揃ったか確認する前に把握できるように）。
    this.lastDrawnCard = card
    this.message = ''
    this.bump()
    await delay(PLAYER_REVEAL_MS)
    // 引いたカードでペアができたら点滅 → 除去（揃ったら止めて見せるロジックは維持）。
    await this.resolvePlayerPairs(card)
    this.lastDrawnCard = null
    this.bump()
    // 結果（揃った/揃わなかった）を見せてから次のモーダルを出す。
    await delay(POST_RESULT_MS)
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
    // 矢印が動いている間、引いている本人（seat）の席アイコンを光らせる。
    this.activeDrawSeat = seat
    this.bump()
    await delay(this.thinkMs())
    this.stopCursor()
    const idx = this.cursorIndex < srcLen ? this.cursorIndex : Math.floor(Math.random() * srcLen)
    // 引かれるのがYOUの手札なら、その1枚をスッと上へ持ち上げてから抜く（上下にぶれない単一の上方向）。
    if (source === 'player') {
      this.pulledIndex = idx
      this.bump()
      await delay(PULL_ANIM_MS)
    }
    const drawn = this.engine.draw(seat, source, idx)
    this.pulledIndex = null
    const before = this.engine.finished.length
    this.engine.removePairs(seat)
    if (drawn && this.engine.finished.length === before) this.playSound('card_draw')
    this.cursorSeat = null
    this.afterFinishedChange(before)
    this.message = ''
    this.bump()
    // 1人引くごとに結果（捨て札の増減など）を見せる「間」を置く。
    await delay(POST_CPU_MS)
  }

  private startCursor(seat: Seat, count: number): void {
    this.stopCursor()
    this.cursorSeat = seat
    this.cursorIndex = count > 1 ? Math.floor(Math.random() * count) : 0
    let dir = Math.random() < 0.5 ? 1 : -1
    if (count <= 1) return
    // 後半ほど間隔を広げる（迷い）。間隔は走査開始時の進行度で決める。
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
    }, this.cursorStepMs())
  }
  private stopCursor(): void {
    if (this.cursorTimer) {
      window.clearInterval(this.cursorTimer)
      this.cursorTimer = null
    }
    // 矢印が止まったら席アイコンの発光も消す（光るのは矢印が動いている間だけ）。
    this.activeDrawSeat = null
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
      this.settleBet() // 順位確定 → BET×順位倍率で精算
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
  // 親決め前（BET選択・親決めダイアログ）はカードを一切見せない（手本準拠）。
  private get cardsHidden(): boolean {
    return this.phase === 'bet' || this.phase === 'parent'
  }
  // ゲーム自身のダイアログ（親決め/整理/CPUポーズ）が開いている間は、ダイアログが
  // 主文言を持つので盤面の .msg-band は出さない（同じ文言が2箇所に出て重なるのを防ぐ）。
  private get dialogOpen(): boolean {
    return this.phase === 'parent' || this.phase === 'arrange' || this.phase === 'cpuPause'
  }

  // ── CPU の「迷い」（後半ほど矢印を遅く・思考を長く）─────────────────────
  // 進行度 0(序盤)〜1(終盤)。Player 手札が初期の半分以下から効き始め、少ないほど大きい。
  // 基準は元 Android の広告ポイント（手札が半分→4枚以下）に合わせる。
  private lateFactor(): number {
    const init = this.playerInitialHand > 0 ? this.playerInitialHand : 13
    const ph = this.engine.hands.player.length
    const half = init / 2
    if (ph >= half) return 0
    return Math.max(0, Math.min(1, (half - ph) / half))
  }
  private cursorStepMs(): number {
    return Math.round(CURSOR_STEP_MS + this.lateFactor() * CURSOR_STEP_LATE_EXTRA)
  }
  private thinkMs(): number {
    return Math.round(CPU_THINK_MS + this.lateFactor() * CPU_THINK_LATE_EXTRA)
  }

  // 広告タイミング（元 Android simple_old_maid の _maybeShowHandCountAd ベース、しきい値はユーザー調整）:
  // Player の手札が初めて「3枚以下（空でない）」になった時点で1回だけ広告。
  // （4枚だと配り直後に出てしまうため 3 に下げる。old-maid 独自カウント＝共通カウントは増やさない）。
  // WEB=共通モック(ad-mock-dialog) / Android アプリ=ブリッジ経由で実インタースティシャル。
  private maybeShowHandCountAd(): void {
    if (this.adShownThisGame) return
    // 配り直後（プレイヤー未行動）は出さない＝「配れた瞬間」を防ぐ。
    if (!this.playerHasActed) return
    const ph = this.engine.hands.player.length
    if (ph === 0 || ph > 3) return
    this.adShownThisGame = true
    if (isAndroidApp()) {
      // オフライン（機内モード等）は実広告を出せない＝Remove Ads 未購入なら遊び続けさせない。
      // 統一文言で警告し、メニューへ戻す（手本: highandlow onOfflineAdBlocked / native OLD MAID）。
      if (isOfflineForAd()) {
        this.isOfflineAdWarningOpen = true
        this.bump()
        return
      }
      getAndroidBillingBridge()?.showInterstitialAd?.()
      return
    }
    const { count } = countGameForAd(OLD_MAID_WEB_AD_COUNT_KEY)
    this.adMockCount = count
    this.adMockOpen = true
    this.bump()
  }
  private onAdMockClose(): void {
    this.playSound('submit_btn')
    this.adMockOpen = false
    this.bump()
  }

  // ── 描画 ──
  // プレイヤーの番に「引く相手」＝動的に決まる（CPU3が上がってたら手前のCPU2/CPU1）。
  private get drawSourceSeat(): Seat | null {
    return this.phase === 'player' ? this.engine.drawSource('player') : null
  }

  // 「親を決めます」前の卓だけ、各 CPU 席の位置が分かるようシルエット＋名前を出す。
  // どの席が CPU1/CPU2/CPU3/YOU かを「常に」識別できるよう、名前焼き込み済みのアバター画像を
  // 各席に最前面マーカーとして出す（席=固定: 上CPU2 / 左CPU3 / 右CPU1 / 下YOU）。
  // 親決め(parent)は大きめ＋右回りヒント、カード対局中(arrange以降)は小さめで邪魔しない。
  // BET 選択中のみ非表示。stage 末尾でダイアログの暗幕より上に描く（暗くて見えない問題の解消）。
  private renderSeatAvatars(): TemplateResult | typeof nothing {
    // BET選択中は非表示。終了(over)は「誰が何位か」を必ず見せるため、各席アバター＋順位を出す。
    if (this.phase === 'bet') return nothing
    // 設定/ガイド/確認/コイン補充などの chrome モーダルが開いている間は、最前面マーカーを隠す
    // （モーダルに被ると操作・表示がおかしくなるため）。ゲーム自身のダイアログ(親決め等)では出す。
    if (this.activePanel !== null || this.confirmHomeOpen || this.isCoinRecoveryDialogOpen) return nothing
    const big = this.phase === 'parent'
    const atOver = this.phase === 'over'
    const avatar = (seat: Seat, cls: string) => {
      const file = seat === 'player' ? 'you' : seat
      // 矢印が動いている間、引いている本人の席アイコンを光らせる。
      const glow = seat === this.activeDrawSeat ? ' glow' : ''
      // 順位は「アバターの一部」として出す（別レイヤの .rank はアイコンの背面に隠れるため）。
      // 上がった席は対局中も表示、終了時は全席（最下位=ババ持ちも 4th）表示。
      const showRank = atOver || this.engine.finished.includes(seat)
      const r = this.rankOf(seat)
      return html`<div class="seat-avatar ${cls}${glow}">
        <img src=${this.assetUrl(`old-maid/images/${file}.webp`)} alt=${this.label(seat)} />
        ${showRank ? html`<div class="seat-rank r${r}">${this.rankText(seat)}</div>` : nothing}
      </div>`
    }
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.selectedLanguage) : undefined
    const hint = big ? getLocalizedString(block?.game, 'old_maid_clockwise') : ''
    const sizeClass = big ? 'is-big' : atOver ? 'is-result' : 'is-small'
    return html`<div class="seat-avatars ${sizeClass}">
      ${avatar('cpu2', 'a-top')}${avatar('cpu3', 'a-left')}${avatar('cpu1', 'a-right')}${avatar('player', 'a-bottom')}
      ${hint ? html`<div class="clockwise-hint">${hint}</div>` : nothing}
    </div>`
  }

  private renderTopRow(seat: Seat): TemplateResult {
    const n = this.engine.hands[seat].length
    const finished = this.engine.finished.includes(seat)
    if (n === 0) {
      // 順位はアバター側(renderSeatAvatars)に出す（別レイヤの .rank はアイコン背面に隠れるため）。
      return html`<div class="area-top"></div>`
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
        </div>
      </div>
    `
  }

  private renderSideCol(seat: Seat, side: 'left' | 'right'): TemplateResult {
    const n = this.engine.hands[seat].length
    if (n === 0) {
      return html`<div class="col-${side}"></div>`
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
        </div>
      </div>
    `
  }

  private renderDiscard(): TemplateResult {
    const d = this.engine.discarded
    // 捨て札は「上に何か乗っている時」は薄くする（半透明モーダル/ダイアログ越しに捨て札が
    // 透けて文字が読みにくくなるのを防ぐ）。対象: プレイヤーの引き番・終了画面・各ダイアログ・
    // 設定/ガイド/確認/コイン補充モーダル。
    const overlaid =
      this.phase === 'player' ||
      this.phase === 'over' ||
      this.dialogOpen ||
      this.activePanel !== null ||
      this.confirmHomeOpen ||
      this.isCoinRecoveryDialogOpen
    const faint = overlaid ? 'is-faint' : ''
    if (d.length === 0) return html`<div class="discard-pile ${faint}"></div>`
    const pairs = Math.floor(d.length / 2)
    return html`
      <div class="discard-pile ${faint}">
        ${Array.from({ length: pairs }).map((_, i) => {
          const c1 = d[i * 2]
          const c2 = d[i * 2 + 1]
          const seed = (i * 2654435761) >>> 0
          const ox = ((seed % 100) / 100) * 56 - 28
          const oy = (((seed >> 8) % 100) / 100) * 40 - 20
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
    // 裏返し（引きファン）を出すのは「YOUがCPUから引く＝自分が札を選んでいる間」だけ（fanArmed）。
    // pickIndex 中は引いた札を上へ抜くアニメのため残す。引かれる時・引いた後の演出中・CPU手番では出さない
    //（意味不明な裏返しの登場／戻りトランジションのブレを防ぐ）。
    if (!this.fanArmed && this.pickIndex === null) return html`<div class="area-fan"></div>`
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
                class=${this.pickIndex === i ? 'picking' : (this.dragIndex === i ? 'dragging' : '')}
                src=${this.backUrl()}
                alt="draw"
                style="left:${i * spacing}px${this.dragIndex === i ? `;transform:translateY(${-this.dragDy}px);z-index:60` : ''}"
                @pointerdown=${(e: PointerEvent) => this.onFanDown(e, i)}
                @pointermove=${(e: PointerEvent) => this.onFanMove(e)}
                @pointerup=${(e: PointerEvent) => void this.onFanUp(e, i)}
                @pointercancel=${() => this.onFanCancel()}
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
      // 順位はアバター側(renderSeatAvatars)に出す。
      return html`<div class="area-hand"></div>`
    }
    const avail = STAGE_WIDTH * 0.9
    const spacing = calcSpacing(hand.length, CARD_W, avail, 0.42)
    const total = CARD_W + (hand.length - 1) * spacing
    return html`
      <div class="area-hand">
        <div class="row" style="width:${total}px">
          ${repeat(
            hand,
            (c) => c, // カード実体でキー付け＝抜いた札の img が隣のカードに再利用されない
            // （位置キーだと .pulling の img が隣へ再利用され、translateY が戻って下へブレる）。
            (c, i) => {
              const isPulling = this.pulledIndex === i
              const isBlink = this.blinkCards.has(c)
              const isDrawn = this.lastDrawnCard === c && !isBlink
              const cls = isPulling
                ? 'pulling'
                : isBlink
                  ? this.blinkOn
                    ? 'blink'
                    : 'blink-off'
                  : isDrawn
                    ? 'just-drawn'
                    : ''
              return html`<img class=${cls} src=${this.cardUrl(c)} alt="card" style="left:${i * spacing}px" loading="lazy" />`
            },
          )}
          ${cursorHere
            ? html`<div class="cursor" style="left:${this.cursorIndex * spacing + CARD_W / 2 - 13}px; top:-20px"></div>`
            : nothing}
        </div>
      </div>
    `
  }

  // 終了画面: 手本準拠で4席に順位を残したまま、共有ダイアログで「ゲーム終了。もう一度遊びますか？」。
  // 文言は config（game.old_maid_*）＋共有 chrome から。独自オーバーレイ/ハードコードはしない。
  private renderResult(): TemplateResult {
    const block = this.appConfig ? getLanguageBlock(this.appConfig, this.selectedLanguage) : undefined
    const chrome = getSharedChromeText(this.selectedLanguage)
    const message = getLocalizedString(block?.game, 'old_maid_game_over_message')
    const quit = getLocalizedString(block?.game, 'old_maid_replay_quit')
    // 全モーダル統一: overlay/modal とも see-through（暗幕で全消ししない＝盤面の順位アバターが透ける）。
    return html`
      <section class="overlay see-through">
        <div class="modal see-through">
          <confirm-dialog-panel
            .message=${message}
            .okLabel=${chrome.ok}
            .cancelLabel=${quit}
            @confirm-accept=${() => this.newGame()}
            @confirm-cancel=${() => this.goHome()}
          ></confirm-dialog-panel>
        </div>
      </section>
    `
  }

  private renderDialog(): TemplateResult | typeof nothing {
    // ゲーム自身のダイアログは半透明(see-through)＝下の席アバター/カードを透かす（手本準拠）。
    if (this.phase === 'parent') {
      return html`<section class="overlay see-through"><div class="modal dialog see-through">
        <p>${this.tt('parent')}</p>
        <div class="btn-row"><button class="btn classic-btn" @click=${() => this.onParentOk()}>${this.tt('ok')}</button></div>
      </div></section>`
    }
    if (this.phase === 'arrange') {
      return html`<section class="overlay see-through"><div class="modal dialog see-through">
        <p>${(this.tt('parentIs') as (n: string) => string)(this.label(this.engine.parent))}</p>
        <p>${this.tt('removePairs')}</p>
        <div class="btn-row"><button class="btn classic-btn" @click=${() => void this.onArrangeOk()}>${this.tt('ok')}</button></div>
      </div></section>`
    }
    if (this.phase === 'cpuPause' && this.pendingCpuTarget) {
      return html`<section class="overlay see-through"><div class="modal dialog see-through">
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
                .coin=${this.coin}
                @header-home=${() => this.requestHome()}
                @header-settings=${() => (this.activePanel = 'settings')}
                @header-guide=${() => (this.activePanel = 'guide')}
              ></game-top-header>
              <!-- 他ゲームと表示位置を揃えたツールバー直下の COIN/BET 行。 -->
              <header class="bet-status">${coinIcon()} COIN ${this.coin} / BET ${this.currentBet}</header>
            </section>

            <div class="play">
              ${this.cardsHidden ? nothing : this.renderTopRow('cpu2')}
              <div class="mid">
                ${this.cardsHidden ? html`<div class="col-left"></div>` : this.renderSideCol('cpu3', 'left')}
                <div class="center"></div>
                ${this.cardsHidden ? html`<div class="col-right"></div>` : this.renderSideCol('cpu1', 'right')}
              </div>
              <div class="msg-band">${!this.dialogOpen && this.message ? html`<span class="msg-pill">${this.message}</span>` : nothing}</div>
              ${this.cardsHidden ? nothing : this.renderFan()}
              ${this.cardsHidden ? nothing : this.renderHand()}
              <!-- 捨て札は手札の増減でガクンと動かないよう、グリッドではなく固定の絶対位置に置く。 -->
              ${this.renderDiscard()}
              <!-- 席マーカー（CPU1/2/3/YOU）は盤面層＝モーダルより下。ゲームダイアログは半透明にして透かす。 -->
              ${this.renderSeatAvatars()}
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

          <!-- WEB の広告モック（元 Android の手札4枚以下タイミング・共通の ad-mock-dialog）。 -->
          ${this.adMockOpen
            ? html`<ad-mock-dialog
                .count=${this.adMockCount}
                .okLabel=${chrome.ok}
                @ad-mock-close=${() => this.onAdMockClose()}
              ></ad-mock-dialog>`
            : nothing}

          <!-- SELECT BET モーダル（親決め前に表示）。確定で親決めへ、キャンセルでホーム。 -->
          ${this.phase === 'bet'
            ? html`<section class="overlay bet-overlay">
                <bet-selector-panel
                  title="Select BET"
                  available-label="COIN:"
                  .availableCoin=${this.coin}
                  .bet=${this.currentBet}
                  start-label="START"
                  .instructionText=${chrome.betInstruction}
                  .disableDecrease=${this.currentBet <= OM_MIN_BET}
                  .disableIncrease=${this.currentBet >= this.coin}
                  .disableStart=${this.coin < OM_MIN_BET || this.currentBet < OM_MIN_BET || this.currentBet > this.coin}
                  .showTools=${true}
                  @bet-home=${() => this.requestHome()}
                  @bet-settings=${() => (this.activePanel = 'settings')}
                  @bet-guide=${() => (this.activePanel = 'guide')}
                  @bet-decrease=${this.decreaseBet}
                  @bet-increase=${this.increaseBet}
                  @bet-value-change=${this.onBetValueChange}
                  @bet-start=${this.confirmBet}
                ></bet-selector-panel>
              </section>`
            : nothing}

          <!-- COIN が 0 になったときの補充ダイアログ（CASINO WAR と同方式）。 -->
          ${this.isCoinRecoveryDialogOpen
            ? html`<section class="overlay">
                <div class="modal coin-recovery-modal">
                  <h3>${chrome.coinRecoveryTitle}</h3>
                  <p>${chrome.coinRecoveryLine1}</p>
                  <p>${chrome.coinRecoveryLine2}</p>
                  <button class="recovery-ok-btn" @click=${this.confirmCoinRecovery}>${chrome.ok}</button>
                </div>
              </section>`
            : nothing}

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

          ${this.isOfflineAdWarningOpen
            ? html`<section class="overlay">
                <div class="modal">
                  <confirm-dialog-panel
                    .title=${chrome.offlineAdTitle}
                    .message=${chrome.offlineAdMessage}
                    .okLabel=${chrome.ok}
                    @confirm-accept=${() => {
                      this.isOfflineAdWarningOpen = false
                      this.goHome()
                    }}
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
                    .lines=${this.guideLines()}
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
