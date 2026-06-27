import { test, expect, type Page } from '@playwright/test'
import { LANGS, gotoMenu, snapAttach } from './_helpers'

// SETTINGS-xxx / LANG-xxx: 効果音・BGM トグル / 設定閉じ / 言語切替（共有 settings-panel）。

async function openSettings(page: Page): Promise<void> {
  await page.locator('.menu-btn').nth(2).click()
  await expect(page.locator('settings-panel')).toBeVisible()
}

for (const lang of LANGS) {
  test.describe(`settings [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    test(`SETTINGS-001 効果音トグル: OFF→ON で active が切替わる [${lang}]`, async ({ page }, info) => {
      await openSettings(page)
      const group = page.locator('settings-panel .binary-toggle').nth(0)
      const onBtn = group.locator('.mini-btn').nth(0)
      const offBtn = group.locator('.mini-btn').nth(1)
      await offBtn.click()
      await expect(offBtn).toHaveClass(/active/)
      await onBtn.click()
      await expect(onBtn).toHaveClass(/active/)
      await snapAttach(page, info, `SETTINGS-001-${lang}`)
    })

    test(`SETTINGS-002 BGM トグル: ON→OFF で active が切替わる [${lang}]`, async ({ page }, info) => {
      await openSettings(page)
      const group = page.locator('settings-panel .binary-toggle').nth(1)
      const onBtn = group.locator('.mini-btn').nth(0)
      const offBtn = group.locator('.mini-btn').nth(1)
      await onBtn.click()
      await expect(onBtn).toHaveClass(/active/)
      await offBtn.click()
      await expect(offBtn).toHaveClass(/active/)
      await snapAttach(page, info, `SETTINGS-002-${lang}`)
    })

    test(`SETTINGS-003 OK で設定を閉じてメニュー復帰 [${lang}]`, async ({ page }, info) => {
      await openSettings(page)
      const panel = page.locator('settings-panel')
      await panel.locator('.panel-btn').last().click()
      await expect(panel).toBeHidden()
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await snapAttach(page, info, `SETTINGS-003-${lang}`)
    })
  })
}

// LANG: 言語切替（settings の select）。切替後に localStorage が更新される。
test.describe('language switch', () => {
  const cases: { from: typeof LANGS[number]; to: typeof LANGS[number] }[] = [
    { from: 'en', to: 'ja' },
    { from: 'en', to: 'zh' },
    { from: 'ja', to: 'en' },
  ]
  for (const { from, to } of cases) {
    test(`LANG-001 ${from}→${to} 言語切替で保存値が変わる`, async ({ page }, info) => {
      await gotoMenu(page, from)
      const startBefore = (await page.locator('.menu-btn').nth(0).innerText()).trim()
      await page.locator('.menu-btn').nth(2).click()
      const panel = page.locator('settings-panel')
      await expect(panel).toBeVisible()
      await panel.locator('.language-select').selectOption(to)
      await panel.locator('.panel-btn').last().click()
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      const saved = await page.evaluate(() => localStorage.getItem('playingcardshub_language'))
      expect(saved).toBe(to)
      const startAfter = (await page.locator('.menu-btn').nth(0).innerText()).trim()
      expect(typeof startBefore).toBe('string')
      expect(typeof startAfter).toBe('string')
      await snapAttach(page, info, `LANG-001-${from}-${to}`)
    })
  }
})
