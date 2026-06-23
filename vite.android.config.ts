import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// ── Android(WebView/Flutter) 用ビルド ────────────────────────────────────────
// WEB 用 `vite.config.ts`(base:'/') は触らない。Android は base 相対が必須:
//   - runtime は `import.meta.env.BASE_URL + 'web-games/game-assets/...'` で fetch する。
//     エントリ(old-maid.html) を dist-android の **root** に出し、base:'./' にすると
//     `./web-games/game-assets/...` が root/web-games/game-assets/ へ正しく解決される。
//   - root を `web-games/` にすると old-maid.html がプロジェクト root 扱い→ dist 直下に出る。
//   - publicDir を project の `public/` に向け、`web-games/game-assets/**` を同梱する。
// 対象ゲームは ANDROID_GAME（既定 old-maid）。今回は old-maid / memory-battle / high-low のみ。
const game = process.env.ANDROID_GAME || 'old-maid'

export default defineConfig({
  root: resolve(__dirname, 'web-games'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  build: {
    target: 'es2019',
    outDir: resolve(__dirname, 'dist-android'),
    emptyOutDir: true,
    rollupOptions: {
      input: { [game]: resolve(__dirname, 'web-games', `${game}.html`) },
    },
  },
})
