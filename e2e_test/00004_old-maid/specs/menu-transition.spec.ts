import { test, expect } from '@playwright/test'
import { snapAttach } from './_helpers'

// メニュー各ボタンの遷移テスト（@playwright/test・自動判定）。
// 「モーダルが表示されるまで」を確認。中身のスクロール/OK等は別 spec（機能テスト）で行う。
// 実機解像度(Pixel5)・en/ja/zh。Other Card Games の一覧は config(card-games-list.json)由来の5件をアサート。
// 各テストは ID 付き JPG を testInfo.attach() で HTML レポートへ紐付ける（証跡）。

const PATH = '/web-games/android/old-maid.html'
const LANGS = ['en', 'ja', 'zh'] as const

for (const lang of LANGS) {
  test.describe(`menu transitions [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((l: string) => {
        try {
          localStorage.setItem('playingcardshub_language', l)
          localStorage.setItem('playingcardshub_initial_setup_completed', 'true')
        } catch { /* ignore */ }
        const w = window as unknown as Record<string, unknown>
        w.__ANDROID_APP__ = true
        w.__APP_VERSION__ = '1.0.6'
        w.AndroidBilling = {
          getRemoveAdsState: () => JSON.stringify({ removeAds: false, price: '$2.99' }),
          buyRemoveAds: () => {},
          showInterstitialAd: () => true,
          showRecoveryInterstitialAd: () => true,
          debugConsumeRemoveAds: () => {},
        }
      }, lang)
      await page.goto(PATH)
      await expect(page.locator('standalone-game-menu')).toBeVisible()
      await expect(page.locator('.menu-btn')).toHaveCount(6) // START/Guide/Settings/RemoveAds/Other/News
    })

    test('TR-01 START → ゲーム/BET画面へ遷移', async ({ page }, info) => {
      await page.locator('.menu-btn').nth(0).click()
      await expect(page.locator('bet-selector-panel')).toBeVisible()
      await snapAttach(page, info, `TR-01-${lang}`)
    })

    test('TR-02 Guide/Overview → ガイドモーダル表示', async ({ page }, info) => {
      await page.locator('.menu-btn').nth(1).click()
      await expect(page.locator('guide-overview-panel')).toBeVisible()
      await snapAttach(page, info, `TR-02-${lang}`)
    })

    test('TR-03 Settings → 設定モーダル表示', async ({ page }, info) => {
      await page.locator('.menu-btn').nth(2).click()
      await expect(page.locator('settings-panel')).toBeVisible()
      await snapAttach(page, info, `TR-03-${lang}`)
    })

    test('TR-04 Remove Ads → 広告削除モーダル表示', async ({ page }, info) => {
      await page.locator('.menu-btn').nth(3).click()
      await expect(page.locator('remove-ads-dialog-panel')).toBeVisible()
      await snapAttach(page, info, `TR-04-${lang}`)
    })

    test('TR-05 Other Card Games → モーダル表示・一覧5件(config由来)', async ({ page }, info) => {
      await page.locator('.menu-btn').nth(4).click()
      await expect(page.locator('other-games-modal-panel')).toBeVisible()
      // card-games-list.json: old-maid除外・web_published・非hidden = 5件
      // (Blackjack / Poker / Casino War / Memory Battle / High&Low[comingsoon])
      await expect(page.locator('other-games-modal-panel img')).toHaveCount(5)
      await snapAttach(page, info, `TR-05-${lang}`)
    })

    test('TR-06 News/Updates → お知らせモーダル表示', async ({ page }, info) => {
      await page.locator('.menu-btn').nth(5).click()
      await expect(page.locator('news-info-modal-panel')).toBeVisible()
      await snapAttach(page, info, `TR-06-${lang}`)
    })
  })
}
