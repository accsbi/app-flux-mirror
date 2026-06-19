import { Deck } from '../../shared/domain/deck'
import type { Card } from '../../shared/domain/types'
import type { RandomSource } from '../../shared/infra/random'

export type PokerOutcome =
  | 'high card'
  | 'pair'
  | 'two pair'
  | 'trips'
  | 'straight'
  | 'flush'
  | 'full house'
  | 'quads'
  | 'straight flush'
  | 'royal flush'

export interface PokerEvaluation {
  outcome: PokerOutcome
  payoutMultiplier: number
}

const PAYOUT_TABLE: Record<PokerOutcome, number> = {
  'high card': 0,
  pair: 1,
  'two pair': 2,
  trips: 3,
  straight: 4,
  flush: 6,
  'full house': 9,
  quads: 25,
  'straight flush': 50,
  'royal flush': 100
}

export class PokerRoundEngine {
  private deck: Deck
  private hand: Card[] = []

  constructor(private readonly random: RandomSource) {
    this.deck = new Deck(this.random)
  }

  startRound(): Card[] {
    this.deck = new Deck(this.random)
    this.hand = this.deck.dealCards(5)
    return [...this.hand]
  }

  exchangeAt(indices: number[]): Card[] {
    const uniqueIndices = Array.from(new Set(indices)).filter((index) => index >= 0 && index < this.hand.length)
    uniqueIndices.forEach((index) => {
      const [next] = this.deck.dealCards(1)
      this.hand[index] = next
    })
    return [...this.hand]
  }

  getHand(): Card[] {
    return [...this.hand]
  }

  setHandForDebug(nextHand: Card[]): void {
    if (nextHand.length !== 5) {
      return
    }
    this.hand = [...nextHand]
  }

  evaluate(): PokerEvaluation {
    const outcome = evaluateFiveCardHand(this.hand)
    return {
      outcome,
      payoutMultiplier: PAYOUT_TABLE[outcome]
    }
  }
}

function evaluateFiveCardHand(cards: Card[]): PokerOutcome {
  if (cards.length !== 5) {
    return 'high card'
  }

  const countsByNumber = new Map<number, number>()
  const countsBySuit = new Map<string, number>()
  cards.forEach((card) => {
    countsByNumber.set(card.number, (countsByNumber.get(card.number) ?? 0) + 1)
    countsBySuit.set(card.suit, (countsBySuit.get(card.suit) ?? 0) + 1)
  })

  const groups = Array.from(countsByNumber.values()).sort((a, b) => b - a)
  const isFlush = countsBySuit.size === 1
  const straightInfo = getStraightInfo(cards)
  const isStraight = straightInfo.isStraight

  if (isFlush && isStraight && straightInfo.high === 14) {
    return 'royal flush'
  }
  if (isFlush && isStraight) {
    return 'straight flush'
  }
  if (groups[0] === 4) {
    return 'quads'
  }
  if (groups[0] === 3 && groups[1] === 2) {
    return 'full house'
  }
  if (isFlush) {
    return 'flush'
  }
  if (isStraight) {
    return 'straight'
  }
  if (groups[0] === 3) {
    return 'trips'
  }
  if (groups[0] === 2 && groups[1] === 2) {
    return 'two pair'
  }
  if (groups[0] === 2) {
    return 'pair'
  }
  return 'high card'
}

function getStraightInfo(cards: Card[]): { isStraight: boolean; high: number } {
  const raw = cards.map((card) => card.number)
  const unique = Array.from(new Set(raw))
  if (unique.length !== 5) {
    return { isStraight: false, high: 0 }
  }

  const highAce = unique.map((value) => (value === 1 ? 14 : value)).sort((a, b) => a - b)
  const normalStraight = highAce.every((value, index) => index === 0 || value === highAce[index - 1] + 1)
  if (normalStraight) {
    return { isStraight: true, high: highAce[4] }
  }

  const wheel = [1, 2, 3, 4, 5]
  const lowAceStraight = wheel.every((value) => unique.includes(value))
  if (lowAceStraight) {
    return { isStraight: true, high: 5 }
  }

  return { isStraight: false, high: 0 }
}
