import { SUITS, VALUES, createCard } from './card'
import type { Card } from './types'
import type { RandomSource } from '../infra/random'

export class Deck {
  private readonly cards: Card[] = []
  private readonly usedIndices = new Set<number>()

  constructor(private readonly random: RandomSource) {
    this.initializeDeck()
  }

  private initializeDeck(): void {
    this.cards.length = 0
    for (const suit of SUITS) {
      VALUES.forEach((value, index) => {
        this.cards.push(createCard(suit, value, index + 1))
      })
    }
    this.usedIndices.clear()
  }

  private getRandomCard(): Card {
    if (this.usedIndices.size >= this.cards.length) {
      throw new Error('Deck is exhausted')
    }

    let index = this.random.nextInt(this.cards.length)
    while (this.usedIndices.has(index)) {
      index = this.random.nextInt(this.cards.length)
    }
    this.usedIndices.add(index)
    return this.cards[index]
  }

  dealCards(numberOfCards: number): Card[] {
    const dealtCards: Card[] = []
    for (let i = 0; i < numberOfCards; i += 1) {
      dealtCards.push(this.getRandomCard())
    }
    return dealtCards
  }

  reset(): void {
    this.usedIndices.clear()
  }

  remainingCards(): number {
    return this.cards.length - this.usedIndices.size
  }
}
