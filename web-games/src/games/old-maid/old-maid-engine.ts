// Old Maid（ババ抜き）のルールエンジン。Flutter 版 lib/classes/old_maid_game.dart を TS へ移植。
// 53枚（52 + Joker(value=0)）。4人: player(下) / cpu1(右) / cpu2(上) / cpu3(左)。
// ペア = 同じ value（Joker は value=0 で対象外）。最後に Joker を持つ人が負け。
// カード画像は cards 命名（<suit>_<A/J/Q/K|2..10>.png, joker.png）に一致させる。

export interface OMCard {
  /** 1=A … 13=K、0=Joker。ペア判定に使う。 */
  value: number
  /** cards 配下のファイル名（例 spades_A.png / joker.png）。 */
  imagePath: string
}

/** プレイヤーキー（席）。circular order の基準でもある。 */
export type Seat = 'player' | 'cpu1' | 'cpu2' | 'cpu3'
export const SEATS: Seat[] = ['player', 'cpu1', 'cpu2', 'cpu3']

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
function rankToken(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function buildDeck(): OMCard[] {
  const cards: OMCard[] = []
  for (const suit of SUITS) {
    for (let r = 1; r <= 13; r++) cards.push({ value: r, imagePath: `${suit}_${rankToken(r)}.png` })
  }
  cards.push({ value: 0, imagePath: 'joker.png' }) // Old Maid
  return cards
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export class OldMaidEngine {
  hands: Record<Seat, OMCard[]> = { player: [], cpu1: [], cpu2: [], cpu3: [] }
  discarded: OMCard[] = []
  /** 終了済みの席（手札0）。終了順を保持。 */
  finished: Seat[] = []
  /** 親（最初に余り1枚を受け取る席）。 */
  parent: Seat = 'player'

  /**
   * 新規ゲーム: 親を決めて配る（ペアはまだ除去しない＝Flutter の decideParentAndDeal 相当）。
   * 初期ペアの除去は arrange シーンの OK で removeAllPairs() を呼んで行う。
   */
  start(): void {
    const deck = buildDeck()
    shuffle(deck)
    this.hands = { player: [], cpu1: [], cpu2: [], cpu3: [] }
    this.discarded = []
    this.finished = []
    this.parent = SEATS[Math.floor(Math.random() * 4)]

    // 52枚を回り順で配り、余り1枚を親へ（53枚目）。
    for (let i = 0; i < 52; i++) {
      const seat = SEATS[i % 4]
      this.hands[seat].push(deck.pop()!)
    }
    this.hands[this.parent].push(deck.pop()!)
  }

  /** 全員の初期ペアを除去（arrange シーンの OK 相当）。 */
  removeAllPairs(): void {
    for (const s of SEATS) this.removePairs(s)
  }

  /** seat の手札の中でペアになっているカード集合（点滅表示用。除去はしない）。 */
  collectPairs(seat: Seat): Set<OMCard> {
    const hand = this.hands[seat]
    const pairs = new Set<OMCard>()
    for (let i = 0; i < hand.length; i++) {
      if (pairs.has(hand[i])) continue
      for (let j = i + 1; j < hand.length; j++) {
        if (pairs.has(hand[j])) continue
        if (hand[i].value === hand[j].value && hand[i].value !== 0) {
          pairs.add(hand[i])
          pairs.add(hand[j])
          break
        }
      }
    }
    return pairs
  }

  /** 引いた相手の山をシャッフル（CPUポーズの「シャッフル」相当）。 */
  shuffleHand(seat: Seat): void {
    shuffle(this.hands[seat])
  }

  /** 1手札からペアを除去し、捨て札へ。 */
  removePairs(seat: Seat): void {
    const hand = this.hands[seat]
    const toRemove = new Set<number>()
    for (let i = 0; i < hand.length; i++) {
      if (toRemove.has(i)) continue
      for (let j = i + 1; j < hand.length; j++) {
        if (toRemove.has(j)) continue
        if (hand[i].value === hand[j].value && hand[i].value !== 0) {
          toRemove.add(i)
          toRemove.add(j)
          break
        }
      }
    }
    if (toRemove.size === 0) return
    const kept: OMCard[] = []
    hand.forEach((c, idx) => (toRemove.has(idx) ? this.discarded.push(c) : kept.push(c)))
    this.hands[seat] = kept
  }

  /** 手札0になった席を終了登録（順位＝終了順）。 */
  updateFinished(): void {
    for (const s of SEATS) {
      if (this.hands[s].length === 0 && !this.finished.includes(s)) this.finished.push(s)
    }
  }

  /** seat が「引く相手」＝ circular order で1つ前の、手札が残っている席。 */
  drawSource(seat: Seat): Seat | null {
    const idx = SEATS.indexOf(seat)
    for (let i = 1; i < SEATS.length; i++) {
      const cand = SEATS[(idx - i + SEATS.length) % SEATS.length]
      if (cand === seat) continue
      if (this.hands[cand].length > 0) return cand
    }
    return null
  }

  /**
   * seat が source の index のカードを1枚引く（ペア除去はしない＝呼び出し側が点滅後に removePairs する）。
   * 引いたカードを返す。
   */
  draw(seat: Seat, source: Seat, index: number): OMCard | null {
    const src = this.hands[source]
    if (index < 0 || index >= src.length) return null
    const card = src.splice(index, 1)[0]
    this.hands[seat].push(card)
    return card
  }

  /** 3人が終了したら終局。 */
  isGameOver(): boolean {
    this.updateFinished()
    return this.finished.length >= 3
  }

  /** 負け（Joker を持って最後まで残った席）。終局でなければ null。 */
  loser(): Seat | null {
    this.updateFinished()
    if (this.finished.length < 3) return null
    return SEATS.find((s) => !this.finished.includes(s)) ?? null
  }
}
