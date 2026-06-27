import { test, expect, type Page } from '@playwright/test'
import { LANGS, injectAndroidContext, GAME_PATH, snapAttach } from './_helpers'

// RESPONSIVE-xxx: 360×800 と 412×915（指示書§1.3）で 横スクロール無/はみ出し無/重なり無/モーダル収まる/タップ要素が極小でない。

const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 412, h: 915 },
] as const

async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  expect(o.sw).toBeLessThanOrEqual(o.cw + 1)
}

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

    test(`RESPONSIVE-001 メニュー: 横スクロール無・タップ要素が極小でない [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await assertNoHorizontalScroll(page)
      await assertTapSizes(page)
      await snapAttach(page, info, 'RESPONSIVE-001', tag)
    })

    test(`RESPONSIVE-002 メニューモーダル(RemoveAds/Other/News)が画面内に収まる [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      const modals: { idx: number; el: string }[] = [
        { idx: 3, el: 'remove-ads-dialog-panel' },
        { idx: 4, el: 'other-games-modal-panel' },
        { idx: 5, el: 'news-info-modal-panel' },
      ]
      for (const m of modals) {
        await page.locator('.menu-btn').nth(m.idx).click()
        const panel = page.locator(m.el)
        await expect(panel).toBeVisible()
        const box = await panel.boundingBox()
        expect(box).not.toBeNull()
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(-1)
          expect(box.x + box.width).toBeLessThanOrEqual(vp.w + 1)
        }
        await assertNoHorizontalScroll(page)
        // 閉じる（× / 戻る / OK のいずれか）。
        await panel.locator('.top-close-btn, .panel-btn, .menu-btn').last().click()
        await expect(panel).toBeHidden()
      }
      await snapAttach(page, info, 'RESPONSIVE-002', tag)
    })

    test(`RESPONSIVE-003 メニューボタンが縦に整列・重ならない [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      const btns = page.locator('standalone-game-menu .menu-btn')
      const n = await btns.count()
      const ys: number[] = []
      for (let i = 0; i < n; i++) {
        const b = await btns.nth(i).boundingBox()
        expect(b).not.toBeNull()
        if (b) ys.push(b.y)
      }
      for (let i = 1; i < ys.length; i++) {
        expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1)
      }
      await snapAttach(page, info, 'RESPONSIVE-003', tag)
    })

    test(`RESPONSIVE-004 盤面の HIGH/LOW が横スクロール無で収まる [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await page.locator('.menu-btn').nth(0).click()
      await page.locator('.mode-opt').nth(2).click()
      await page.locator('.mode-next').click()
      await page.locator('bet-selector-panel .ok-button').click()
      await expect(page.locator('.btn-high')).toBeVisible()
      await expect(page.locator('.btn-low')).toBeVisible()
      await assertNoHorizontalScroll(page)
      await snapAttach(page, info, 'RESPONSIVE-004', tag)
    })
  })
}
