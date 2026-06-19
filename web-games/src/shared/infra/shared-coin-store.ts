export const SHARED_COIN_KEY = 'app_flux_shared_coin'

export const DEFAULT_SHARED_COIN = 100
export const MIN_SHARED_COIN = 0

function toInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SHARED_COIN
  }
  return Math.floor(value)
}

export function sanitizeSharedCoin(value: number): number {
  const normalized = toInteger(value)
  if (normalized < 0) {
    // Recovery rule: negative coin state is treated as game over and reset.
    return DEFAULT_SHARED_COIN
  }
  return Math.max(MIN_SHARED_COIN, normalized)
}

export function loadSharedCoin(): number {
  const raw = localStorage.getItem(SHARED_COIN_KEY)
  const parsed = raw === null ? DEFAULT_SHARED_COIN : Number(raw)
  const sanitized = sanitizeSharedCoin(parsed)
  if (raw === null || Number(raw) !== sanitized) {
    localStorage.setItem(SHARED_COIN_KEY, String(sanitized))
  }
  return sanitized
}

export function saveSharedCoin(value: number): number {
  const sanitized = sanitizeSharedCoin(value)
  localStorage.setItem(SHARED_COIN_KEY, String(sanitized))
  return sanitized
}

export function ensurePlayableSharedCoin(): number {
  const current = loadSharedCoin()
  if (current <= MIN_SHARED_COIN) {
    return saveSharedCoin(DEFAULT_SHARED_COIN)
  }
  return current
}

export function collectSharedCoinStorageEntry(): { key: string; value: string } | null {
  const value = localStorage.getItem(SHARED_COIN_KEY)
  if (value === null) {
    return null
  }
  return { key: SHARED_COIN_KEY, value }
}
