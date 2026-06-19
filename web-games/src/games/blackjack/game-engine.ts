import { createSpadeCardByNumber, getCardScore, isAce } from '../../shared/domain/card'
import { Deck } from '../../shared/domain/deck'
import type { RandomSource } from '../../shared/infra/random'
import type { StatsRepository } from './stats-repository'
import { GameResult } from '../../shared/domain/types'
import type { Card, GameState, GameStats, ScoreRange } from '../../shared/domain/types'

export class GameEngine {
  private readonly deck: Deck
  private readonly statsRepository?: StatsRepository

  private state: GameState

  constructor(random: RandomSource, statsRepository?: StatsRepository) {
    this.deck = new Deck(random)
    this.statsRepository = statsRepository
    const stats = statsRepository?.load() ?? {
      playerWins: 0,
      playerLosses: 0,
      pushes: 0
    }
    this.state = this.createInitialState(stats)
  }

  getState(): GameState {
    return {
      ...this.state,
      playerHand: [...this.state.playerHand],
      dealerHand: [...this.state.dealerHand],
      playerScoreRange: { ...this.state.playerScoreRange },
      stats: { ...this.state.stats }
    }
  }

  startNewGame(forcePlayerBlackjack = false, deferInitialResolution = false): GameState {
    this.deck.reset()
    this.state = this.createInitialState(this.state.stats)
    this.state.phase = 'player_turn'

    if (forcePlayerBlackjack) {
      this.state.playerHand.push(createSpadeCardByNumber(1), createSpadeCardByNumber(13))
    } else {
      this.state.playerHand.push(...this.deck.dealCards(2))
    }

    this.state.dealerHand.push(...this.deck.dealCards(2))
    this.updateScores()

    if (!deferInitialResolution && (this.isPlayerBlackjack() || this.isPlayer21() || this.isPlayerBust())) {
      this.resolveDealerTurn()
    }

    return this.getState()
  }

  resolveInitialPlayerOutcomeIfNeeded(): GameState {
    if (this.state.phase === 'player_turn' && (this.isPlayerBlackjack() || this.isPlayer21() || this.isPlayerBust())) {
      this.resolveDealerTurn()
    }
    return this.getState()
  }

  hit(forcedCardNumber?: number, deferDealerTurnOnBust = false): GameState {
    if (this.state.phase !== 'player_turn') {
      return this.getState()
    }

    const hasForcedCard =
      forcedCardNumber !== undefined && Number.isInteger(forcedCardNumber) && forcedCardNumber >= 1 && forcedCardNumber <= 13
    const forcedCard = hasForcedCard ? createSpadeCardByNumber(forcedCardNumber) : null

    this.state.playerHand.push(forcedCard ?? this.deck.dealCards(1)[0])
    this.updateScores()

    if (this.isPlayerBlackjack() || this.isPlayer21() || this.isPlayerBust()) {
      if (deferDealerTurnOnBust && this.isPlayerBust()) {
        this.state.phase = 'dealer_turn'
      } else {
        this.resolveDealerTurn()
      }
    }

    return this.getState()
  }

  forcePlayerBlackjackInCurrentRound(): GameState {
    if (this.state.phase !== 'player_turn') {
      return this.getState()
    }

    this.state.playerHand = [createSpadeCardByNumber(1), createSpadeCardByNumber(13)]
    this.updateScores()
    this.resolveDealerTurn()
    return this.getState()
  }

  stand(deferDealerTurn = false): GameState {
    if (this.state.phase !== 'player_turn') {
      return this.getState()
    }

    this.state.isStandClicked = true
    if (deferDealerTurn) {
      this.state.phase = 'dealer_turn'
    } else {
      this.resolveDealerTurn()
    }
    return this.getState()
  }

  advanceDealerTurn(): GameState {
    if (this.state.phase !== 'dealer_turn') {
      return this.getState()
    }

    this.resolveDealerTurn()
    return this.getState()
  }

  private resolveDealerTurn(): void {
    this.state.phase = 'dealer_turn'
    this.state.isDealerCardRevealed = true

    if (!this.isPlayerBust()) {
      while (this.state.dealerScore < 17) {
        this.state.dealerHand.push(...this.deck.dealCards(1))
        this.updateScores()
      }
    }

    this.state.result = this.determineWinner()
    this.state.phase = 'round_end'
    this.saveStats()
  }

  private updateScores(): void {
    this.state.playerScore = this.calculateScore(this.state.playerHand)
    this.state.dealerScore = this.calculateScore(this.state.dealerHand)
    this.state.playerScoreRange = this.calculatePlayerScoreRange(this.state.playerHand)
  }

  private calculateScore(hand: Card[]): number {
    let score = hand.reduce((sum, card) => sum + getCardScore(card), 0)
    let aceCount = hand.filter(isAce).length

    while (score > 21 && aceCount > 0) {
      score -= 10
      aceCount -= 1
    }

    return score
  }

  private calculatePlayerScoreRange(hand: Card[]): ScoreRange {
    const aceCount = hand.filter(isAce).length

    if (aceCount === 0) {
      const score = hand.reduce((sum, card) => sum + getCardScore(card), 0)
      return { min: score, max: score }
    }

    const minScore = hand.reduce((sum, card) => sum + (isAce(card) ? 1 : getCardScore(card)), 0)
    const maxScore = minScore + 10

    if (maxScore > 21) {
      return { min: minScore, max: minScore }
    }

    return { min: minScore, max: maxScore }
  }

  isPlayerBust(): boolean {
    return this.state.playerScore > 21
  }

  isDealerBust(): boolean {
    return this.state.dealerScore > 21
  }

  isPlayerBlackjack(): boolean {
    return this.state.playerScore === 21 && this.state.playerHand.length === 2
  }

  isDealerBlackjack(): boolean {
    return this.state.dealerScore === 21 && this.state.dealerHand.length === 2
  }

  isPlayer21(): boolean {
    return this.state.playerScore === 21
  }

  private determineWinner(): GameResult {
    if (this.isPlayerBlackjack() && this.isDealerBlackjack()) {
      this.state.stats.pushes += 1
      return GameResult.PUSH
    }
    if (this.isPlayerBlackjack()) {
      this.state.stats.playerWins += 1
      return GameResult.PLAYER_BLACKJACK
    }
    if (this.isDealerBlackjack()) {
      this.state.stats.playerLosses += 1
      return GameResult.DEALER_BLACKJACK
    }
    if (this.isPlayerBust() && this.isDealerBust()) {
      this.state.stats.pushes += 1
      return GameResult.BOTH_BUST
    }
    if (this.isPlayerBust()) {
      this.state.stats.playerLosses += 1
      return GameResult.PLAYER_BUST
    }
    if (this.isDealerBust()) {
      this.state.stats.playerWins += 1
      return GameResult.DEALER_BUST
    }
    if (this.state.playerScore > this.state.dealerScore) {
      this.state.stats.playerWins += 1
      return GameResult.PLAYER_WIN
    }
    if (this.state.playerScore < this.state.dealerScore) {
      this.state.stats.playerLosses += 1
      return GameResult.DEALER_WIN
    }

    this.state.stats.pushes += 1
    return GameResult.PUSH
  }

  private saveStats(): void {
    this.statsRepository?.save(this.state.stats)
  }

  private createInitialState(stats: GameStats): GameState {
    return {
      phase: 'idle',
      playerHand: [],
      dealerHand: [],
      playerScore: 0,
      dealerScore: 0,
      playerScoreRange: { min: 0, max: 0 },
      isDealerCardRevealed: false,
      isStandClicked: false,
      stats: { ...stats },
      result: null
    }
  }
}
