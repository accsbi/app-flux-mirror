import { test, expect, type Page, type ConsoleMessage, type Request } from '@playwright/test'
import { LANGS, injectAndroidContext, GAME_PATH, snapAttach } from './_helpers'

// ERROR-xxx: console.error / 未処理例外 / リソース失敗 / HTTP400+。広告・解析・音の想定失敗は除外。

const IGNORE = [
  /doubleclick|googlesyndication|googleads|adservice|adsbygoogle|gampad|pagead/i,
  /google-analytics|googletagmanager|gtag|analytics|collect\?/i,
  /favicon\.ico/i,
  /\.(ogg|mp3|wav|webm|m4a)(\?|$)/i,
  /bgm|sound|sfx|audio/i,
  /ERR_ABORTED/i,
]
const isIgnored = (t: string) => IGNORE.some((re) => re.test(t))

async function collect(page: Page, lang: typeof LANGS[number]) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const badResponses: string[] = []
  page.on('console', (m: ConsoleMessage) => { if (m.type() === 'error' && !isIgnored(m.text())) consoleErrors.push(m.text()) })
  page.on('pageerror', (e: Error) => { if (!isIgnored(e.message)) pageErrors.push(e.message) })
  page.on('requestfailed', (r: Request) => { if (!isIgnored(r.url())) failedRequests.push(`${r.url()} :: ${r.failure()?.errorText ?? ''}`) })
  page.on('response', (res) => { if (res.status() >= 400 && !isIgnored(res.url())) badResponses.push(`${res.status()} ${res.url()}`) })
  await injectAndroidContext(page, lang)
  await page.goto(GAME_PATH, { waitUntil: 'networkidle' })
  await expect(page.locator('standalone-game-menu')).toBeVisible()
  return { consoleErrors, pageErrors, failedRequests, badResponses }
}

for (const lang of LANGS) {
  test(`ERROR-001 メニュー初期表示で console.error/例外なし(広告/解析除外) [${lang}]`, async ({ page }, info) => {
    const r = await collect(page, lang)
    await snapAttach(page, info, `ERROR-001-${lang}`)
    expect(r.consoleErrors, `console.error: ${r.consoleErrors.join(' | ')}`).toEqual([])
    expect(r.pageErrors, `pageerror: ${r.pageErrors.join(' | ')}`).toEqual([])
  })

  test(`ERROR-002 ネットワーク: HTTP400+/読込失敗なし(全モーダル一巡・広告/解析除外) [${lang}]`, async ({ page }, info) => {
    const r = await collect(page, lang)
    for (const idx of [3, 4, 5]) {
      await page.locator('.menu-btn').nth(idx).click()
      await page.locator('.top-close-btn, .panel-btn, news-info-modal-panel .menu-btn').last().click().catch(() => {})
    }
    await snapAttach(page, info, `ERROR-002-${lang}`)
    expect(r.badResponses, `HTTP>=400: ${r.badResponses.join(' | ')}`).toEqual([])
    expect(r.failedRequests, `failed: ${r.failedRequests.join(' | ')}`).toEqual([])
  })
}
