import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { cpSync, mkdirSync, existsSync } from 'node:fs'

// ── Android(WebView/Flutter) 用ビルド ────────────────────────────────────────
// WEB 用 `vite.config.ts`(base:'/') は触らない。Android は base 相対が必須:
//   - エントリ(<game>.html) を dist-android の root に出し base:'./' → `./web-games/...` が解決。
//   - 入口は `web-games/android/<game>.html`（__ANDROID_APP__＋モバイルCSS）。
//
// ★容量方針（重要）: 単独ゲームアプリなので「必要な物だけ」入れる allowlist 方式。
//   旧構成は publicDir:public/ で public 全体（全6ゲーム・全config・OLD・全site-assets）を
//   丸ごとコピーし、後から sync が他ゲームを blacklist 剪定していた＝その場しのぎで肥大の温床。
//   ここでは publicDir:false にし、下の plugin が「common(真の共通)＋<game>＋自分のconfig＋feat1枚」
//   だけを dist-android にコピーする。新ゲーム追加でも slug が変わるだけ＝この config は不変。
const game = process.env.ANDROID_GAME || 'old-maid'

// dist-android に「そのゲームに必要な asset だけ」を入れる（allowlist）。
function androidAllowlistAssets() {
  const PUB = resolve(__dirname, 'public')
  const OUT = resolve(__dirname, 'dist-android')
  // ディレクトリ（public 相対パスのまま dist-android へ）。
  const dirs = [
    'web-games/game-assets/common',   // 真の共通（cards / messages / bgm/main_bgm_01 / 共有効果音プール）
    'web-games/game-assets/fonts',    // 共通フォント
    `web-games/game-assets/${game}`,  // このゲーム専用（effects / images / icon 等）
  ]
  // config は「このゲーム＋全ゲーム共通」だけ（他ゲームの *_app_config.json は入れない）。
  const files = [
    `web-games/game-assets/configs/${game}_app_config.json`,
    'web-games/game-assets/configs/remove_ads_ui.json',
    'web-games/game-assets/configs/card-games-list.json', // 「別のカードゲーム」一覧（ライブ取得のバンドル fallback）
    'web-games/game-assets/configs/terms-of-use.json',    // 規約（in-app モーダル・ライブ取得の fallback）
    `site-assets/images/games-apps/${game}/${game}-feat.webp`, // ヒーロー画像（このゲームの feat 1枚のみ）
    '_headers',
  ]
  const copyInto = (rel: string) => {
    const s = resolve(PUB, rel), d = resolve(OUT, rel)
    if (!existsSync(s)) return
    mkdirSync(dirname(d), { recursive: true })
    cpSync(s, d, { recursive: true })
  }
  return {
    name: 'android-allowlist-assets',
    closeBundle() {
      for (const r of dirs) copyInto(r)
      for (const r of files) copyInto(r)
    },
  }
}

export default defineConfig({
  root: resolve(__dirname, 'web-games/android'),
  base: './',
  publicDir: false, // ★public 全体の丸ごとコピーを止める（allowlist plugin が必要分だけ入れる）。
  server: { fs: { allow: [resolve(__dirname, 'web-games'), resolve(__dirname, 'public')] } },
  plugins: [androidAllowlistAssets()],
  build: {
    target: 'es2019',
    outDir: resolve(__dirname, 'dist-android'),
    emptyOutDir: true,
    assetsDir: '', // バンドル(js/css)は出力 root 直下（assets/ の二重入れ子を避ける）。
    rollupOptions: {
      input: { [game]: resolve(__dirname, 'web-games/android', `${game}.html`) },
    },
  },
})
