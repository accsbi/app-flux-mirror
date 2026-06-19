const PENDING_STAKE_KEY_PREFIX = 'simplebj_pending_stake_'

function storageKey(gameId: string): string {
  return `${PENDING_STAKE_KEY_PREFIX}${gameId}`
}

export function savePendingStake(gameId: string, amount: number): void {
  const normalized = Math.max(0, Math.floor(amount))
  if (normalized <= 0) {
    clearPendingStake(gameId)
    return
  }
  localStorage.setItem(storageKey(gameId), String(normalized))
}

export function loadPendingStake(gameId: string): number {
  const raw = localStorage.getItem(storageKey(gameId))
  if (!raw) {
    return 0
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }
  return parsed
}

export function clearPendingStake(gameId: string): void {
  localStorage.removeItem(storageKey(gameId))
}

export function takePendingStake(gameId: string): number {
  const amount = loadPendingStake(gameId)
  clearPendingStake(gameId)
  return amount
}

