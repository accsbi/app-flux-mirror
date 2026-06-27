import { test, expect } from '@playwright/test'
import { LANGS, gotoMenu, startToModeSelect, selectModeToBet, betToBoard, snapAttach } from './_helpers'

// GAME-xxx: ゲーム開始疎通（START→モード→BET→盤面が開き操作可能まで）。勝敗ロジック詳細は対象外(§1.3)。

for (const lang of LANGS) {
  test.describe(`game start [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    test(`GAME-001 START → モード選択(full/half/quarter=練習)が3択表示 [${lang}]`, async ({ page }, info) => {
      await startToModeSelect(page)
      await expect(page.locator('.mode-opt')).toHaveCount(3)
      await expect(page.locator('.mode-next')).toBeEnabled()
      await snapAttach(page, info, `GAME-001-${lang}`)
    })

    test(`GAME-002 BET 画面が操作可能(± と START ボタン) [${lang}]`, async ({ page }, info) => {
      await startToModeSelect(page)
      await selectModeToBet(page, 'quarter')
      const bet = page.locator('bet-selector-panel')
      await expect(bet.locator('.key-step')).toHaveCount(2)
      await expect(bet.locator('.ok-button')).toBeVisible()
      await expect(bet.locator('.ok-button')).toBeEnabled()
      await snapAttach(page, info, `GAME-002-${lang}`)
    })

    test(`GAME-003 BET ＋ で表示値が増える(テンキー無し・hold step) [${lang}]`, async ({ page }, info) => {
      await startToModeSelect(page)
      await selectModeToBet(page, 'quarter')
      const bet = page.locator('bet-selector-panel')
      const display = bet.locator('.bet-display')
      const before = parseInt((await display.innerText()).replace(/\D/g, ''), 10)
      // ＋(末尾の .key-step)を mousedown/mouseup（hold 実装）で1回。
      const plus = bet.locator('.key-step').last()
      await plus.dispatchEvent('mousedown')
      await plus.dispatchEvent('mouseup')
      await expect(async () => {
        const after = parseInt((await display.innerText()).replace(/\D/g, ''), 10)
        expect(after).toBeGreaterThan(before)
      }).toPass()
      await snapAttach(page, info, `GAME-003-${lang}`)
    })

    test(`GAME-004 BET 確定で盤面(high-low-game-table)・HIGH/LOW・COIN/BET 表示 [${lang}]`, async ({ page }, info) => {
      await startToModeSelect(page)
      await selectModeToBet(page, 'quarter')
      await betToBoard(page)
      await expect(page.locator('bet-selector-panel')).toBeHidden()
      await expect(page.locator('.btn-high')).toBeVisible()
      await expect(page.locator('.btn-low')).toBeVisible()
      await expect(page.locator('.bet-status')).toContainText('BET')
      await snapAttach(page, info, `GAME-004-${lang}`)
    })

    test(`GAME-005 盤面ヘッダーから設定を開ける(ゲーム中も操作可) [${lang}]`, async ({ page }, info) => {
      await startToModeSelect(page)
      await selectModeToBet(page, 'quarter')
      await betToBoard(page)
      const header = page.locator('game-top-header')
      await expect(header).toBeVisible()
      // toolbar: 0=home,1=settings,2=guide。
      await header.locator('.toolbar-btn').nth(1).click()
      await expect(page.locator('settings-panel')).toBeVisible()
      await snapAttach(page, info, `GAME-005-${lang}`)
    })

    test(`GAME-006 HIGH 宣言で判定(カード公開)が進む [${lang}]`, async ({ page }, info) => {
      await startToModeSelect(page)
      await selectModeToBet(page, 'quarter')
      await betToBoard(page)
      const high = page.locator('.btn-high')
      await expect(high).toBeEnabled()
      await high.click()
      // 宣言後は次手(.btn-next)か終局へ＝盤面が反応する。
      await expect(page.locator('.btn-next, .gameover-screen').first()).toBeVisible({ timeout: 8000 })
      await snapAttach(page, info, `GAME-006-${lang}`)
    })
  })
}
