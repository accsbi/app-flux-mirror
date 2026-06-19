export const CURRENT_STAGE_KEY = 'playingcardshub_memory_battle_stage'
export const CLEARED_STAGE_COUNT_KEY = 'playingcardshub_memory_battle_cleared_stage_count'
export const COMPLETED_ALL_STAGES_KEY = 'playingcardshub_memory_battle_completed_all_stages'
export const LEGACY_CURRENT_LEVEL_KEY = 'playingcardshub_memory_battle_level'
export const LEGACY_ALL_CLEAR_KEY = 'playingcardshub_memory_battle_all_clear'

const MEMORY_BATTLE_PROGRESS_KEYS = [
  CURRENT_STAGE_KEY,
  CLEARED_STAGE_COUNT_KEY,
  COMPLETED_ALL_STAGES_KEY,
  LEGACY_CURRENT_LEVEL_KEY,
  LEGACY_ALL_CLEAR_KEY
] as const

export function collectMemoryBattleProgressEntries(): Array<{ key: string; value: string }> {
  return MEMORY_BATTLE_PROGRESS_KEYS.flatMap((key) => {
    const value = localStorage.getItem(key)
    return value === null ? [] : [{ key, value }]
  })
}
