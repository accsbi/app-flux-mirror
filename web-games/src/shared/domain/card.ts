import type { Card, CardValue, Suit } from './types'

export const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts']

export const VALUES: CardValue[] = [
  'ACE',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'JACK',
  'QUEEN',
  'KING'
]

export function createCard(suit: Suit, value: CardValue, number: number): Card {
  const rankToken =
    value === 'ACE'
      ? 'A'
      : value === 'JACK'
        ? 'J'
        : value === 'QUEEN'
          ? 'Q'
          : value === 'KING'
            ? 'K'
            : String(number)

  return {
    suit,
    value,
    number,
    imagePath: `${suit}_${rankToken}.png`
  }
}

export function cardValueFromNumber(number: number): CardValue {
  if (number === 1) {
    return 'ACE'
  }
  if (number >= 2 && number <= 10) {
    return String(number) as CardValue
  }
  if (number === 11) {
    return 'JACK'
  }
  if (number === 12) {
    return 'QUEEN'
  }
  if (number === 13) {
    return 'KING'
  }
  throw new Error(`Invalid card number: ${number}`)
}

export function createSpadeCardByNumber(number: number): Card {
  return createCard('spades', cardValueFromNumber(number), number)
}

export function getCardScore(card: Card): number {
  if (card.value === 'KING' || card.value === 'QUEEN' || card.value === 'JACK') {
    return 10
  }
  if (card.value === 'ACE') {
    return 11
  }
  return Number(card.value)
}

export function isAce(card: Card): boolean {
  return card.value === 'ACE'
}
