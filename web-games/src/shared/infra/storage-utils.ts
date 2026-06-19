import { collectMemoryBattleProgressEntries } from './memory-battle-progress-store'
import { collectSharedCoinStorageEntry } from './shared-coin-store'

/**
 * 共有コインとメモリバトル進捗を残したまま localStorage をクリアする。
 * （旧 trial-access から trial 非依存の汎用処理として分離）
 */
export function clearLocalStoragePreservingProgress(
  extraEntries: Array<{ key: string; value: string }> = []
): void {
  const preservedEntries = new Map<string, string>()
  const sharedCoinEntry = collectSharedCoinStorageEntry()
  if (sharedCoinEntry !== null) {
    preservedEntries.set(sharedCoinEntry.key, sharedCoinEntry.value)
  }
  collectMemoryBattleProgressEntries().forEach(({ key, value }) => {
    preservedEntries.set(key, value)
  })
  extraEntries.forEach(({ key, value }) => {
    preservedEntries.set(key, value)
  })
  localStorage.clear()
  preservedEntries.forEach((value, key) => {
    localStorage.setItem(key, value)
  })
}

export function applyTemplate(
  template: string,
  replacements: Record<string, string | number>
): string {
  return Object.entries(replacements).reduce((current, [key, value]) => {
    return current.split(`{${key}}`).join(String(value))
  }, template)
}
