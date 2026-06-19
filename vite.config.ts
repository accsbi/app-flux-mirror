import { defineConfig } from 'vite'
import { resolve, relative } from 'node:path'
import { readdirSync, statSync } from 'node:fs'

// Classic Card Games Collection — Lit + Vite の MPA。
// HTML エントリ（ルート / 言語別TOP / 詳細 / 仮メニュー）はプロジェクト配下を走査して
// 自動収集する（増えても vite.config を手で直さなくてよい）。base:'/' でルート配信前提。
const ROOT = __dirname
const SKIP_DIRS = new Set(['node_modules', 'dist', 'catalog', 'public', 'scripts', '.git'])

function findHtml(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = resolve(dir, name)
    if (statSync(full).isDirectory()) findHtml(full, out)
    else if (name.endsWith('.html')) out.push(full)
  }
  return out
}

const input = Object.fromEntries(
  findHtml(ROOT).map((file) => [
    // ロールアップの入口キー = ルートからの相対パス（.html 抜き）。一意になる。
    relative(ROOT, file).replace(/\.html$/, '').replace(/[/\\]/g, '__'),
    file,
  ]),
)

export default defineConfig({
  // ルート配信前提。BASE_URL が '/' になり、実行時 fetch('/data/…') が
  // どの言語ページ(/en/ 等)や仮メニュー(/web-games/…)からでも site root に正しく解決される。
  // 将来サブパス配信する場合は base を '/subpath/' にすれば withBase() がそれを尊重する。
  base: '/',
  build: {
    target: 'es2019',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
  },
})
