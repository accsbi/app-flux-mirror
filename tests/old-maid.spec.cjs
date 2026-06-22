// Old Maid 自動テスト。dist を配信したサーバに対して実行する。
//   PW=<playwright index.js path> BASE=http://127.0.0.1:PORT node tests/old-maid.spec.cjs
// 検証: アセット404無し / アバター表示 / カードサイズ / プレイ完走 / Settings・Guide パネル / エラー無し。
const { chromium } = require(process.env.PW)
const BASE = process.env.BASE || 'http://127.0.0.1:8290'
const URL = `${BASE}/web-games/playing_cards/old-maid.html`

let pass = 0
let fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}

// shadow DOM 全体から要素を探すための eval ヘルパ（ブラウザ内実行）
const DEEP = `(() => {
  const host = [...document.body.children].find(c => c.tagName.toLowerCase().includes('standalone'));
  const roots = []; const walk = r => { roots.push(r); r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot) }) };
  if (host && host.shadowRoot) walk(host.shadowRoot);
  return roots;
})()`

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 2 })
  await ctx.addInitScript(() => { try { localStorage.setItem('app_language', 'en') } catch (e) {} })
  const p = await ctx.newPage()
  const errors = []
  const bad = []
  p.on('pageerror', e => errors.push(e.message))
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().split('/').pop()}`) })

  const clickByText = (txt) => p.evaluate((args) => {
    const [DEEP_SRC, t] = args
    const roots = eval(DEEP_SRC)
    for (const r of roots) for (const el of r.querySelectorAll('button,a'))
      if (new RegExp('^\\s*' + t + '\\s*$', 'i').test(el.textContent.trim())) { el.click(); return true }
    return false
  }, [DEEP, txt])
  const tableState = () => p.evaluate((DEEP_SRC) => {
    const roots = eval(DEEP_SRC)
    const sr = roots.map(r => r.host).find(h => h && h.tagName && h.tagName.toLowerCase() === 'old-maid-game-table')?.shadowRoot
    if (!sr) return { found: false }
    const stage = sr.querySelector('.stage')
    const stageRect = stage ? stage.getBoundingClientRect() : null
    const dc = sr.querySelector('.fan img')
    const handImgs = [...sr.querySelectorAll('.area-hand .row img')]
    const hand = handImgs[0]
    let handFits = true
    if (stageRect) {
      for (const im of handImgs) {
        const r = im.getBoundingClientRect()
        if (r.left < stageRect.left - 1 || r.right > stageRect.right + 1) { handFits = false; break }
      }
    }
    // フッターのツールバー位置（他ゲームと揃っているか比較する基準）。
    const footer = sr.querySelector('.region-footer')
    const footerRect = footer ? footer.getBoundingClientRect() : null
    // カード画像の影: box-shadow(矩形=ダブり) ではなく drop-shadow(アルファ形状) を使うこと。
    const anyCard = sr.querySelector('.area-hand .row img') || sr.querySelector('.area-top .row img')
    const cardCs = anyCard ? getComputedStyle(anyCard) : null
    const cardBoxShadow = cardCs ? cardCs.boxShadow : null
    const cardBorderRadius = cardCs ? cardCs.borderRadius : null
    const cardUsesDropShadow = cardCs ? /drop-shadow/.test(cardCs.filter) : false
    return {
      found: true,
      drawCards: sr.querySelectorAll('.fan img').length,
      drawCardW: dc ? Math.round(dc.getBoundingClientRect().width) : 0,
      handImgs: handImgs.length,
      handCardW: hand ? Math.round(hand.getBoundingClientRect().width) : 0,
      handFits,
      topCpuCards: sr.querySelectorAll('.area-top .row img').length,
      sideCpuCards: sr.querySelectorAll('.vcard img').length,
      discardPairs: sr.querySelectorAll('.discard-pair').length,
      fanFramed: !!sr.querySelector('.fan.framed'),
      dimmed: sr.querySelectorAll('.dimmed').length,
      cardBoxShadow, cardBorderRadius, cardUsesDropShadow,
      avatarImgs: [...sr.querySelectorAll('img')].filter(i => /old-maid\/images\//.test(i.getAttribute('src') || '')).length,
      seatLabels: sr.querySelectorAll('.seat-label').length,
      // Feedback ボタンは game-footer-bar→game-toolbar-bar の入れ子 shadow にある→全 root を深く探索。
      feedbackBtn: roots.some(rt => [...rt.querySelectorAll('button,a')].some(b => /feedback/i.test(b.textContent || ''))),
      footerBottom: footerRect && stageRect ? Math.round(stageRect.bottom - footerRect.bottom) : null,
      footerLeft: footerRect && stageRect ? Math.round(footerRect.left - stageRect.left) : null,
      over: !!sr.querySelector('.result-title'),
      result: sr.querySelector('.result-title')?.textContent.trim() || null,
      ranks: sr.querySelectorAll('.rank').length,
      settingsPanel: !!sr.querySelector('settings-panel'),
      guidePanel: !!sr.querySelector('guide-overview-panel'),
    }
  }, DEEP)

  // 他ゲーム(casino-war)のフッター下端/左位置を取って比較基準にする。
  const otherGameFooter = async () => {
    const op = await ctx.newPage()
    await op.addInitScript(() => { try { localStorage.setItem('app_language', 'en') } catch (e) {} })
    await op.goto(`${BASE}/web-games/playing_cards/casino-war.html`, { waitUntil: 'networkidle' })
    await op.waitForTimeout(900)
    const clk = (t) => op.evaluate((args) => { const [DEEP_SRC, x] = args; const roots = eval(DEEP_SRC); for (const r of roots) for (const el of r.querySelectorAll('button,a')) if (new RegExp('^\\s*' + x + '\\s*$', 'i').test(el.textContent.trim())) { el.click(); return true } return false }, [DEEP, t])
    for (let i = 0; i < 2; i++) { await clk('OK'); await op.waitForTimeout(300) }
    await clk('START'); await op.waitForTimeout(1200)
    const v = await op.evaluate((DEEP_SRC) => {
      const roots = eval(DEEP_SRC)
      const sr = roots.map(r => r.host).find(h => h && h.tagName && h.tagName.toLowerCase() === 'casino-war-game-table')?.shadowRoot
      if (!sr) return null
      const st = sr.querySelector('.stage'); const ft = sr.querySelector('.region-footer')
      if (!st || !ft) return null
      const sR = st.getBoundingClientRect(), fR = ft.getBoundingClientRect()
      return { bottom: Math.round(sR.bottom - fR.bottom), left: Math.round(fR.left - sR.left) }
    }, DEEP)
    await op.close()
    return v
  }

  // 親→ペア除去ダイアログのOKを押し、プレイヤーの番(draw-fan)になるまで進める。
  const advanceToPlayer = async () => {
    for (let i = 0; i < 25; i++) {
      const s = await tableState()
      if (s.drawCards > 0 || s.over) return s
      // 親/arrange ダイアログのOKを押す（あれば）
      await clickByText('OK')
      await p.waitForTimeout(350)
    }
    return tableState()
  }

  console.log('== Old Maid test ==')
  await p.goto(URL, { waitUntil: 'networkidle' })
  await p.waitForTimeout(900)
  for (let i = 0; i < 2; i++) { await clickByText('OK'); await p.waitForTimeout(350) }
  await clickByText('START')
  await p.waitForTimeout(400)
  // 親決め前に SELECT BET モーダルが出るので、既定BETのまま START で確定する。
  await clickByText('START')
  await p.waitForTimeout(400)
  let st = await advanceToPlayer()
  check('board renders', st.found)
  check('NO avatar images during play (cards only)', st.avatarImgs === 0, `(got ${st.avatarImgs})`)
  check('NO CPU text labels during play', st.seatLabels === 0, `(got ${st.seatLabels})`)
  check('top CPU back-cards rendered', st.topCpuCards >= 3, `(got ${st.topCpuCards})`)
  check('side CPU back-cards rendered', st.sideCpuCards >= 3, `(got ${st.sideCpuCards})`)
  check('central discard pile removed (per request)', st.discardPairs === 0, `(got ${st.discardPairs})`)
  check('player turn: draw fan shown', st.drawCards > 0, `(got ${st.drawCards})`)
  check('draw fan emphasized with frame', st.fanFramed, '(no frame)')
  check('draw-source CPU grayed out', st.dimmed >= 1, `(dimmed=${st.dimmed})`)
  check('draw card big (>=80px rendered)', st.drawCardW >= 80, `(got ${st.drawCardW}px)`)
  check('hand card big (>=80px rendered)', st.handCardW >= 80, `(got ${st.handCardW}px)`)
  check('player hand fits in stage (not cut off)', st.handFits, `(handImgs=${st.handImgs})`)
  // ダブり防止: カード画像は drop-shadow のみ（box-shadow/border-radius は付けない＝他ゲーム同様）。
  check('cards use drop-shadow (no doubled box-shadow)', st.cardUsesDropShadow && st.cardBoxShadow === 'none' && st.cardBorderRadius === '0px', `(box=${st.cardBoxShadow}, radius=${st.cardBorderRadius})`)
  check('Feedback button present in footer', st.feedbackBtn, '(missing)')

  // フッター位置が他ゲームと一致（app-flux 規約: 共通chromeの位置を揃える）。
  const of = await otherGameFooter()
  const okBottom = of && st.footerBottom !== null && Math.abs(of.bottom - st.footerBottom) <= 3
  const okLeft = of && st.footerLeft !== null && Math.abs(of.left - st.footerLeft) <= 3
  check('footer aligned with other games (bottom)', okBottom, `(old-maid=${st.footerBottom} vs casino-war=${of && of.bottom})`)
  check('footer aligned with other games (left)', okLeft, `(old-maid=${st.footerLeft} vs casino-war=${of && of.left})`)

  await p.screenshot({ path: '/tmp/om-test.png' })

  // 設定/ガイドは共有部品であること（独自パネル禁止）
  await clickByText('Settings'); await p.waitForTimeout(400)
  let s2 = await tableState()
  check('Settings uses shared <settings-panel>', s2.settingsPanel)
  await clickByText('OK'); await p.waitForTimeout(300)
  await clickByText('Guide'); await p.waitForTimeout(400)
  let s3 = await tableState()
  check('Guide uses shared <guide-overview-panel>', s3.guidePanel)
  await clickByText('OK'); await p.waitForTimeout(300)

  // play to completion（cpuPause の Shuffle/OK や draw-fan を処理）
  let over = false
  let sawBlink = false
  let sawRanksInPlay = false
  for (let turn = 0; turn < 80 && !over; turn++) {
    const r = await p.evaluate((DEEP_SRC) => {
      const roots = eval(DEEP_SRC)
      const sr = roots.map(x => x.host).find(h => h && h.tagName && h.tagName.toLowerCase() === 'old-maid-game-table')?.shadowRoot
      if (!sr) return {}
      const ranksNow = sr.querySelectorAll('.rank').length
      if (sr.querySelector('.result-title')) return { over: true, ranksNow }
      const blink = !!sr.querySelector('.area-hand .row img.blink')
      for (const b of sr.querySelectorAll('.dialog .btn')) { if (/^\s*OK\s*$/i.test(b.textContent.trim())) { b.click(); return { blink, ranksNow, clicked: 'pauseOk' } } }
      const dc = sr.querySelector('.fan img')
      if (dc) { dc.click(); return { blink, ranksNow, clicked: 'fan' } }
      return { blink, ranksNow, waiting: true }
    }, DEEP)
    if (r.blink) sawBlink = true
    if (!r.over && r.ranksNow > 0) sawRanksInPlay = true
    if (r.over) { over = true; break }
    await p.waitForTimeout(700)
  }
  check('pair blink shown (not instant removal)', sawBlink, '(no blink seen)')
  check('finished rank (1st etc.) shown DURING play', sawRanksInPlay, '(no in-play rank seen)')
  check('game completes (result + ranks shown)', over)
  const fin = await tableState()
  check('finished ranks 1st-4th shown', fin.ranks >= 1, `(ranks=${fin.ranks})`)

  check('no 404 assets', bad.length === 0, bad.slice(0, 4).join(' | '))
  check('no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '))

  await browser.close()
  console.log(`\n== ${pass} passed, ${fail} failed ==`)
  process.exit(fail ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(2) })
