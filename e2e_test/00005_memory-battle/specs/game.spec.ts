import { test, expect } from '@playwright/test'
import { LANGS, gotoMenu, startToStageSelect, practiceToBoard, snapAttach } from './_helpers'

// GAME-xxx: ゲーム開始疎通（START→ステージ選択→練習盤面が描画され操作可能まで）。
// CPU 対戦の完走は対象外（§1.3）。練習(一人用)を最短 smoke。

for (const lang of LANGS) {
  test.describe(`game start [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    test(`GAME-001 START → ステージ選択(練習+STAGE1..10=11・敵サムネ)表示 [${lang}]`, async ({ page }, info) => {
      await startToStageSelect(page)
      await expect(page.locator('.stage-select-btn')).toHaveCount(11)
      // ステージサムネ画像が出ている（敵サムネ）。
      expect(await page.locator('.stage-select-thumb').count()).toBeGreaterThanOrEqual(1)
      await snapAttach(page, info, `GAME-001-${lang}`)
    })

    test(`GAME-002 練習を選ぶ → 練習設定(カード数選択+開始ボタン)表示 [${lang}]`, async ({ page }, info) => {
      await startToStageSelect(page)
      await page.locator('.stage-select-btn--practice').click()
      await expect(page.locator('.practice-select')).toBeVisible()
      await expect(page.locator('.primary-btn').first()).toBeVisible()
      await expect(page.locator('.primary-btn').first()).toBeEnabled()
      await snapAttach(page, info, `GAME-002-${lang}`)
    })

    test(`GAME-003 練習開始 → 盤面(card-grid・memory-card・離脱ボタン)が描画 [${lang}]`, async ({ page }, info) => {
      await practiceToBoard(page)
      await expect(page.locator('.battle-panel')).toBeVisible()
      await expect(page.locator('.card-grid')).toBeVisible()
      // カードは配りアニメで順次追加される（默认 20枚=10ペア）。配り終わりまでポーリング。
      await expect.poll(async () => page.locator('.memory-card').count(), { timeout: 8000 }).toBeGreaterThanOrEqual(12)
      await expect(page.locator('.quit-battle-btn')).toBeVisible()
      await snapAttach(page, info, `GAME-003-${lang}`)
    })

    test(`GAME-004 練習盤面でカードを1枚タップしても盤面が崩れない(1手 smoke) [${lang}]`, async ({ page }, info) => {
      await practiceToBoard(page)
      // 配り終わり後、操作可能になった1枚をタップ（busy 中は disabled なので enabled を待つ）。
      const firstEnabled = page.locator('.memory-card:not([disabled])').first()
      await expect(firstEnabled).toBeVisible({ timeout: 8000 })
      await firstEnabled.click()
      // タップ後も盤面(card-grid)が保持され、致命的に消えない。
      await expect(page.locator('.card-grid')).toBeVisible()
      await snapAttach(page, info, `GAME-004-${lang}`)
    })

    test(`GAME-005 STAGE 1 を選ぶ → 対戦前画面(content-card)が表示(CPU戦入口・smoke) [${lang}]`, async ({ page }, info) => {
      await startToStageSelect(page)
      // index1 = STAGE 1（index0 は練習）。アンロック済みのはず。
      await page.locator('.stage-select-btn').nth(1).click()
      await expect(page.locator('.content-card')).toBeVisible()
      await expect(page.locator('.stack-actions')).toBeVisible()
      await snapAttach(page, info, `GAME-005-${lang}`)
    })
  })
}
