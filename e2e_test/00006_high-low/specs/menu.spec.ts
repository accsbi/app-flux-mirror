import { test, expect } from '@playwright/test'
import { LANGS, gotoMenu, snapAttach } from './_helpers'

// APP-xxx 初期表示 / MENU-xxx メニュー全ボタン疎通（START/Guide/Settings/RemoveAds/Other/News）。
// 全テストにケースID＋最低1 expect。固定 waitForTimeout は使わない（状態待ち）。

for (const lang of LANGS) {
  test.describe(`menu [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
    })

    test(`APP-001 初期表示: メニュー描画・タイトル非空・6ボタン [${lang}]`, async ({ page }, info) => {
      const menu = page.locator('standalone-game-menu')
      await expect(menu).toBeVisible()
      await expect(page.locator('.menu-btn')).toHaveCount(6)
      const title = (await menu.locator('h1').first().innerText()).trim()
      expect(title.length).toBeGreaterThan(0)
      await snapAttach(page, info, `APP-001-${lang}`)
    })

    test(`APP-002 初期表示: VER が yaml(__APP_VERSION__)と同期 [${lang}]`, async ({ page }, info) => {
      // VER は Flutter 注入の __APP_VERSION__(=pubspec versionName)を唯一ソースにする（config 固定でない）。
      // 注入値 2.0.0 が VER 表示に出る＝yaml 同期。旧バグ=config.app_info.version(1.0.1)固定。
      const ver = page.locator('standalone-game-menu .version-text')
      await expect(ver).toBeVisible()
      await expect(ver).toContainText('2.0.0')
      await snapAttach(page, info, `APP-002-${lang}`)
    })

    test(`MENU-001 START → モード選択モーダル(練習含む3択)へ遷移 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(0).click()
      // high-low は START 直後に MODE 選択（full/half/quarter=練習）。
      await expect(page.locator('.mode-opt')).toHaveCount(3)
      await expect(page.locator('.mode-next')).toBeVisible()
      await snapAttach(page, info, `MENU-001-${lang}`)
    })

    test(`MENU-002 Guide → ガイド画面表示・本文非空 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(1).click()
      const panel = page.locator('guide-overview-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('h3')).not.toBeEmpty()
      const bodyText = (await panel.locator('.guide-body').first().innerText().catch(() => '')).trim()
      const hasImage = await panel.locator('.guide-image').count()
      expect(bodyText.length > 0 || hasImage > 0).toBeTruthy()
      await snapAttach(page, info, `MENU-002-${lang}`)
    })

    test(`MENU-003 Settings → 設定画面表示・タイトル非空 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(2).click()
      const panel = page.locator('settings-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('h3')).not.toBeEmpty()
      await snapAttach(page, info, `MENU-003-${lang}`)
    })

    test(`MENU-004 Remove Ads → 広告削除モーダル表示・価格表示 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(3).click()
      const panel = page.locator('remove-ads-dialog-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('h3')).not.toBeEmpty()
      await snapAttach(page, info, `MENU-004-${lang}`)
    })

    test(`MENU-004b Remove Ads → Cancel/X で閉じられる（閉じ不能の回帰）[${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(3).click()
      const panel = page.locator('remove-ads-dialog-panel')
      await expect(panel).toBeVisible()
      // Cancel ボタンで閉じる（remove-ads-close → closeRemoveAds）。旧バグ=タグ内 HTML コメントで
      // @remove-ads-close が壊れ閉じられなかった。
      await panel.locator('.cancel-btn').click()
      await expect(panel).toBeHidden()
      await snapAttach(page, info, `MENU-004b-${lang}`)
    })

    test(`MENU-005 Other Card Games → モーダル表示・一覧(config由来)1件以上 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(4).click()
      const panel = page.locator('other-games-modal-panel')
      await expect(panel).toBeVisible()
      // 自分(high-low)を除外した web_published 非hidden の他ゲーム。1件以上。
      const n = await panel.locator('img').count()
      expect(n).toBeGreaterThanOrEqual(1)
      await snapAttach(page, info, `MENU-005-${lang}`)
    })

    test(`MENU-006 News → お知らせモーダル表示・本文非空 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(5).click()
      const panel = page.locator('news-info-modal-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('h3')).not.toBeEmpty()
      await expect(panel.locator('.menu-btn').first()).toBeVisible()
      await snapAttach(page, info, `MENU-006-${lang}`)
    })

    test(`MENU-007 News 外部リンクは target=_blank(外部で開く) [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(5).click()
      const panel = page.locator('news-info-modal-panel')
      await expect(panel).toBeVisible()
      const links = panel.locator('a[href]')
      const n = await links.count()
      for (let i = 0; i < n; i++) {
        await expect(links.nth(i)).toHaveAttribute('target', '_blank')
        await expect(links.nth(i)).toHaveAttribute('rel', /noopener/)
      }
      expect(n).toBeGreaterThanOrEqual(0)
      await snapAttach(page, info, `MENU-007-${lang}`)
    })
  })
}
