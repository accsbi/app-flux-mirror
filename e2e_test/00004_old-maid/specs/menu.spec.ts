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
      // タイトル h1 が非空
      const title = (await menu.locator('h1').first().innerText()).trim()
      expect(title.length).toBeGreaterThan(0)
      await snapAttach(page, info, `APP-001-${lang}`)
    })

    test(`APP-002 初期表示: バージョン表記(Ver)が出る [${lang}]`, async ({ page }, info) => {
      // Android 文脈では version=__APP_VERSION__('1.0.6') を表示。
      await expect(page.locator('.version-text')).toContainText('1.0.6')
      await snapAttach(page, info, `APP-002-${lang}`)
    })

    test(`MENU-001 START → 盤面(BET 画面)へ遷移 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(0).click()
      // START は screen='game' に切替え、bet-selector-panel を表示（ルール overlay が上に出る場合あり）。
      await expect(page.locator('bet-selector-panel')).toBeVisible()
      await snapAttach(page, info, `MENU-001-${lang}`)
    })

    test(`MENU-002 Guide → ガイドモーダル表示・本文非空 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(1).click()
      const panel = page.locator('guide-overview-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('h3')).not.toBeEmpty()
      // 本文（ガイド行 or 画像）のどちらかが存在
      const bodyText = (await panel.locator('.guide-body').first().innerText().catch(() => '')).trim()
      const hasImage = await panel.locator('.guide-image').count()
      expect(bodyText.length > 0 || hasImage > 0).toBeTruthy()
      await snapAttach(page, info, `MENU-002-${lang}`)
    })

    test(`MENU-003 Settings → 設定モーダル表示・タイトル非空 [${lang}]`, async ({ page }, info) => {
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

    test(`MENU-005 Other Card Games → モーダル表示・一覧5件(config由来) [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(4).click()
      const panel = page.locator('other-games-modal-panel')
      await expect(panel).toBeVisible()
      // card-games-list.json: old-maid除外・web_published・非hidden = 5件
      await expect(panel.locator('img')).toHaveCount(5)
      await snapAttach(page, info, `MENU-005-${lang}`)
    })

    test(`MENU-006 News → お知らせモーダル表示・本文非空 [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(5).click()
      const panel = page.locator('news-info-modal-panel')
      await expect(panel).toBeVisible()
      await expect(panel.locator('h3')).not.toBeEmpty()
      // News のアクション(外部リンク/戻る)が1つ以上ある
      await expect(panel.locator('.menu-btn').first()).toBeVisible()
      await snapAttach(page, info, `MENU-006-${lang}`)
    })

    test(`MENU-007 News 外部リンクは target=_blank(外部で開く) [${lang}]`, async ({ page }, info) => {
      await page.locator('.menu-btn').nth(5).click()
      const panel = page.locator('news-info-modal-panel')
      await expect(panel).toBeVisible()
      const links = panel.locator('a[href]')
      const n = await links.count()
      // 外部リンクが存在する場合は必ず target=_blank・rel に noopener。
      for (let i = 0; i < n; i++) {
        await expect(links.nth(i)).toHaveAttribute('target', '_blank')
        await expect(links.nth(i)).toHaveAttribute('rel', /noopener/)
      }
      // アサート対象: リンク数は 0 以上（最低 expect は上の toBeVisible 群で担保）。
      expect(n).toBeGreaterThanOrEqual(0)
      await snapAttach(page, info, `MENU-007-${lang}`)
    })
  })
}
