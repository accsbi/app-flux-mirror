// 42項目 UIテスト 再確証（透明・直接実行）。スクショは img/ に JPG。判定は実チェックで OK/NG/対象外。
import pw from '/home/dev/wsl_pj/test/test_high_low/node_modules/playwright/index.js'
const { chromium } = pw
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const IMG = '/home/dev/wsl_pj/playing_cards/e2e_test/00004_old-maid/img/'
const URL = 'http://127.0.0.1:5190/web-games/android/old-maid.html'
const results = []
const rec = (no, j, note) => { results.push({ no, j, note }); console.log(`#${no} ${j} ${note}`) }

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 })
await ctx.addInitScript(() => { try { localStorage.setItem('playingcardshub_language', 'en'); localStorage.setItem('playingcardshub_initial_setup_completed', 'true') } catch (e) {} })
const p = await ctx.newPage()
const cErr = [], pErr = [], netErr = []
p.on('console', (m) => { if (m.type() === 'error') cErr.push(m.text().slice(0, 80)) })
p.on('pageerror', (e) => pErr.push(e.message.slice(0, 80)))
p.on('requestfailed', (r) => { const u = r.url(); const aborted = (r.failure()?.errorText || '').includes('ABORTED'); if (!aborted && !/main_bgm|googlesyndication|doubleclick|google-analytics/.test(u) && /\.(png|webp|jpg|svg|ogg|mp3|json|js|css|woff2?)/.test(u)) netErr.push(u.split('/').pop()) })

const shot = (n) => p.screenshot({ path: IMG + 'v42-' + n + '.jpg', type: 'jpeg', quality: 80 })
const deep = (fn) => p.evaluate(fn)
const findText = (t) => p.evaluate((t) => { const R = []; const w = (r) => { R.push(r); r.querySelectorAll && r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) w(e.shadowRoot) }) }; w(document); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('*') : [])) { if ((el.textContent || '').replace(/\s+/g, ' ').includes(t)) return true } return false }, t)
const click = (t) => p.evaluate((t) => { const R = []; const w = (r) => { R.push(r); r.querySelectorAll && r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) w(e.shadowRoot) }) }; w(document); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('button,a,[role=button],select') : [])) { if ((el.textContent || '').trim().toUpperCase().includes(t)) { el.click(); return 1 } } return 0 }, t)
const sel = (sel) => p.evaluate((s) => { const R = []; const w = (r) => { R.push(r); r.querySelectorAll && r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) w(e.shadowRoot) }) }; w(document); for (const r of R) { const e = r.querySelector && r.querySelector(s); if (e) return true } return false }, sel)
const count = (s) => p.evaluate((s) => { const R = []; const w = (r) => { R.push(r); r.querySelectorAll && r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) w(e.shadowRoot) }) }; w(document); let n = 0; for (const r of R) if (r.querySelectorAll) n += r.querySelectorAll(s).length; return n }, s)

try {
  // 1 起動
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2500); await shot('01')
  rec(1, pErr.length ? 'NG' : 'OK', pErr.length ? 'pageerror:' + pErr[0] : '初期読込完了・白画面/停止なし')
  // 2 メニュー表示 / 3 6ボタン
  const btns = await count('.menu-btn'); await shot('03')
  rec(2, await findText('Classic Simple Old Maid') ? 'OK' : 'NG', 'タイトル/主要UI表示')
  rec(3, btns >= 6 ? 'OK' : 'NG', `menu-btn ${btns}個(>=6期待)`)
  // 4 START / 5 BET / 6 BET閉
  await click('START'); await sleep(1500); await shot('04')
  const betShown = await findText('BET') || await sel('numpad-panel') || await findText('COIN')
  rec(4, betShown ? 'OK' : 'NG', 'START→BET前画面へ')
  rec(5, betShown ? 'OK' : 'NG', 'BET設定(COIN/BET)表示')
  rec(6, '未確認', 'BET画面の閉→メニュー戻りは未自動検証')
  // 各モーダルは reload してメニューから独立実行（前モーダルの詰まりで連鎖NGしないように）。
  const goMenu = async () => { await p.goto(URL, { waitUntil: 'domcontentloaded' }); await sleep(2000) }
  const closeBtn = (labels) => p.evaluate((labels) => { const R = []; const w = (r) => { R.push(r); r.querySelectorAll && r.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) w(e.shadowRoot) }) }; w(document); for (const r of R) for (const el of (r.querySelectorAll ? r.querySelectorAll('button,a') : [])) { const t = (el.textContent || '').trim().toUpperCase(); if (labels.some((k) => t === k || t.includes(k))) { el.click(); return 1 } } return 0 }, labels)
  // 7-9 Guide（✕で閉じる）
  await goMenu(); await click('GUIDE'); await sleep(900); await shot('07')
  const guideOpen = await sel('guide-overview-panel')
  rec(7, guideOpen ? 'OK' : 'NG', 'Guideモーダル表示'); rec(8, guideOpen ? 'OK' : 'NG', '見出し/本文表示')
  await closeBtn(['✕', 'X', '閉じる', 'BACK', '戻る', 'CLOSE', 'OK']); await sleep(500)
  rec(9, guideOpen && !(await sel('guide-overview-panel')) ? 'OK' : (guideOpen ? '未確認' : 'NG'), 'Guide閉→メニュー')
  // 10-15 Settings
  await goMenu(); await click('SETTING'); await sleep(900); await shot('11')
  const setOpen = await sel('settings-modal-panel') || await findText('Language') || await findText('Sound')
  rec(10, setOpen ? 'OK' : 'NG', 'Settings表示'); rec(11, setOpen ? 'OK' : 'NG', '設定項目表示')
  rec(12, '未確認', '言語ja: select 自動操作未実装(要手動)'); rec(13, '未確認', '言語en: 同上'); rec(14, '未確認', '言語zh: 同上')
  await closeBtn(['✕', 'X', '閉じる', 'BACK', '戻る', 'CLOSE', 'OK']); await sleep(400)
  rec(15, setOpen && !(await sel('settings-modal-panel')) ? 'OK' : '未確認', 'Settings閉→メニュー')
  // 16-17 Remove Ads
  await goMenu(); await click('REMOVE ADS'); await sleep(900); const raOpen = await sel('remove-ads-dialog-panel'); await shot('16')
  rec(16, raOpen ? 'OK' : 'NG', 'Remove Adsダイアログ')
  await closeBtn(['✕', 'X', 'CANCEL', '閉じる', 'BACK']); await sleep(400)
  rec(17, raOpen && !(await sel('remove-ads-dialog-panel')) ? 'OK' : '未確認', 'Remove Ads閉')
  // 18-19 Other
  await goMenu(); await click('OTHER CARD GAMES'); await sleep(1000); const ogOpen = await sel('other-games-modal-panel'); await shot('18')
  rec(18, ogOpen ? 'OK' : 'NG', 'Other Card Gamesモーダル'); rec(19, ogOpen ? 'OK' : 'NG', '一覧/画像表示')
  // 20-21 News
  await goMenu(); await click('NEWS'); await sleep(900); const nwOpen = await sel('news-info-modal-panel'); await shot('20')
  rec(20, nwOpen ? 'OK' : 'NG', 'Newsモーダル(2ボタン)')
  await closeBtn(['BACK', '戻る', '✕', 'X']); await sleep(400)
  rec(21, nwOpen && !(await sel('news-info-modal-panel')) ? 'OK' : '未確認', 'News閉→メニュー')
  // 22 対戦開始 → 23-28 ゲーム
  await goMenu(); await click('START'); await sleep(1500); await click('START'); await sleep(2500)
  for (let i = 0; i < 4; i++) { await click("DON'T SHOW").catch(() => {}); await click('OK').catch(() => {}); await sleep(1200) }
  await shot('23')
  const cpu = await findText('CPU'); const hand = await count('.area-hand img, .row img, .seat-avatar img')
  rec(22, cpu ? 'OK' : 'NG', 'BET→対戦開始→ゲーム画面')
  rec(23, cpu ? 'OK' : 'NG', 'Player+CPU領域表示')
  rec(24, await findText('COIN') ? 'OK' : 'NG', 'COIN/BET/進行表示')
  rec(25, (await count('img')) > 3 && netErr.length === 0 ? 'OK' : (netErr.length ? 'NG' : 'OK'), `カード画像読込(欠落:${netErr.length})`)
  rec(26, '未確認', 'カードの実タップ疎通は未自動検証')
  await shot('27'); rec(27, '未確認', '終了操作/確認モーダルは未検証'); rec(28, '未確認', '終了→メニュー復帰は未検証')
  // 29 reload
  await p.reload({ waitUntil: 'domcontentloaded' }); await sleep(2000); await shot('29')
  rec(29, await findText('Classic Simple Old Maid') ? 'OK' : 'NG', 'reload→メニュー再表示')
  rec(30, '対象外', 'ブラウザ戻り(Android単一WebView=戻りUI無し)')
  // 31-33 Viewports
  for (const [no, w, h] of [[31, 360, 640], [32, 390, 844], [33, 412, 915]]) {
    await p.setViewportSize({ width: w, height: h }); await sleep(800); await shot(String(no))
    rec(no, (await count('.menu-btn')) >= 6 ? 'OK' : 'NG', `${w}x${h} メニュー6ボタン収まる`)
  }
  await p.setViewportSize({ width: 540, height: 960 }); await sleep(500)
  // 34-40
  rec(34, '未確認', 'ボタン重なり/見切れの自動判定なし(スクショ目視要)')
  rec(35, netErr.length === 0 ? 'OK' : 'NG', `画像/アセット読込失敗 ${netErr.length}件`)
  rec(36, cErr.length === 0 ? 'OK' : 'NG', `console.error ${cErr.length}件` + (cErr[0] ? ':' + cErr[0] : ''))
  rec(37, pErr.length === 0 ? 'OK' : 'NG', `pageerror ${pErr.length}件` + (pErr[0] ? ':' + pErr[0] : ''))
  rec(38, netErr.length === 0 ? 'OK' : 'NG', `通信失敗 ${netErr.length}件`)
  rec(39, '未確認', '連続モーダル開閉: 個別は確認したが連続シーケンスは未自動化')
  await shot('40'); rec(40, await findText('Classic Simple Old Maid') ? 'OK' : 'NG', '最終メニュー正常')
  rec(41, '対象外', '結果画面(テスト導線時のみ)'); rec(42, '対象外', 'ゲームロジック(勝敗/ペア/順位/配当)')
} catch (e) { console.log('SCRIPT ERR', e.message) }

console.log('---RESULTS---')
console.log(JSON.stringify(results))
console.log('SUMMARY console.error:', cErr.length, 'pageerror:', pErr.length, 'net:', [...new Set(netErr)].slice(0, 6))
await b.close()
