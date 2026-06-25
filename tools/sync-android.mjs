// WSL→Win 同期（Win に BAT/BASH を作らず WSL 完結）。
// 使い方:  node tools/sync-android.mjs old-maid
//   1) ANDROID_GAME=<game> で web を Android 用ビルド（dist-android, base:'./'）
//   2) android/app/src/main/assets/ 直下へクリーンコピー（www は廃止）。
//      WebViewAssetLoader が appassets.androidplatform.net/assets/<game>.html で読む。再帰OK・pubspec不要。
//      ※ 旧構成は assets/www/ ＋ Vite 既定の内側 assets/ で「assets/www/assets/」という二重・
//        無駄な入れ子だった。www を無くし Vite も assetsDir:'' にして assets/ 直下へ平坦化した。
//        flutter_assets/ はビルド時に APK へ注入されるため src/main/assets/ には無く、衝突しない。
//   3) 他ゲームの asset を剪定（per-game アプリなので APK を軽くする）
import { execSync } from 'node:child_process'
import { readFileSync, rmSync, mkdirSync, cpSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const WIN_ROOT = '/mnt/c/Users/dev/pj/google_play_store_app'

// ゲーム一覧はハードコードしない。games-list.csv（file_name=slug, id）を唯一のソースに読む。
// 増減は CSV を直すだけ＝この script は不変。
const csv = readFileSync('catalog/games-list.csv', 'utf8').split(/\r?\n/).filter((l) => l.trim())
const header = csv[0].split(',')
const fi = header.indexOf('file_name'), ii = header.indexOf('id')
const ROWS = csv.slice(1).map((l) => l.split(',')).filter((c) => (c[fi] || '').trim())
const ALL_GAMES = ROWS.map((c) => (c[fi] || '').trim())              // 剪定で「他ゲーム」を知るため（全件）
const idOf = (slug) => { const r = ROWS.find((c) => (c[fi] || '').trim() === slug); return r ? (r[ii] || '').trim() : '' }

const game = process.argv[2]
if (!game) { console.error(`usage: node tools/sync-android.mjs <slug>\n候補(games-list.csv): ${ALL_GAMES.join(' / ')}`); process.exit(1) }
if (!ALL_GAMES.includes(game)) { console.error(`${game} は games-list.csv に無い。候補: ${ALL_GAMES.join(' / ')}`); process.exit(1) }
const id = idOf(game)
if (!id) { console.error(`id not found for ${game} in games-list.csv`); process.exit(1) }

const WIN = join(WIN_ROOT, `${id}_${game}`)
const dest = join(WIN, 'android/app/src/main/assets')

// Android 移行の可否もハードコード(ALLOW)しない。Win 側に Flutter プロジェクト(pubspec.yaml)が
// 在るゲームだけが対象＝移行に着手すれば自動で sync できる（blackjack 等の空フォルダは弾く）。
if (!existsSync(join(WIN, 'pubspec.yaml'))) {
  console.error(`${WIN} に Flutter プロジェクト(pubspec.yaml)が無い＝Android 移行が未着手。sync 対象外。`)
  process.exit(1)
}

// 1) build:android
console.log(`[1/4] build:android (${game}) ...`)
execSync(`ANDROID_GAME=${game} npm run build:android`, { stdio: 'inherit' })

// 2) clean copy dist-android → assets/ 直下
console.log(`[2/4] copy dist-android → ${dest}`)
mkdirSync(dest, { recursive: true })
// 旧構成 assets/www/ が残っていれば撤去（www 廃止の片付け）。
rmSync(join(dest, 'www'), { recursive: true, force: true })
// クリーンコピー: 今回出力する各トップレベル名だけ消してから入れ替える。
// （Flutter が後段で APK に注入する flutter_assets/ 等は src/main/assets には無いが、
//   将来 native assets を置いても巻き込まないよう「dist-android の項目のみ」削除する）。
for (const entry of readdirSync('dist-android')) {
  rmSync(join(dest, entry), { recursive: true, force: true })
}
cpSync('dist-android', dest, { recursive: true })

// 3) 他ゲームの asset を剪定（このゲーム＋common＋このゲーム config のみ残す）
console.log('[3/4] prune other games assets')
for (const g of ALL_GAMES.filter((x) => x !== game)) {
  // 他ゲームのゲーム本体 asset は丸ごと不要。
  rmSync(join(dest, 'web-games/game-assets', g), { recursive: true, force: true })
  // 他ゲームの site-assets は「別のカードゲーム」一覧のサムネ用に feat 画像(<g>-feat.webp)だけ残し、
  // 残り（icon / info1-6 / play-store_512 等）は剪定して APK を軽く保つ。
  const gaDir = join(dest, 'site-assets/images/games-apps', g)
  if (existsSync(gaDir)) {
    for (const f of readdirSync(gaDir)) {
      if (f !== `${g}-feat.webp`) rmSync(join(gaDir, f), { recursive: true, force: true })
    }
  }
}
// このゲームの config と全ゲーム共通 config は残す（card-games-list.json＝別のカードゲーム一覧、
// remove_ads_ui.json＝課金UI）。他ゲームの *_app_config.json だけ剪定する。
const KEEP_CONFIGS = new Set(['remove_ads_ui.json', 'card-games-list.json'])
const cfgDir = join(dest, 'web-games/game-assets/configs')
for (const f of readdirSync(cfgDir)) {
  if (!f.includes(game) && !KEEP_CONFIGS.has(f)) rmSync(join(cfgDir, f))
}

// Android assets は再帰的に取り込まれるため pubspec への列挙は不要。
console.log(`synced ${game} → android/app/src/main/assets/ (www 廃止・平坦化済). Win 側で flutter run / Android Studio を実行。`)
