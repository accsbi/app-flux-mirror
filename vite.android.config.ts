import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// ── Android(WebView/Flutter) 用ビルド ────────────────────────────────────────
// WEB 用 `vite.config.ts`(base:'/') は触らない。Android は base 相対が必須:
//   - runtime は `import.meta.env.BASE_URL + 'web-games/game-assets/...'` で fetch する。
//     エントリ(<game>.html) を dist-android の **root** に出し、base:'./' にすると
//     `./web-games/game-assets/...` が root/web-games/game-assets/ へ正しく解決される。
//   - 入口は Android 専用フォルダ `web-games/android/<game>.html`（__ANDROID_APP__＋モバイルCSS入り。
//     WEB 版 `web-games/<game>.html` とは別フォルダ・別ファイル）。root をこのフォルダにすると
//     <game>.html がフォルダ root 扱い → dist-android 直下に出る。html は ../src/main.<game>.ts を読む。
//   - publicDir を project の `public/` に向け、`web-games/game-assets/**` を同梱する。
// 対象ゲームは ANDROID_GAME（既定 old-maid）。今回は old-maid / memory-battle / high-low のみ。
const game = process.env.ANDROID_GAME || 'old-maid'

export default defineConfig({
  root: resolve(__dirname, 'web-games/android'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  // ../src（root の外）を build で読むため fs.allow を web-games まで広げる。
  server: { fs: { allow: [resolve(__dirname, 'web-games')] } },
  build: {
    target: 'es2019',
    outDir: resolve(__dirname, 'dist-android'),
    emptyOutDir: true,
    // バンドル(js/css)を出力ルート直下へ（既定の 'assets/' を作らない）。
    // Android では assets/ 直下に展開するため、内側 assets/ があると
    // android/.../assets/assets/... という二重 assets になり無駄な入れ子になる。
    assetsDir: '',
    rollupOptions: {
      input: { [game]: resolve(__dirname, 'web-games/android', `${game}.html`) },
    },
  },
})
