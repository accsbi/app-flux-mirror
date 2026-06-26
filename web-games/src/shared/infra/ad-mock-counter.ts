const AD_MOCK_GAME_COUNT_KEY = 'simplebj_ad_mock_game_count'
const AD_MOCK_INTERVAL = 7
const ADS_REMOVED_KEY = 'ads_removed'

function readCount(): number {
  const raw = localStorage.getItem(AD_MOCK_GAME_COUNT_KEY)
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0
  }
  return parsed
}

export function getAdMockGameCount(): number {
  return readCount()
}

export function countGameResultForAdMock(): number {
  const next = readCount() + 1
  localStorage.setItem(AD_MOCK_GAME_COUNT_KEY, String(next))
  return next
}

export function shouldShowAdMockDialog(gameCount: number): boolean {
  if (localStorage.getItem(ADS_REMOVED_KEY) === 'true') {
    return false
  }
  return gameCount > 0 && gameCount % AD_MOCK_INTERVAL === 0
}

export function buildAdMockDialogMessage(gameCount: number): string {
  return `広告表示\nゲームカウント ${gameCount}`
}
