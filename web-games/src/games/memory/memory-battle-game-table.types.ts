export type MemoryBattleScreen =
  | 'title'
  | 'practice-setup'
  | 'enemy-intro'
  | 'draw-battle'
  | 'turn-select'
  | 'battle'
  | 'result-win'
  | 'result-lose'
  | 'result-draw'
  | 'result-practice'

export type TurnOwner = 'player' | 'cpu'
export type DrawResolution = 'player-choice' | 'cpu-confirm' | null
export type MemoryBattleResult = 'win' | 'lose' | 'draw'
export type MemoryBattleMode = 'stage' | 'practice'
export type MemoryWinResultMode = 'new-stage-clear' | 'replay-clear' | 'first-all-clear'

export type CardFace = {
  rank: string
  label: string
  imagePath: string
}

export type DrawChoiceSlot = {
  id: 'left' | 'right'
  card: CardFace
}

export type BoardCard = CardFace & {
  id: string
  isFaceUp: boolean
  isMatched: boolean
}

export type MemoryKnownPair = {
  first: BoardCard
  second: BoardCard
}

export type MemoryChoiceTrace = {
  source: 'known-pair' | 'random'
  chance: number
  cards: BoardCard[]
}

export type BattleTraceLine = {
  text: string
  tone?: 'match'
}

export type MemoryBattleDebugState = {
  screen?: MemoryBattleScreen
  coin?: number
  currentStage?: number
  clearedStageCount?: number
  hasCompletedAllStages?: boolean
  selectedStage?: number
  currentTurn?: TurnOwner
  cards?: BoardCard[]
  openedCardIds?: string[]
  playerPairs?: number
  cpuPairs?: number
  playerTurnCount?: number
  cpuTurnCount?: number
  drawPlayerCard?: CardFace | null
  drawCpuCard?: CardFace | null
  drawWinner?: TurnOwner | null
  drawResolution?: DrawResolution
  cpuChosenOpeningTurn?: TurnOwner
  statusMessage?: string
  resultReward?: number
  isBusy?: boolean
}

export type MemoryBattleDebugApi = {
  snapshot: () => MemoryBattleDebugState
  setState: (state: MemoryBattleDebugState) => void
  setProgress: (stage: number, options?: { clearedStageCount?: number; hasCompletedAllStages?: boolean; coin?: number }) => void
  forceFinish: (result: MemoryBattleResult) => Promise<void>
}
