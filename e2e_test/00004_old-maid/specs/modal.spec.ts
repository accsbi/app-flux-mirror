import { test, expect, type Page, type Locator } from '@playwright/test'
import { LANGS, gotoMenu, snapAttach } from './_helpers'

// MODAL-xxx: 開く→タイトル/本文→閉じる(×)→背景(メニュー)復帰→重複表示なし→画面内に収まる。
// 各モーダルの「閉じる」操作は要素ごとに異なる（×ボタン / OK / 戻る）。

type ModalCase = {
  id: string
  btnIndex: number
  el: string
  // 右上 × もしくは相当の閉じる locator を返す
  closer: (panel: Locator) => Locator
}

const CASES: ModalCase[] = [
  { id: 'GUIDE', btnIndex: 1, el: 'guide-overview-panel', closer: (p) => p.locator('.top-close-btn') },
  { id: 'SETTINGS', btnIndex: 2, el: 'settings-panel', closer: (p) => p.locator('.panel-btn').last() }, // OK で閉じる
  { id: 'REMOVEADS', btnIndex: 3, el: 'remove-ads-dialog-panel', closer: (p) => p.locator('.top-close-btn') },
  { id: 'OTHER', btnIndex: 4, el: 'other-games-modal-panel', closer: (p) => p.locator('.top-close-btn') },
  { id: 'NEWS', btnIndex: 5, el: 'news-info-modal-panel', closer: (p) => p.locator('.menu-btn').last() }, // 戻る
]

// モーダルが横方向に viewport 内へ収まっているか（横はみ出し＝横スクロール禁止）。
// 縦は長文ガイド等で内部スクロールするモーダルがあるため、上端が画面内にあることのみ確認。
async function assertWithinViewport(page: Page, panel: Locator): Promise<void> {
  const vp = page.viewportSize()
  expect(vp).not.toBeNull()
  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  if (box && vp) {
    expect(box.x).toBeGreaterThanOrEqual(-1)
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1)
    // 上端が画面内（見切れ・上方向の飛び出しなし）。
    expect(box.y).toBeGreaterThanOrEqual(-1)
    expect(box.y).toBeLessThan(vp.height)
  }
  // ページ自体に横スクロールが発生していない（モーダルが横にはみ出していない）。
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  expect(ov.sw).toBeLessThanOrEqual(ov.cw + 1)
}

for (const lang of LANGS) {
  test.describe(`modal [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    for (const c of CASES) {
      test(`MODAL-${c.id}-01 ${c.el} 開く・タイトル非空・画面内 [${lang}]`, async ({ page }, info) => {
        await page.locator('.menu-btn').nth(c.btnIndex).click()
        const panel = page.locator(c.el)
        await expect(panel).toBeVisible()
        // タイトル(h3) 非空。news/other/guide/settings/removeads いずれも h3 を持つ。
        const heading = panel.locator('h3').first()
        await expect(heading).toBeVisible()
        await expect(heading).not.toBeEmpty()
        // 1 つだけ表示（重複なし）
        await expect(page.locator(c.el)).toHaveCount(1)
        await assertWithinViewport(page, panel)
        await snapAttach(page, info, `MODAL-${c.id}-01-${lang}`)
      })

      test(`MODAL-${c.id}-02 閉じる→メニュー復帰(背景復帰) [${lang}]`, async ({ page }, info) => {
        await page.locator('.menu-btn').nth(c.btnIndex).click()
        const panel = page.locator(c.el)
        await expect(panel).toBeVisible()
        await c.closer(panel).first().click()
        await expect(panel).toBeHidden()
        // 背景=メニューが復帰（6 ボタン）
        await expect(page.locator('standalone-game-menu')).toBeVisible()
        await expect(page.locator('.menu-btn')).toHaveCount(6)
        await snapAttach(page, info, `MODAL-${c.id}-02-${lang}`)
      })
    }
  })
}
