import { test, expect, type Page } from '@playwright/test'
import { LANGS, injectAndroidContext, GAME_PATH, snapAttach } from './_helpers'

// RESPONSIVE-xxx: 360×800 と 412×915 で 横スクロール無/はみ出し無/重なり無/モーダル収まる/タップ要素が極小でない。

const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 412, h: 915 },
] as const

// 横スクロールが出ていない（scrollWidth <= clientWidth + 1）。
async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const de = document.documentElement
    return { sw: de.scrollWidth, cw: de.clientWidth }
  })
  expect(overflow.sw).toBeLessThanOrEqual(overflow.cw + 1)
}

// 操作ボタンが極小でない（最低タップ高さの目安 >= 36px。豆粒禁止）。
async function assertTapSizes(page: Page): Promise<void> {
  const menu = page.locator('standalone-game-menu')
  const btns = menu.locator('.menu-btn')
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

    test(`RESPONSIVE-002 各モーダルが画面内に収まる(はみ出し無) [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      const modals: { idx: number; el: string }[] = [
        { idx: 1, el: 'guide-overview-panel' },
        { idx: 2, el: 'settings-panel' },
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
          // 左右が viewport 内（はみ出し無）。
          expect(box.x).toBeGreaterThanOrEqual(-1)
          expect(box.x + box.width).toBeLessThanOrEqual(vp.w + 1)
        }
        await assertNoHorizontalScroll(page)
        // 閉じてから次へ（× もしくは OK/戻る）
        const closer = panel.locator('.top-close-btn, .panel-btn, .menu-btn').last()
        await closer.click()
        await expect(panel).toBeHidden()
      }
      await snapAttach(page, info, 'RESPONSIVE-002', tag)
    })

    test(`RESPONSIVE-003 メニューと各ボタンが重ならない(縦に整列) [${tag}]`, async ({ page }, info) => {
      await injectAndroidContext(page, 'en')
      await page.goto(GAME_PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      const btns = page.locator('standalone-game-menu .menu-btn')
      const boxes: ({ y: number; bottom: number } | null)[] = []
      const n = await btns.count()
      for (let i = 0; i < n; i++) {
        const b = await btns.nth(i).boundingBox()
        boxes.push(b ? { y: b.y, bottom: b.y + b.height } : null)
      }
      // 上から順に y が単調増加（重なりなし＝前のボタン下端 <= 次のボタン上端 +余白許容）。
      for (let i = 1; i < boxes.length; i++) {
        const prev = boxes[i - 1]
        const cur = boxes[i]
        expect(prev).not.toBeNull()
        expect(cur).not.toBeNull()
        if (prev && cur) {
          expect(cur.y).toBeGreaterThanOrEqual(prev.y - 1)
        }
      }
      await snapAttach(page, info, 'RESPONSIVE-003', tag)
    })
  })
}
