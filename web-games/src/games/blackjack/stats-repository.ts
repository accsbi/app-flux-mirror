import type { GameStats } from '../../shared/domain/types'

const EMPTY_STATS: GameStats = {
  playerWins: 0,
  playerLosses: 0,
  pushes: 0
}

export interface StatsRepository {
  load(): GameStats
  save(stats: GameStats): void
}

export class LocalStorageStatsRepository implements StatsRepository {
  constructor(private readonly key = 'BlackjackStatsWeb') { }

  load(): GameStats {
    const raw = localStorage.getItem(this.key)
    if (!raw) {
      return { ...EMPTY_STATS }
    }

    try {
      const parsed = JSON.parse(raw) as Partial<GameStats>
      return {
        playerWins: Number(parsed.playerWins ?? 0),
        playerLosses: Number(parsed.playerLosses ?? 0),
        pushes: Number(parsed.pushes ?? 0)
      }
    } catch {
      return { ...EMPTY_STATS }
    }
  }

  save(stats: GameStats): void {
    localStorage.setItem(this.key, JSON.stringify(stats))
  }
}
