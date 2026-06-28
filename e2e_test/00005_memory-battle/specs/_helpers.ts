import { type Page, expect, type TestInfo } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 対象ゲーム（このフォルダ=00005_memory-battle 専用）。手本＝00006_high-low/specs と同型。
// 入口＝Android ローダー web-games/android/memory-battle.html（WEB で描画／Flutter 不要）。
// カスタム要素＝memorymonsters-standalone-app（メニュー）→ START で memory-battle-standalone-app
// → memory-battle-game-table（盤面：タイトル/ステージ選択→練習/CPU 対戦）。
export const GAME_PATH = '/web-games/android/memory-battle.html'
export const APP = 'memorymonsters-standalone-app'
export const LANGS = ['en', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

// テスト証跡 JPG の保存先（実機解像度・quality~80）。INFO/ストア画像(PNG)とは別管理。
export const SHOTS_DIR = path.resolve(__dirname, '../screenshots')

// Android 文脈の注入（指示書要件）。language / 初回セットアップ済み / __ANDROID_APP__ / AndroidBilling モック。
// rulesHidden=true で START 直後のルール説明オーバーレイ(memory-battle_rules_hidden)を決定的に省略。
// memory はまだ Flutter 未移行で版数は config 静的値(1.0.0)＝__APP_VERSION__ は注入しない。
export async function injectAndroidContext(page: Page, lang: Lang, rulesHidden = true): Promise<void> {
  await page.addInitScript(
    (args: { l: string; rh: boolean }) => {
      try {
        localStorage.setItem('playingcardshub_language', args.l)
        localStorage.setItem('playingcardshub_initial_setup_completed', 'true')
        if (args.rh) localStorage.setItem('memory-battle_rules_hidden', 'true')
      } catch {
        /* ignore */
      }
      const w = window as unknown as Record<string, unknown>
      w.__ANDROID_APP__ = true
      w.AndroidBilling = {
        getRemoveAdsState: () => JSON.stringify({ removeAds: false, price: '$2.99' }),
        buyRemoveAds: () => {},
        showInterstitialAd: () => true,
        showRecoveryInterstitialAd: () => true,
        debugConsumeRemoveAds: () => {},
      }
    },
    { l: lang, rh: rulesHidden }
  )
}

// メニュー画面まで開いて土台を確認（START/Guide/Settings/RemoveAds/Other/News = 6 ボタン）。
export async function gotoMenu(page: Page, lang: Lang, rulesHidden = true): Promise<void> {
  await injectAndroidContext(page, lang, rulesHidden)
  await page.goto(GAME_PATH)
  await expect(page.locator(APP)).toBeVisible()
  await expect(page.locator('standalone-game-menu')).toBeVisible()
  await expect(page.locator('.menu-btn')).toHaveCount(6)
}

// START → 盤面(memory-battle-game-table)のタイトル＝ステージ選択画面(.stage-select-grid)まで。
// .stage-select-btn は 練習(1) + STAGE 1..10(10) = 11 個。
export async function startToStageSelect(page: Page): Promise<void> {
  await page.locator('.menu-btn').nth(0).click()
  await expect(page.locator('memory-battle-game-table')).toBeVisible()
  await expect(page.locator('.stage-select-grid')).toBeVisible()
  await expect(page.locator('.stage-select-btn')).toHaveCount(11)
}

// 練習(一人用)を最短で開始して盤面(.card-grid)まで。CPU 対戦は使わない（最短 smoke）。
export async function practiceToBoard(page: Page): Promise<void> {
  await startToStageSelect(page)
  await page.locator('.stage-select-btn--practice').click()
  await expect(page.locator('.practice-select')).toBeVisible()
  await page.locator('.primary-btn').first().click()
  await expect(page.locator('.battle-panel')).toBeVisible()
  await expect(page.locator('.card-grid')).toBeVisible()
  // 配り終わり(deal-overlay)後にカードが操作可能になる。最低1枚は出ている。
  await expect(page.locator('.memory-card').first()).toBeVisible()
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

// 横スクロール（はみ出し）が無いことを確認。
export async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const o = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
  expect(o.sw).toBeLessThanOrEqual(o.cw + 1)
}
