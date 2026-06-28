import { defineConfig } from 'vite'
import type { Connect, PluginOption } from 'vite'
import { resolve, relative } from 'node:path'
import { readdirSync, statSync, existsSync } from 'node:fs'

// Classic Card Games Collection — Lit + Vite の MPA。
// HTML エントリ（ルート / 言語別TOP / 詳細 / 仮メニュー）はプロジェクト配下を走査して
// 自動収集する（増えても vite.config を手で直さなくてよい）。base:'/' でルート配信前提。
const ROOT = __dirname
// ビルド入口は MPA の正規 HTML のみ。テスト記録(e2e_test)・ビルド出力(dist*)・出力先(catalog/public)・
// ツール(scripts)は走査しない＝テストHTMLが dist に漏れる/出力が再入力される事故を防ぐ。
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-android', 'catalog', 'public', 'scripts', 'e2e_test', 'test-results', '.git'])

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

// 末尾スラッシュ正規化（dev / preview 両対応）。
// 例: /en/privacy-policy/index.html がある場合、
//   /en/privacy-policy/  → そのまま 200（Vite が index.html を解決）
//   /en/privacy-policy   → 既定では html フォールバックが /foo.html しか試さず、
//                          見つからず SPA フォールバックでルート index.html（/en/ へ refresh）を返す＝表示されない。
// そこで「ディレクトリ(index.html 持ち)宛のスラッシュなしアクセス」を末尾スラッシュ URL へ
// 301 リダイレクトし、どちらの URL でも必ず表示できるようにする。
function trailingSlashRedirect(serveDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url || '/'
    const [pathname, query = ''] = url.split('?')
    // すでにスラッシュ終わり／拡張子付き（ファイル要求）／Vite 内部リクエストは対象外。
    if (
      pathname.endsWith('/') ||
      pathname.startsWith('/@') ||
      pathname.startsWith('/node_modules') ||
      /\.[^/]+$/.test(pathname)
    ) {
      return next()
    }
    const indexFile = resolve(serveDir, '.' + decodeURIComponent(pathname), 'index.html')
    if (existsSync(indexFile)) {
      res.statusCode = 301
      res.setHeader('Location', pathname + '/' + (query ? '?' + query : ''))
      res.end()
      return
    }
    next()
  }
}

// レガシー URL フォールバック（旧アプリに残った /{lang}/games-apps/... を救済）。
// 注意: /{lang}/games-apps/{game}/（blackjack 等の詳細ページ）は **現行の実在ページ**。
//       これらは絶対に触らない。剥がすのは「games-apps 配下に実在しない」旧 URL だけ。
//   /{lang}/games-apps(/)                 → /{lang}/         （ハブには index.html が無い）
//   /{lang}/games-apps/privacy-policy(/)  → /{lang}/privacy-policy/  （games-apps 配下に実体無し＆直下に実在）
//   /{lang}/games-apps/blackjack(/) 等    → 触らない（実在の詳細ページ）
// 言語(en/ja/zh…)はそのまま維持。
// 旧 app-flux の個別アプリ slug → それぞれの Google Play ストアへ 301（詳細ページは作らない方針）。
// public/_redirects（本番）と同じ対応表に保つこと。言語非依存（同じストアURL）。
const LEGACY_APPFLUX_STORE: Record<string, string> = {
  blackjack_3in1: 'https://play.google.com/store/apps/details?id=com.game.playingcardshub',
  simple_poker: 'https://play.google.com/store/apps/details?id=com.game.simple_poker',
  simpleblackjack: 'https://play.google.com/store/apps/details?id=com.game.simpleblackjack',
  numtaplangquiz: 'https://play.google.com/store/apps/details?id=com.numberquiz.app',
  flagsoftheworld: 'https://play.google.com/store/apps/details?id=com.app.flagsoftheworld',
  kaitensushimaster: 'https://play.google.com/store/apps/details?id=com.game.kaitensushimaster',
}

function legacyGamesAppsRedirect(serveDir: string): Connect.NextHandleFunction {
  const indexExists = (p: string) =>
    existsSync(resolve(serveDir, '.' + decodeURIComponent(p), 'index.html'))
  const redirect = (res: any, location: string, query: string) => {
    res.statusCode = 301
    res.setHeader('Location', location + (query ? '?' + query : ''))
    res.end()
  }
  return (req, res, next) => {
    const url = req.url || '/'
    const [pathname, query = ''] = url.split('?')
    const m = pathname.match(/^\/([^/]+)\/games-apps(\/.*)?$/)
    if (!m) return next()
    const lang = m[1]
    const rest = (m[2] || '').replace(/\/+$/, '') // '' | '/privacy-policy' （末尾スラッシュ除去）
    // 1) 素のハブ /{lang}/games-apps(/) → /{lang}/
    if (rest === '') return redirect(res, `/${lang}/`, query)
    // 2) games-apps 配下が実在ページなら触らない（＝詳細ページ /games-apps/blackjack/ 等を壊さない）
    if (indexExists(`/${lang}/games-apps${rest}`)) return next()
    // 2.5) 旧 app-flux の個別アプリ slug → 各 Google Play ストアへ 301（外部URL・queryは付けない）。
    const storeUrl = LEGACY_APPFLUX_STORE[rest.replace(/^\//, '')]
    if (storeUrl) { res.statusCode = 301; res.setHeader('Location', storeUrl); res.end(); return }
    // 3) games-apps を剥がした現行ページが実在するなら 301、無ければ触らず通常処理へ。
    const target = `/${lang}${rest}`
    if (indexExists(target)) return redirect(res, target + '/', query)
    return next()
  }
}

function trailingSlashPlugin(): PluginOption {
  return {
    name: 'trailing-slash-redirect',
    configureServer(server) {
      // pre フック（return せず直接 use）＝ Vite 内部の html/SPA フォールバックより前に実行。
      // games-apps レガシー救済を先に登録（games-apps を剥がしてから末尾スラッシュ正規化）。
      server.middlewares.use(legacyGamesAppsRedirect(ROOT))
      server.middlewares.use(trailingSlashRedirect(ROOT))
    },
    configurePreviewServer(server) {
      server.middlewares.use(legacyGamesAppsRedirect(resolve(ROOT, 'dist')))
      server.middlewares.use(trailingSlashRedirect(resolve(ROOT, 'dist')))
    },
  }
}

export default defineConfig({
  // ルート配信前提。BASE_URL が '/' になり、実行時 fetch('/data/…') が
  // どの言語ページ(/en/ 等)や仮メニュー(/web-games/…)からでも site root に正しく解決される。
  // 将来サブパス配信する場合は base を '/subpath/' にすれば withBase() がそれを尊重する。
  base: '/',
  plugins: [trailingSlashPlugin()],
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
