import type { BoardCard, CardFace } from './memory-battle-game-table.types'

// ヘルパー
export const DEFAULT_MEMORY_CARD_COUNT = 20
export const PLAYER_AUTO_MODE = false
export const PLAYER_PAIR_CAPTURE_CHANCE_PERCENT = 100
export const MEMORY_TRACE_VISIBLE = false
export const PRACTICE_CARD_COUNT_OPTIONS = [4, 8, 12, 16, 20] as const
export const RANK_ORDER = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
export const SUITS = ['hearts', 'spades', 'clubs', 'diamonds']
export const DEFAULT_CARD_BASE_PATH = 'common/cards'
export const DEFAULT_BACK_CARD_PATH = `${DEFAULT_CARD_BASE_PATH}/BackCard2.png`
export const DEFAULT_BACKGROUND_PATH = 'common/images/background.webp'
export const DEFAULT_MEMORY_STAGE_COUNT = 10

export function resolveMemoryCardCount(configuredCount: number): number {
  if (!Number.isInteger(configuredCount)) {
    return DEFAULT_MEMORY_CARD_COUNT
  }
  if (configuredCount < 2 || configuredCount > 20 || configuredCount % 2 !== 0) {
    return DEFAULT_MEMORY_CARD_COUNT
  }
  return configuredCount
}

export function shuffleArray<T>(items: T[]): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = temp
  }
  return next
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((accumulator, [key, value]) => {
    return accumulator.split(`{${key}}`).join(String(value))
  }, template)
}

export function isPlayerAutoModeEnabled(): boolean {
  return window.PLAYER_AUTO_MODE ?? PLAYER_AUTO_MODE
}

export function normalizePairCaptureChance(value: unknown, fallback: number): number {
  const chance = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(0, Math.min(100, Math.trunc(chance)))
}

export function playerPairCaptureChancePercent(): number {
  return normalizePairCaptureChance(window.PLAYER_PAIR_CAPTURE_CHANCE_PERCENT, PLAYER_PAIR_CAPTURE_CHANCE_PERCENT)
}

export function isMemoryTraceVisible(): boolean {
  return window.MEMORY_TRACE_VISIBLE ?? MEMORY_TRACE_VISIBLE
}

export function buildDrawCard(cardBasePath: string): CardFace {
  const rank = RANK_ORDER[Math.floor(Math.random() * RANK_ORDER.length)]
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)]
  return {
    rank,
    label: `${rank} ${suit}`,
    imagePath: `${cardBasePath}/${suit}_${rank}.png`
  }
}

export function buildMemoryDeck(cardBasePath: string, cardCount: number): BoardCard[] {
  const pairCount = Math.max(1, Math.floor(cardCount / 2))
  const selectedRanks = shuffleArray(RANK_ORDER).slice(0, pairCount)
  const pairFaces = selectedRanks.flatMap((rank) => {
    const [firstSuit, secondSuit] = shuffleArray(SUITS).slice(0, 2)
    return [
      { rank, label: `${rank} ${firstSuit}`, imagePath: `${cardBasePath}/${firstSuit}_${rank}.png` },
      { rank, label: `${rank} ${secondSuit}`, imagePath: `${cardBasePath}/${secondSuit}_${rank}.png` }
    ]
  })

  return shuffleArray(pairFaces).map((face, index) => ({
    id: `card-${index}-${face.rank}`,
    ...face,
    isFaceUp: false,
    isMatched: false
  }))
}
