import { type Page, expect, type TestInfo } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 対象ゲーム（このフォルダ=00006_high-low 専用）。手本＝00004_old-maid/specs と同型。
export const GAME_PATH = '/web-games/android/high-low.html'
export const LANGS = ['en', 'ja', 'zh'] as const
export type Lang = (typeof LANGS)[number]

// テスト証跡 JPG の保存先（実機解像度・quality~80）。INFO/ストア画像(PNG)とは別管理。
export const SHOTS_DIR = path.resolve(__dirname, '../screenshots')

// Android 文脈の注入（指示書要件）。language / 初回セットアップ済み / ルール非表示(=ゲーム疎通を決定的に) /
// __ANDROID_APP__ / AndroidBilling モック。high-low の version は config 由来なので __APP_VERSION__ は強制しない。
export async function injectAndroidContext(page: Page, lang: Lang): Promise<void> {
  await page.addInitScript((l: string) => {
    try {
      localStorage.setItem('playingcardshub_language', l)
      localStorage.setItem('playingcardshub_initial_setup_completed', 'true')
      localStorage.setItem('highlow_rules_hidden', 'true') // START→直接モード選択（ルール overlay を決定的に省略）
    } catch { /* ignore */ }
    const w = window as unknown as Record<string, unknown>
    w.__ANDROID_APP__ = true
    // Flutter が PackageInfo.version(=pubspec versionName) を注入するのを模倣。VER は yaml 同期が正。
    w.__APP_VERSION__ = '2.0.0'
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

// START → モード選択モーダル（.mode-opt ×3）。mode: full=52 / half=26 / quarter=12(練習・最短)。
export async function startToModeSelect(page: Page): Promise<void> {
  await page.locator('.menu-btn').nth(0).click()
  await expect(page.locator('.mode-opt')).toHaveCount(3)
}

// モードを選んで BET 画面（bet-selector-panel）へ。
export async function selectModeToBet(page: Page, mode: 'full' | 'half' | 'quarter'): Promise<void> {
  const idx = { full: 0, half: 1, quarter: 2 }[mode]
  await page.locator('.mode-opt').nth(idx).click()
  await page.locator('.mode-next').click()
  await expect(page.locator('bet-selector-panel')).toBeVisible()
}

// BET 確定 → 盤面（high-low-game-table の HIGH/LOW が押せる状態）。
export async function betToBoard(page: Page): Promise<void> {
  await page.locator('bet-selector-panel .ok-button').click()
  await expect(page.locator('high-low-game-table')).toBeVisible()
  await expect(page.locator('.btn-high')).toBeVisible()
}

// quarter(12枚=練習) を最短で開始して盤面まで。
export async function quickToBoard(page: Page): Promise<void> {
  await startToModeSelect(page)
  await selectModeToBet(page, 'quarter')
  await betToBoard(page)
}

// 盤面を「最適宣言」で終局(.gameover-screen)まで進める。defend<=7→HIGH / >=8→LOW。
// ゲーム内ロジックを読んで決定的に進める（固定 wait は使わない）。
export async function playToGameover(page: Page, timeoutMs = 40000): Promise<void> {
  const tEnd = Date.now() + timeoutMs
  while (Date.now() < tEnd) {
    const state = await page.evaluate(() => {
      const walk = (root: Document | ShadowRoot, out: (Document | ShadowRoot)[]) => {
        out.push(root)
        root.querySelectorAll('*').forEach((e) => { if ((e as Element & { shadowRoot?: ShadowRoot }).shadowRoot) walk((e as Element & { shadowRoot: ShadowRoot }).shadowRoot, out) })
        return out
      }
      for (const r of walk(document, [])) {
        const gt = r.querySelector('high-low-game-table') as (Element & { G?: { phase?: string; busy?: boolean; defendCard?: { value: number }; players?: { p1?: { role?: string } } }; shadowRoot?: ShadowRoot }) | null
        if (!gt || !gt.G || !gt.shadowRoot) continue
        if (gt.shadowRoot.querySelector('.gameover-screen')) return 'gameover'
        const G = gt.G, sr = gt.shadowRoot
        const p1Attack = G.players?.p1?.role === 'attack'
        if (G.phase === 'declare' && p1Attack && G.defendCard && !G.busy) {
          const sel = G.defendCard.value <= 7 ? '.btn-high' : '.btn-low'
          const btn = sr.querySelector(sel) as HTMLButtonElement | null
          if (btn && !btn.disabled) { btn.click(); return 'declared' }
        }
        const next = sr.querySelector('.btn-next') as HTMLButtonElement | null
        if (next) { next.click(); return 'next' }
        const rec = sr.querySelector('.recovery-ok-btn') as HTMLButtonElement | null
        if (rec) { rec.click(); return 'recovery' }
        return 'wait'
      }
      return 'none'
    })
    if (state === 'gameover') return
    await page.waitForTimeout(state === 'declared' ? 850 : 250) // カード公開アニメ待ち（状態駆動の補助）
  }
  throw new Error('playToGameover: gameover に到達しなかった')
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
