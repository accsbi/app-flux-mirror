// ゲーム完走→結果(R-1/R-2/勝敗)に特化。配り→引き番2タップ→OK連打→over まで。
import pw from '/home/dev/wsl_pj/test/test_high_low/node_modules/playwright/index.js'
const { chromium } = pw
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const IMG = '/home/dev/wsl_pj/playing_cards/e2e_test/00004_old-maid/img/'
const URL = 'http://127.0.0.1:5190/web-games/android/old-maid.html'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })
await ctx.addInitScript(() => { try { localStorage.setItem('playingcardshub_language', 'ja'); localStorage.setItem('playingcardshub_initial_setup_completed', 'true') } catch (e) {} })
await ctx.addInitScript(() => { window.WALK = '(()=>{const R=[];const w=r=>{R.push(r);r.querySelectorAll&&r.querySelectorAll("*").forEach(e=>{if(e.shadowRoot)w(e.shadowRoot)})};w(document);return R})()' })
const p = await ctx.newPage()
const ev = (fn) => p.evaluate(fn)
const findText = (t) => p.evaluate((t) => { const R = eval(WALK); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('*') : [])) { if ((el.textContent || '').replace(/\s+/g, ' ').includes(t)) return true } return false }, t)
const click = (t) => p.evaluate((t) => { const R = eval(WALK); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('button,a') : [])) { if ((el.textContent || '').trim().toUpperCase().includes(t)) { el.click(); return 1 } } return 0 }, t)
const count = (s) => p.evaluate((s) => { const R = eval(WALK); let n = 0; for (const r of R) if (r.querySelectorAll) n += r.querySelectorAll(s).length; return n }, s)
const tapFan = () => p.evaluate(() => { const R = eval(WALK); for (const r of R) { const im = r.querySelector && r.querySelector('.fan img'); if (im) { im.click(); return 1 } } return 0 })

await p.goto(URL, { waitUntil: 'networkidle' }); await sleep(1200)
await click('スタート'); await sleep(1200); await click('START'); await sleep(2500)
let over = false, draws = 0, twoTapOk = false
for (let step = 0; step < 130; step++) {
  if (await findText('Game over') || await findText('Retry') || (await count('.coin-delta')) > 0 || (await count('.seat-avatars.is-result')) > 0) { over = true; break }
  if ((await count('.fan img')) > 0) {
    await tapFan(); await sleep(300); const s1 = await count('.fan img.selected')
    await tapFan(); await sleep(240); const pk = await count('.fan img.picking')
    if (s1 >= 1 && pk >= 1) twoTapOk = true
    draws++; await sleep(750); continue
  }
  if (await click('OK') || await click('确定') || await click('SHUFFLE') || await click('シャッフル')) { await sleep(800); continue }
  await sleep(650)
}
await p.screenshot({ path: IMG + 'ai-result.jpg', type: 'jpeg', quality: 84 })
const cd = await ev(() => { const R = eval(WALK); for (const r of R) { const e = r.querySelector && r.querySelector('.coin-delta'); if (e) return (e.textContent || '').trim() } return null })
const ranks = await count('.seat-rank')
console.log(JSON.stringify({ over, draws, twoTapOk, coinDelta: cd, seatRanks: ranks }))
await b.close()
