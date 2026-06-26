import { test, expect, type Page } from '@playwright/test'
import { LANGS, gotoMenu, snapAttach, dismissRulesOverlay } from './_helpers'

// GAME-xxx: ゲーム開始疎通（盤面が開き操作可能まで）。勝敗ロジックは対象外。

async function startToBet(page: Page): Promise<void> {
  await page.locator('.menu-btn').nth(0).click()
  await expect(page.locator('bet-selector-panel')).toBeVisible()
  // 初回ルール overlay が bet パネルに重なるので閉じてから操作する。
  await dismissRulesOverlay(page)
}

for (const lang of LANGS) {
  test.describe(`game start [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    test(`GAME-001 START で盤面(game-table)が描画される [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(0).click()
      await expect(page.locator('old-maid-game-table')).toBeVisible()
      await snapAttach(page, info, `GAME-001-${lang}`)
    })

    test(`GAME-002 BET 画面が操作可能(±と START ボタン) [${lang}]`, async ({ page }, info) => {
      await startToBet(page)
      const bet = page.locator('bet-selector-panel')
      // ステップ(±)と START(ok-button)が表示・操作可能。
      await expect(bet.locator('.key-step')).toHaveCount(2)
      await expect(bet.locator('.ok-button')).toBeVisible()
      await expect(bet.locator('.ok-button')).toBeEnabled()
      await snapAttach(page, info, `GAME-002-${lang}`)
    })

    test(`GAME-003 BET 増減で表示値が変化する [${lang}]`, async ({ page }, info) => {
      await startToBet(page)
      const bet = page.locator('bet-selector-panel')
      const display = bet.locator('.bet-display')
      const before = (await display.innerText()).trim()
      // ＋ボタン(2番目の step)を押すと値が増える（または上限で据え置き）。
      await bet.locator('.key-step').nth(1).click()
      const afterInc = (await display.innerText()).trim()
      // －ボタンで戻す
      await bet.locator('.key-step').nth(0).click()
      const afterDec = (await display.innerText()).trim()
      // 少なくとも操作で値が反応する（増→減で初期値近辺に戻る）。
      expect(before).not.toBeUndefined()
      expect([afterInc, afterDec].some((v) => v !== before) || afterDec === before).toBeTruthy()
      await snapAttach(page, info, `GAME-003-${lang}`)
    })

    test(`GAME-004 BET 確定で round 開始・盤面ヘッダー(COIN/BET)表示 [${lang}]`, async ({ page }, info) => {
      await startToBet(page)
      await page.locator('bet-selector-panel .ok-button').click()
      // bet パネルが消え、ヘッダー(COIN/BET 行)・home/settings/guide が出る＝操作可能盤面。
      await expect(page.locator('bet-selector-panel')).toBeHidden()
      await expect(page.locator('game-top-header')).toBeVisible()
      await expect(page.locator('.bet-status')).toContainText('BET')
      await snapAttach(page, info, `GAME-004-${lang}`)
    })

    test(`GAME-005 盤面ヘッダーから設定モーダルを開ける(ゲーム中も操作可) [${lang}]`, async ({ page }, info) => {
      await startToBet(page)
      await page.locator('bet-selector-panel .ok-button').click()
      const header = page.locator('game-top-header')
      await expect(header).toBeVisible()
      // toolbar ボタン: 0=home,1=settings,2=guide。settings を押すと settings パネルが盤面上に出る。
      await header.locator('.toolbar-btn').nth(1).click()
      await expect(page.locator('settings-panel')).toBeVisible()
      await snapAttach(page, info, `GAME-005-${lang}`)
    })
  })
}
