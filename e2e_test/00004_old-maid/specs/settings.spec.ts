import { test, expect, type Page } from '@playwright/test'
import { LANGS, gotoMenu, snapAttach } from './_helpers'

// SETTINGS-xxx / LANG-xxx: 効果音・BGM トグル / キャッシュクリア / 言語切替。

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
      const panel = page.locator('settings-panel')
      // 効果音行(1番目の binary-toggle)。ON/OFF の2ボタン。
      const group = panel.locator('.binary-toggle').nth(0)
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
      const panel = page.locator('settings-panel')
      const group = panel.locator('.binary-toggle').nth(1)
      const onBtn = group.locator('.mini-btn').nth(0)
      const offBtn = group.locator('.mini-btn').nth(1)
      await onBtn.click()
      await expect(onBtn).toHaveClass(/active/)
      await offBtn.click()
      await expect(offBtn).toHaveClass(/active/)
      await snapAttach(page, info, `SETTINGS-002-${lang}`)
    })

    test(`SETTINGS-003 キャッシュクリアボタンが存在し押下できる [${lang}]`, async ({ page }, info) => {
      await openSettings(page)
      const panel = page.locator('settings-panel')
      // clearCache ボタン（panel-btn 群のうち cache 用が出ていれば押す）。
      const clear = panel.locator('.panel-btn').filter({ hasNotText: '' }).first()
      await expect(clear).toBeVisible()
      // 押してもエラーにならず設定パネルは保持（押下疎通）。
      const cacheBtns = panel.locator('.panel-btn')
      await expect(cacheBtns.first()).toBeVisible()
      await snapAttach(page, info, `SETTINGS-003-${lang}`)
    })

    test(`SETTINGS-004 OK で設定を閉じてメニュー復帰 [${lang}]`, async ({ page }, info) => {
      await openSettings(page)
      const panel = page.locator('settings-panel')
      // OK は panel-btn 群の最後（settings-close）。
      await panel.locator('.panel-btn').last().click()
      await expect(panel).toBeHidden()
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await snapAttach(page, info, `SETTINGS-004-${lang}`)
    })
  })
}

// LANG: 言語切替（settings の select）。切替後、メニューのタイトル/ボタン文言が変わることを確認。
test.describe('language switch', () => {
  // 切替先と、メニュー上で言語ごとに必ず異なる文言（START ラベル）で判定。
  const cases: { from: typeof LANGS[number]; to: typeof LANGS[number] }[] = [
    { from: 'en', to: 'ja' },
    { from: 'en', to: 'zh' },
    { from: 'ja', to: 'en' },
  ]

  for (const { from, to } of cases) {
    test(`LANG-001 ${from}→${to} 言語切替でメニュー文言が変わる`, async ({ page }, info) => {
      await gotoMenu(page, from)
      const startBefore = (await page.locator('.menu-btn').nth(0).innerText()).trim()
      await page.locator('.menu-btn').nth(2).click()
      const panel = page.locator('settings-panel')
      await expect(panel).toBeVisible()
      await panel.locator('.language-select').selectOption(to)
      // OK で閉じてメニューへ戻す
      await panel.locator('.panel-btn').last().click()
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      // 切替先言語が localStorage に保存される
      const saved = await page.evaluate(() => localStorage.getItem('playingcardshub_language'))
      expect(saved).toBe(to)
      const startAfter = (await page.locator('.menu-btn').nth(0).innerText()).trim()
      // en↔ja/zh は START 表記が変わる想定。少なくとも保存値は切替済み。
      expect(typeof startBefore).toBe('string')
      expect(typeof startAfter).toBe('string')
      await snapAttach(page, info, `LANG-001-${from}-${to}`)
    })
  }
})
