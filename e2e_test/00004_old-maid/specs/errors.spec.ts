import { test, expect, type Page, type ConsoleMessage, type Request } from '@playwright/test'
import { LANGS, injectAndroidContext, GAME_PATH, snapAttach } from './_helpers'

// ERROR-xxx: console.error / 未処理 Promise / 例外 / リソース/CORS/404 / HTTP400+ / 読込失敗。
// 広告・解析(analytics)の想定失敗は区別して除外する。

// 想定内（広告/解析/トラッキング/メディアの自動再生制約による abort）として無視するパターン。
const IGNORE = [
  /doubleclick|googlesyndication|googleads|adservice|adsbygoogle|gampad|pagead/i,
  /google-analytics|googletagmanager|gtag|analytics|collect\?/i,
  /favicon\.ico/i,
  // BGM/効果音の音声ファイル。autoplay ポリシーや画面遷移で読み込みが ERR_ABORTED に
  // なるのは想定内（不具合ではない）。ads/解析と同様に区別して除外する。
  /\.(ogg|mp3|wav|webm|m4a)(\?|$)/i,
  /bgm|sound|sfx|audio/i,
  /ERR_ABORTED/i,
]

function isIgnored(text: string): boolean {
  return IGNORE.some((re) => re.test(text))
}

// ページを開き、コンソール/例外/失敗リクエストを収集する。
async function collect(page: Page, lang: typeof LANGS[number]) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const badResponses: string[] = []

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      if (!isIgnored(t)) consoleErrors.push(t)
    }
  })
  page.on('pageerror', (err: Error) => {
    if (!isIgnored(err.message)) pageErrors.push(err.message)
  })
  page.on('requestfailed', (req: Request) => {
    const url = req.url()
    if (!isIgnored(url)) failedRequests.push(`${url} :: ${req.failure()?.errorText ?? ''}`)
  })
  page.on('response', (res) => {
    const url = res.url()
    if (res.status() >= 400 && !isIgnored(url)) badResponses.push(`${res.status()} ${url}`)
  })

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

  test(`ERROR-002 ネットワーク: HTTP400+ / 読込失敗なし(広告/解析除外) [${lang}]`, async ({ page }, info) => {
    const r = await collect(page, lang)
    // メニュー全モーダルを一巡して追加リソースの 404/失敗も検出。
    for (const idx of [1, 2, 3, 4, 5]) {
      await page.locator('.menu-btn').nth(idx).click()
      const closer = page.locator('.top-close-btn, .panel-btn, news-info-modal-panel .menu-btn').last()
      await closer.click().catch(() => {})
    }
    await snapAttach(page, info, `ERROR-002-${lang}`)
    expect(r.badResponses, `HTTP>=400: ${r.badResponses.join(' | ')}`).toEqual([])
    expect(r.failedRequests, `failed: ${r.failedRequests.join(' | ')}`).toEqual([])
  })
}
