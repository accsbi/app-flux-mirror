import { test, expect } from '@playwright/test'
import { injectAndroidContext, GAME_PATH, quickToBoard, playToGameover, snapAttach } from './_helpers'

// ADS-xxx: 広告ロジックの単一所在は native(AppFluxHost)。web は game-end を通知するだけ・ネット確認しない。
// 回帰: 旧バグ=web が native AppFluxHost 依存なのに native 未実装＝7count/ネット確認/広告/警告が全滅。
//   → 修正: web=notifyNativeGameEnd で AppFluxHost.postMessage({game-end}) を送る / native が 7count＋ネット確認。

test('ADS-001 endGame で native(AppFluxHost)へ game-end を委譲（web はネット確認しない）', async ({ page }) => {
  await injectAndroidContext(page, 'en')
  // native 不在のブラウザでは window.AppFluxHost が無い。委譲先をモックして受信を検証。
  await page.addInitScript(() => {
    const w = window as unknown as { __posts__: string[]; AppFluxHost: { postMessage: (m: string) => void } }
    w.__posts__ = []
    w.AppFluxHost = { postMessage: (m: string) => { w.__posts__.push(m) } }
  })
  await page.goto(GAME_PATH)
  await expect(page.locator('standalone-game-menu')).toBeVisible()
  await quickToBoard(page)
  await playToGameover(page)
  // 1ゲーム終了で game-end が AppFluxHost へ送られている（7count・ネット確認は native の責務）。
  const posts = await page.evaluate(() => (window as unknown as { __posts__: string[] }).__posts__)
  expect(posts.some((m) => m.includes('game-end'))).toBeTruthy()
  await snapAttach(page, test.info(), 'ADS-001', 'gameend')
})

test('ADS-002 native の __onOfflineAdBlocked() で統一オフライン警告が出る', async ({ page }) => {
  await injectAndroidContext(page, 'en')
  await page.goto(GAME_PATH)
  await expect(page.locator('standalone-game-menu')).toBeVisible()
  await quickToBoard(page)
  // native がオフライン検知時に呼ぶコールバックを直接発火（広告点でのオフライン挙動）。
  await page.evaluate(() => {
    const w = window as unknown as { __onOfflineAdBlocked?: () => void }
    w.__onOfflineAdBlocked?.()
  })
  // 盤面上に統一オフライン警告(confirm-dialog-panel)が出る＝ハングしない。
  await expect(page.locator('confirm-dialog-panel')).toBeVisible({ timeout: 8000 })
  await snapAttach(page, test.info(), 'ADS-002', 'offline')
})
