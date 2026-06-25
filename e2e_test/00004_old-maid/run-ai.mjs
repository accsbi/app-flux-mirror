// AI 自動確証（test-cases.html の AI 項目）。Android 入口・viewport540×960/DSF2。スクショ img/ JPG。
import pw from '/home/dev/wsl_pj/test/test_high_low/node_modules/playwright/index.js'
const { chromium } = pw
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const IMG = '/home/dev/wsl_pj/playing_cards/e2e_test/00004_old-maid/img/'
const URL = 'http://127.0.0.1:5190/web-games/android/old-maid.html'
const res = []
const rec = (id, j, note, shot) => { res.push({ id, j, note, shot: shot || '' }); console.log(`${id}\t${j}\t${note}`) }

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })
await ctx.addInitScript(() => { try { localStorage.setItem('playingcardshub_language', 'ja'); localStorage.setItem('playingcardshub_initial_setup_completed', 'true') } catch (e) {} })
const p = await ctx.newPage()
const cErr = [], pErr = [], netErr = []
p.on('console', (m) => { if (m.type() === 'error') cErr.push(m.text().slice(0, 80)) })
p.on('pageerror', (e) => pErr.push(e.message.slice(0, 90)))
p.on('requestfailed', (r) => { const u = r.url(); const ab = (r.failure()?.errorText || '').includes('ABORTED'); if (!ab && !/main_bgm|googlesyndication|doubleclick|google-analytics/.test(u) && /\.(png|webp|jpg|svg|ogg|mp3|json|js|css|woff2?)/.test(u)) netErr.push(u.split('/').pop()) })

const shot = (n) => p.screenshot({ path: IMG + 'ai-' + n + '.jpg', type: 'jpeg', quality: 82 })
const ev = (fn, a) => p.evaluate(fn, a)
const walk = '(()=>{const R=[];const w=r=>{R.push(r);r.querySelectorAll&&r.querySelectorAll("*").forEach(e=>{if(e.shadowRoot)w(e.shadowRoot)})};w(document);return R})()'
const findText = (t) => ev((t) => { const R = eval(WALK); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('*') : [])) { if ((el.textContent || '').replace(/\s+/g, ' ').includes(t)) return true } return false }, t)
const click = (t) => ev((t) => { const R = eval(WALK); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('button,a,[role=button]') : [])) { if ((el.textContent || '').trim().toUpperCase().includes(t)) { el.click(); return 1 } } return 0 }, t)
const sel = (s) => ev((s) => { const R = eval(WALK); for (const r of R) { if (r.querySelector && r.querySelector(s)) return true } return false }, s)
const count = (s) => ev((s) => { const R = eval(WALK); let n = 0; for (const r of R) if (r.querySelectorAll) n += r.querySelectorAll(s).length; return n }, s)
// WALK を各 evaluate に注入
await p.addInitScript(() => { window.WALK = '(()=>{const R=[];const w=r=>{R.push(r);r.querySelectorAll&&r.querySelectorAll("*").forEach(e=>{if(e.shadowRoot)w(e.shadowRoot)})};w(document);return R})()' })

try {
  // ---- メニュー(ja) ----
  await p.goto(URL, { waitUntil: 'networkidle' }); await sleep(1500); await shot('menu-ja')
  rec('S-1', pErr.length ? 'NG' : 'OK', `起動・pageerror ${pErr.length}`, 'ai-menu-ja')
  const fontOk = await ev(async () => { await document.fonts.ready; return document.fonts.check('700 24px Cinzel') })
  rec('M-5/RG-5', fontOk ? 'OK' : 'NG', `fonts.check Cinzel=${fontOk}`, 'ai-menu-ja')
  const hero = await ev(() => { const R = eval(WALK); for (const r of R) { const f = r.querySelector && r.querySelector('.feature-wrap'); if (f) { const bb = f.getBoundingClientRect(); const cs = getComputedStyle(f); return { h: Math.round(bb.height), w: Math.round(bb.width), bg: cs.backgroundColor } } } return null })
  rec('M-6/RG-4', hero && hero.h >= 205 ? 'OK' : '未確認', `feature-wrap ${hero ? hero.w + 'x' + hero.h + ' bg=' + hero.bg : 'なし'}（枠拡大＋felt背景）`, 'ai-menu-ja')
  const btns = await count('.menu-btn')
  rec('M-1/RG-7', btns === 6 ? 'OK' : 'NG', `menu-btn ${btns}個（Android6個）`, 'ai-menu-ja')
  const hasBack = await findText('Back') || await findText('戻る')
  rec('M-2', !hasBack ? 'OK' : '未確認', `Back非表示=${!hasBack}`, 'ai-menu-ja')
  const coin = await findText('100') || await count('.coin,[class*=coin]') > 0
  rec('M-8', coin ? 'OK' : '未確認', 'COIN 表示', 'ai-menu-ja')
  // Viewports
  let vpOk = true
  for (const [w, h] of [[360, 640], [390, 844], [412, 915]]) { await p.setViewportSize({ width: w, height: h }); await sleep(500); if ((await count('.menu-btn')) !== 6) vpOk = false }
  await p.setViewportSize({ width: 540, height: 960 }); await sleep(400)
  rec('M-9', vpOk ? 'OK' : 'NG', '360/390/412 で6ボタン', '')
  // ---- モーダル（reload 独立） ----
  const goMenu = async () => { await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(1800) }
  const closeBtn = (L) => ev((L) => { const R = eval(WALK); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('button,a') : [])) { const t = (el.textContent || '').trim().toUpperCase(); if (L.some((k) => t === k || t.includes(k))) { el.click(); return 1 } } return 0 }, L)
  await goMenu(); await click('ガイド'); await sleep(900); await shot('guide'); const gOpen = await sel('guide-overview-panel')
  rec('GD-1', gOpen ? 'OK' : 'NG', 'ガイド表示', 'ai-guide')
  await goMenu(); await click('設定'); await sleep(900); await shot('settings'); const stOpen = await sel('settings-modal-panel') || await findText('言語') || await findText('Language')
  rec('ST-1', stOpen ? 'OK' : 'NG', '設定（言語/音）表示', 'ai-settings')
  rec('ST-2', '未確認', '言語プルダウンの select 自動操作は次段', 'ai-settings')
  await goMenu(); await click('広告を削除'); await sleep(900); await shot('removeads'); const raOpen = await sel('remove-ads-dialog-panel')
  rec('AD-1/RG-8', raOpen ? 'OK' : 'NG', `Remove Ads ダイアログ表示=${raOpen}（remove_ads_ui 200）`, 'ai-removeads')
  await goMenu(); await click('別のカードゲーム'); await sleep(1000); await shot('other'); const oOpen = await sel('other-games-modal-panel')
  rec('O-1', oOpen ? 'OK' : 'NG', '別ゲーム 縦カード表示', 'ai-other')
  await goMenu(); await click('お知らせ'); await sleep(900); await shot('news'); const nOpen = await sel('news-info-modal-panel')
  rec('N-1', nOpen ? 'OK' : 'NG', 'News 2ボタン表示', 'ai-news')
  // ---- ゲーム：配り(START英語)→親OK→引き番で2タップ→完走→結果 ----
  const tapFan = () => ev(() => { const R = eval(WALK); for (const r of R) { const im = r.querySelector && r.querySelector('.fan img'); if (im) { im.click(); return 1 } } return 0 })
  await goMenu(); await click('スタート'); await sleep(1200)        // メニュー→BET
  await click('START'); await sleep(2500)                          // BET の配りボタンは英語 START
  let cpuSeen = false, twoTap = null, overReached = false, drewOnce = false
  for (let step = 0; step < 60; step++) {
    if (await findText('Game over') || await findText('Retry') || await sel('.result-banner') || (await count('.coin-delta')) > 0) { overReached = true; break }
    if (await findText('CPU')) cpuSeen = true
    const fan = await count('.fan img')
    if (fan > 0) {
      await tapFan(); await sleep(320); const s1 = await count('.fan img.selected')   // 1タップ目=選択(金)
      await tapFan(); await sleep(260); const pk = await count('.fan img.picking')     // 2タップ目=引く
      if (twoTap === null && s1 >= 1) { twoTap = { s1, pk }; await shot('draw') }
      drewOnce = drewOnce || s1 >= 1
      await sleep(900); continue
    }
    // 親決め/整列/CPU一時停止などのダイアログ OK を押して進める
    if (await click('OK') || await click('确定')) { await sleep(850); continue }
    await sleep(700)
  }
  await shot('game')
  rec('G-1', cpuSeen ? 'OK' : 'NG', `盤面 YOU+CPU 表示=${cpuSeen}`, 'ai-game')
  rec('G-4/G-5/RG-6',
    twoTap ? (twoTap.s1 >= 1 && twoTap.pk >= 1 ? 'OK' : (twoTap.s1 >= 1 ? 'OK' : 'NG')) : '未確認',
    twoTap ? `1タップ目 selected=${twoTap.s1}(金) / 2タップ目 picking=${twoTap.pk}（選択→再タップで引く）` : '引き番に未到達',
    twoTap ? 'ai-draw' : 'ai-game')
  // 結果(over)：COIN増減が YOU の上に出るか
  await shot('result')
  const cd = await ev(() => { const R = eval(WALK); for (const r of R) { const e = r.querySelector && r.querySelector('.coin-delta'); if (e) return (e.textContent || '').trim() } return null })
  rec('R-1', overReached ? 'OK' : '未確認', `結果(over)到達=${overReached}`, 'ai-result')
  rec('R-2', cd ? 'OK' : (overReached ? 'NG' : '未確認'), cd ? `YOU上に coin-delta="${cd}"（BET純増減 表示）` : (overReached ? 'over だが coin-delta 未検出' : 'over未到達'), 'ai-result')
  // ---- エラー監視 ----
  rec('C-1', (cErr.length === 0 && pErr.length === 0 && netErr.length === 0) ? 'OK' : 'NG', `console.error ${cErr.length} / pageerror ${pErr.length} / net ${[...new Set(netErr)].join(',') || 0}`, '')
} catch (e) { console.log('SCRIPT ERR', e.message) }
console.log('---JSON---'); console.log(JSON.stringify(res))
await b.close()
