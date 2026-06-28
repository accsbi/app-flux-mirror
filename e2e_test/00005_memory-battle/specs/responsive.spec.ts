import { test, expect, type Page } from '@playwright/test'
import { injectAndroidContext, GAME_PATH, snapAttach, assertNoHorizontalScroll } from './_helpers'

// RESPONSIVE-xxx: 360×800 と 412×915 で 横スクロール無/はみ出し無/重なり無/モーダル収まる/タップ要素が極小でない。

const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 412, h: 915 },
] as const

async function assertTapSizes(page: Page): Promise<void> {
  const btns = page.locator('standalone-game-menu .menu-btn')
  const n = await btns.count()
  expect(n).toBe(6)
  for (let i = 0; i < n; i++) {
    const box = await btns.nth(i).boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(36)
      expect(box.width).toBeGreaterThanOrEqual(48)
    }
  }
}

for (const vp of VIEWPORTS) {
  const tag = `${vp.w}x${vp.h}`
  test.describe(`responsive ${tag}`, () => {
    test.use({ viewport: { width: vp.w, height: vp.h } })

    test(`RESPONSIVE-001 メニュー: 横スクロール無・6ボタン タップ可寸法 [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await assertNoHorizontalScroll(page)
      await assertTapSizes(page)
      await snapAttach(page, info, 'RESPONSIVE-001', tag)
    })

    test(`RESPONSIVE-002 メニューモーダル(Guide/Settings/RemoveAds)が画面内に収まる [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      const modals: { idx: number; el: string; close: string }[] = [
        { idx: 1, el: 'guide-overview-panel', close: '.ok-btn' },
        { idx: 2, el: 'settings-panel', close: '.panel-btn' },
        { idx: 3, el: 'remove-ads-dialog-panel', close: '.cancel-btn' },
      ]
      for (const m of modals) {
        await page.locator('.menu-btn').nth(m.idx).click()
        const panel = page.locator(m.el)
        await expect(panel).toBeVisible()
        const box = await panel.boundingBox()
        expect(box, `${m.el} に boundingBox 無し`).not.toBeNull()
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(-1)
          expect(box.x + box.width).toBeLessThanOrEqual(vp.w + 1)
        }
        await assertNoHorizontalScroll(page)
        await panel.locator(m.close).last().click()
        await expect(panel).toBeHidden()
      }
      await snapAttach(page, info, 'RESPONSIVE-002', tag)
    })

    test(`RESPONSIVE-003 ステージ選択ボタンが縦に整列・重ならない [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await page.locator('.menu-btn').nth(0).click()
      await expect(page.locator('.stage-select-grid')).toBeVisible()
      const btns = page.locator('.stage-select-btn')
      const n = await btns.count()
      expect(n).toBe(11)
      const ys: number[] = []
      for (let i = 0; i < n; i++) {
        const b = await btns.nth(i).boundingBox()
        expect(b).not.toBeNull()
        if (b) ys.push(b.y)
      }
      for (let i = 1; i < ys.length; i++) {
        expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1)
      }
      await assertNoHorizontalScroll(page)
      await snapAttach(page, info, 'RESPONSIVE-003', tag)
    })

    test(`RESPONSIVE-004 練習盤面が横スクロール無で収まる [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await page.locator('.menu-btn').nth(0).click()
      await page.locator('.stage-select-btn--practice').click()
      await expect(page.locator('.practice-select')).toBeVisible()
      await page.locator('.primary-btn').first().click()
      await expect(page.locator('.card-grid')).toBeVisible()
      const grid = await page.locator('.card-grid').boundingBox()
      expect(grid).not.toBeNull()
      if (grid) expect(grid.x + grid.width).toBeLessThanOrEqual(vp.w + 1)
      await assertNoHorizontalScroll(page)
      await snapAttach(page, info, 'RESPONSIVE-004', tag)
    })
  })
}
