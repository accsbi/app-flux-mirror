import { test, expect, type Page } from '@playwright/test'
import { LANGS, gotoMenu, snapAttach, dismissRulesOverlay } from './_helpers'

// NAV-xxx: 画面遷移（START→盤面）・戻る（ホーム確認→メニュー復帰）・二重クリック耐性。

// START を押して盤面(bet-selector-panel)を出す。初回ルール overlay が出たら閉じる。
async function startToBet(page: Page): Promise<void> {
  await page.locator('.menu-btn').nth(0).click()
  await expect(page.locator('bet-selector-panel')).toBeVisible()
  await dismissRulesOverlay(page)
}

for (const lang of LANGS) {
  test.describe(`navigation [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    test(`NAV-001 START でメニュー→盤面へ遷移 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(0).click()
      // 盤面(game-table)に切替（standalone-game-menu は消える）
      await expect(page.locator('old-maid-game-table')).toBeVisible()
      await expect(page.locator('standalone-game-menu')).toBeHidden()
      await snapAttach(page, info, `NAV-001-${lang}`)
    })

    test(`NAV-002 START 二重クリック(dblclick)でも盤面・bet パネルは1つ(重複なし) [${lang}]`, async ({ page }, info) => {
      // START を素早く2回押す。遷移後に盤面・bet パネルが多重化しないこと。
      await page.locator('.menu-btn').nth(0).dblclick()
      await expect(page.locator('old-maid-game-table')).toHaveCount(1)
      await expect(page.locator('bet-selector-panel')).toHaveCount(1)
      await snapAttach(page, info, `NAV-002-${lang}`)
    })

    test(`NAV-003 盤面ホーム→確認ダイアログ→承認でメニュー復帰 [${lang}]`, async ({ page }, info) => {
      await startToBet(page)
      // bet 確定で round 開始 → ヘッダー(home)操作可能に。
      await page.locator('bet-selector-panel .ok-button').click()
      const header = page.locator('game-top-header')
      await expect(header).toBeVisible()
      // toolbar ボタン 0=home。押下 → 離脱確認 confirm-dialog-panel。
      await header.locator('.toolbar-btn').nth(0).click()
      const confirm = page.locator('confirm-dialog-panel')
      await expect(confirm).toBeVisible()
      // 承認(.accept) → メニュー復帰
      await confirm.locator('.confirm-btn.accept').click()
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await expect(page.locator('.menu-btn')).toHaveCount(6)
      await snapAttach(page, info, `NAV-003-${lang}`)
    })

    test(`NAV-004 離脱確認をキャンセルで盤面に留まる [${lang}]`, async ({ page }, info) => {
      await startToBet(page)
      await page.locator('bet-selector-panel .ok-button').click()
      const header = page.locator('game-top-header')
      await expect(header).toBeVisible()
      await header.locator('.toolbar-btn').nth(0).click()
      const confirm = page.locator('confirm-dialog-panel')
      await expect(confirm).toBeVisible()
      // キャンセル(.cancel)→ 盤面のまま
      await confirm.locator('.confirm-btn.cancel').click()
      await expect(page.locator('old-maid-game-table')).toBeVisible()
      await expect(page.locator('standalone-game-menu')).toBeHidden()
      await snapAttach(page, info, `NAV-004-${lang}`)
    })
  })
}
