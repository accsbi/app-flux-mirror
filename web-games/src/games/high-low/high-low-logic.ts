// High & Low（test_high_low プロトタイプ仕様）のロジック。
// 参照元: wsl_pj/test_high_low/src/app/app.js, configs/app.config.js
import type { Card, Declaration, GameState, Rank, Result, Suit } from './high-low-types'

// 各プレイヤーの配布枚数 = 26（フル: 合計52枚 / Joker無し）。
// 1ラウンドで両者の山から1枚ずつ引くため総ラウンド数＝この値。
// ゲーム画面の「Round N / 26」表示はこの定数と連動する（ハードコードしない）。
export const CARDS_PER_PLAYER = 26

// ── 結果演出のタイミング（ミリ秒）──────────────────────────────
// テンポ調整はここだけ触れば全体に効く。値を大きくするほどゆっくり＝カードや結果が長く表示される。
// フロー: 宣言 →(CARD_OPEN_DELAY_MS)→ 攻めカードが開く →(OPEN_HOLD_MS)→ BINGO/MISS 結果へ。
export const CPU_THINK_MS = 1900       // CPU が HIGH/LOW を選ぶまでの「考え中」
export const CARD_OPEN_DELAY_MS = 500  // 宣言してから攻めカードがめくれるまで
export const OPEN_HOLD_MS = 1500       // カードが開いてから結果(BINGO/MISS)を出すまで。公開カードを見せている時間

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
// カードの強さ: 2 が最弱、A が最強。2..10=額面、J=11,Q=12,K=13,A=14。
const VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14
}

function createDeck(): Card[] {
  return SUITS.flatMap((s) => RANKS.map((r) => ({ suit: s, rank: r, value: VALUES[r] })))
}

export function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
      ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export function createInitialState(): GameState {
  const deck = shuffle(createDeck())
  const n = CARDS_PER_PLAYER
  return {
    phase: 'preparation',
    players: {
      p1: { id: 'p1', name: 'PLAYER', role: 'attack', deck: deck.slice(0, n), acquired: [] },
      p2: { id: 'p2', name: 'CPU', role: 'defend', deck: deck.slice(n, n * 2), acquired: [] }
    },
    defendCard: null,
    attackCard: null,
    declaration: null,
    result: null,
    discard: [],
    round: 0,
    busy: false
  }
}

/** 同値=tie(引き分け) / high=attack>defend で win / low=attack<defend で win */
export function judge(defendCard: Card, attackCard: Card, decl: Declaration): Result {
  if (attackCard.value === defendCard.value) return 'tie'
  if (decl === 'high') return attackCard.value > defendCard.value ? 'win' : 'lose'
  return attackCard.value < defendCard.value ? 'win' : 'lose'
}

/** CPU の宣言は相手(PLAYER)の Defend カード=表向きカードを見て決める。
 *  8を拠点に 2〜7→HIGH / 9〜A→LOW / 8→ランダム。
 *  （Defend が低いほど Attack は高くなりやすいので HIGH、高いほど LOW を選ぶ） */
export function cpuChooseDeclaration(defendValue: number): Declaration {
  if (defendValue <= 7) return 'high'
  if (defendValue >= 9) return 'low'
  return Math.random() < 0.5 ? 'high' : 'low'
}
