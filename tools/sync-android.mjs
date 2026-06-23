// WSL→Win 同期（Win に BAT/BASH を作らず WSL 完結）。
// 使い方:  node tools/sync-android.mjs old-maid
//   1) ANDROID_GAME=<game> で web を Android 用ビルド（dist-android, base:'./'）
//   2) Flutter プロジェクト(<id>_<slug>) の assets/www へクリーンコピー
//   3) 他ゲームの asset を剪定（per-game アプリなので APK を軽くする）
//   4) pubspec.yaml の assets: を実在ディレクトリで再生成（Flutter は再帰アセット非対応）
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOW = ['old-maid', 'memory-battle', 'high-low'] // 今回 Android 化する3つのみ
const ALL_GAMES = ['blackjack', 'poker', 'casino-war', 'old-maid', 'memory-battle', 'high-low']
const WIN_ROOT = '/mnt/c/Users/dev/pj/google_play_store_app'

const game = process.argv[2]
if (!game) { console.error('usage: node tools/sync-android.mjs <slug>'); process.exit(1) }
if (!ALLOW.includes(game)) { console.error(`Android 対象は ${ALLOW.join(' / ')} のみ（${game} は保留/対象外）`); process.exit(1) }

// id を games-list.csv から（ハードコードしない）
const csv = readFileSync('catalog/games-list.csv', 'utf8').split(/\r?\n/)
const header = csv[0].split(',')
const fi = header.indexOf('file_name'), ii = header.indexOf('id')
let id = ''
for (const line of csv.slice(1)) { const c = line.split(','); if ((c[fi] || '').trim() === game) { id = (c[ii] || '').trim(); break } }
if (!id) { console.error(`id not found for ${game} in games-list.csv`); process.exit(1) }

const WIN = join(WIN_ROOT, `${id}_${game}`)
const www = join(WIN, 'assets/www')

// 1) build:android
console.log(`[1/4] build:android (${game}) ...`)
execSync(`ANDROID_GAME=${game} npm run build:android`, { stdio: 'inherit' })

// 2) clean copy dist-android → assets/www
console.log(`[2/4] copy dist-android → ${www}`)
rmSync(www, { recursive: true, force: true })
mkdirSync(www, { recursive: true })
cpSync('dist-android', www, { recursive: true })

// 3) 他ゲームの asset を剪定（このゲーム＋common＋このゲーム config のみ残す）
console.log('[3/4] prune other games assets')
for (const g of ALL_GAMES.filter((x) => x !== game)) {
  rmSync(join(www, 'web-games/game-assets', g), { recursive: true, force: true })
  rmSync(join(www, 'site-assets/images/games-apps', g), { recursive: true, force: true })
}
const cfgDir = join(www, 'web-games/game-assets/configs')
for (const f of readdirSync(cfgDir)) {
  if (!f.includes(game) && f !== 'remove_ads_ui.json') rmSync(join(cfgDir, f))
}

// 4) pubspec.yaml の assets: を再生成
console.log('[4/4] regenerate pubspec assets')
const dirs = []
;(function walk(d) {
  for (const n of readdirSync(d)) {
    const full = join(d, n)
    if (statSync(full).isDirectory()) { dirs.push(full); walk(full) }
  }
})(www)
const rel = dirs.map((d) => d.slice(WIN.length + 1).replace(/\\/g, '/')).sort()
const assetLines = ['assets/www', ...rel].map((d) => `    - ${d}/`).join('\n')
const pubPath = join(WIN, 'pubspec.yaml')
let pub = readFileSync(pubPath, 'utf8')
pub = pub.replace(/(\n {2}assets:\n)[\s\S]*$/, `$1${assetLines}\n`)
writeFileSync(pubPath, pub)

console.log(`synced ${game} → ${WIN} (asset dirs: ${rel.length + 1}). Win 側で flutter run / Android Studio を実行。`)
