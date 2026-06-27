import { test, expect } from '@playwright/test'
import { LANGS, gotoMenu, quickToBoard, playToGameover, snapAttach } from './_helpers'

// UI-xxx: 終了画面の操作2ボタン（もう一度遊ぶ／ホーム）の「寸法統一」と「豆粒禁止(≥88px)」を自動回帰。
// 2026-06-27 不具合: ghost(ホーム)だけ font 24px＋透明で WebView 上 min-height が効かず潰れた＝
// 「統一されてない・豆粒」と指摘。固定 height で両ボタン同一にした修正をここで担保する。

// shadow DOM を貫通して .gameover-screen 内の指定要素の boundingRect を返す。
async function rectInGameover(page: import('@playwright/test').Page, sel: string) {
  return page.evaluate((s) => {
    const walk = (root: Document | ShadowRoot, out: (Document | ShadowRoot)[]) => {
      out.push(root)
      root.querySelectorAll('*').forEach((e) => { const sr = (e as Element & { shadowRoot?: ShadowRoot }).shadowRoot; if (sr) walk(sr, out) })
      return out
    }
    for (const r of walk(document, [])) {
      const go = r.querySelector('.gameover-screen')
      if (go) {
        const el = go.querySelector(s)
        if (el) { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) } }
      }
    }
    return null
  }, sel)
}

for (const lang of LANGS) {
  test.describe(`ui gameover [${lang}]`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoMenu(page, lang)
      await quickToBoard(page)
      await playToGameover(page)
    })

    test(`UI-001 終了2ボタンが「完全同一寸法」(統一)・豆粒でない [${lang}]`, async ({ page }, info) => {
      const playAgain = await rectInGameover(page, '.btn-start')
      const home = await rectInGameover(page, '.btn-ghost')
      expect(playAgain, 'Play Again ボタンが見つからない').not.toBeNull()
      expect(home, 'Home ボタンが見つからない').not.toBeNull()
      if (playAgain && home) {
        // 統一: 高さ・幅が一致（±1px の丸め許容）。旧不具合は home が潰れて不一致だった。
        expect(Math.abs(playAgain.h - home.h)).toBeLessThanOrEqual(1)
        expect(Math.abs(playAgain.w - home.w)).toBeLessThanOrEqual(1)
        // 豆粒禁止: 操作ボタン on-screen 縦幅 ≥88px（Pixel5 で stage136×scale≒99px）。
        expect(home.h).toBeGreaterThanOrEqual(88)
        expect(playAgain.h).toBeGreaterThanOrEqual(88)
      }
      await snapAttach(page, info, `UI-001-${lang}`)
    })

    test(`UI-002 終了画面の勝敗テキスト(winner)が大きく可読 [${lang}]`, async ({ page }, info) => {
      const winner = await rectInGameover(page, '.winner-txt')
      expect(winner, 'winner-txt が無い').not.toBeNull()
      if (winner) {
        expect(winner.h).toBeGreaterThanOrEqual(36) // 48px×scale ≒ 35-44px。豆粒でない。
        expect(winner.w).toBeGreaterThan(0)
      }
      await snapAttach(page, info, `UI-002-${lang}`)
    })

    test(`UI-003 もう一度遊ぶ で新ゲーム(盤面)へ戻れる [${lang}]`, async ({ page }, info) => {
      // 統一ボタンが実際に機能すること（疎通）。
      await page.evaluate(() => {
        const walk = (root: Document | ShadowRoot, out: (Document | ShadowRoot)[]) => {
          out.push(root); root.querySelectorAll('*').forEach((e) => { const sr = (e as Element & { shadowRoot?: ShadowRoot }).shadowRoot; if (sr) walk(sr, out) }); return out
        }
        for (const r of walk(document, [])) {
          const go = r.querySelector('.gameover-screen')
          if (go) { (go.querySelector('.btn-start') as HTMLButtonElement | null)?.click(); return }
        }
      })
      // restartGame → beginStartFlow ＝ モード選択(.mode-opt)に戻る（再ゲーム開始導線）。
      await expect(page.locator('.mode-opt').first()).toBeVisible({ timeout: 8000 })
      await expect(page.locator('.mode-opt')).toHaveCount(3)
      await snapAttach(page, info, `UI-003-${lang}`)
    })
  })
}
