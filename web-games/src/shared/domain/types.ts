export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts'

export type CardValue =
  | 'ACE'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'JACK'
  | 'QUEEN'
  | 'KING'

export interface Card {
  suit: Suit
  value: CardValue
  number: number
  imagePath: string
}

export enum GameResult {
  PLAYER_BLACKJACK = 'PLAYER_BLACKJACK',
  DEALER_BLACKJACK = 'DEALER_BLACKJACK',
  PLAYER_BUST = 'PLAYER_BUST',
  DEALER_BUST = 'DEALER_BUST',
  BOTH_BUST = 'BOTH_BUST',
  PLAYER_WIN = 'PLAYER_WIN',
  DEALER_WIN = 'DEALER_WIN',
  PUSH = 'PUSH'
}

export type GamePhase = 'idle' | 'player_turn' | 'dealer_turn' | 'round_end'

export interface GameStats {
  playerWins: number
  playerLosses: number
  pushes: number
}

export interface ScoreRange {
  min: number
  max: number
}

export interface GameState {
  phase: GamePhase
  playerHand: Card[]
  dealerHand: Card[]
  playerScore: number
  dealerScore: number
  playerScoreRange: ScoreRange
  isDealerCardRevealed: boolean
  isStandClicked: boolean
  stats: GameStats
  result: GameResult | null
}
