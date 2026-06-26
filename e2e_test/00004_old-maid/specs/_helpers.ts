import { type Page, expect, type TestInfo } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 対象ゲーム（このフォルダ=00004_old-maid 専用）。他ゲームは各 <game>/specs/ に同型で配置する。
export const GAME_PATH = '/web-games/android/old-maid.html'
export const LANGS = ['en', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

// テスト証跡 JPG の保存先（実機解像度・quality~80）。INFO/ストア画像(PNG)とは別管理。
export const SHOTS_DIR = path.resolve(__dirname, '../screenshots')

// Android 文脈の注入（指示書要件）。各 spec の beforeEach で page.addInitScript として使う。
// language(en/ja/zh) / 初回セットアップ済み / __ANDROID_APP__ / __APP_VERSION__ / AndroidBilling モック。
export async function injectAndroidContext(page: Page, lang: Lang): Promise<void> {
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
}

// メニュー画面まで開いて土台を確認（START/Guide/Settings/RemoveAds/Other/News = 6 ボタン）。
export async function gotoMenu(page: Page, lang: Lang): Promise<void> {
  await injectAndroidContext(page, lang)
  await page.goto(GAME_PATH)
  await expect(page.locator('standalone-game-menu')).toBeVisible()
  await expect(page.locator('.menu-btn')).toHaveCount(6)
}

// START 直後に出る初回ルール overlay（.rules-card / .rules-ok）を閉じる。
// 出ていなければ何もしない（2回目以降は localStorage で非表示）。
export async function dismissRulesOverlay(page: Page): Promise<void> {
  const ok = page.locator('.rules-ok')
  if (await ok.count()) {
    await ok.first().click()
    await expect(ok).toHaveCount(0)
  }
}

// テスト証跡 JPG（quality~80）を ID 名で保存。RESPONSIVE は viewport を suffix に渡す。
export async function snap(page: Page, id: string, suffix = ''): Promise<string> {
  const name = suffix ? `${id}-${suffix}.jpg` : `${id}.jpg`
  const file = path.join(SHOTS_DIR, name)
  await page.screenshot({ path: file, type: 'jpeg', quality: 80, fullPage: false })
  return file
}

// 失敗時でも撮れるよう attach 兼ねた撮影（TestInfo があれば report にも添付）。
export async function snapAttach(page: Page, info: TestInfo, id: string, suffix = ''): Promise<void> {
  const file = await snap(page, id, suffix)
  await info.attach(`${id}${suffix ? '-' + suffix : ''}`, { path: file, contentType: 'image/jpeg' })
}
