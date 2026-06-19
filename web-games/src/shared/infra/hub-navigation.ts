// メニューの「戻る(menu-back)」やゲーム終了時の遷移先（ハブ）を、配信コンテキストに
// 応じて解決する。スタンドアロンのゲームHTMLは複数の場所から配信されるため、戻り先が異なる。
//   - 本サイト(Classic Card Games Collection): /web-games/ 配下
//       -> /<lang>/（来た言語を保持したカタログTOP）
//   - それ以外(itch 等): /index.html（同じオリジン直下のハブ）

import { LANGUAGE_KEY } from '../config/storage-keys'

const FRONTEND_GAMES_PREFIX = '/web-games/'
const SUPPORTED_LANGS = ['en', 'ja', 'zh'] as const

function isSupportedLang(value: string | null | undefined): value is (typeof SUPPORTED_LANGS)[number] {
  return !!value && (SUPPORTED_LANGS as readonly string[]).includes(value)
}

// 本サイトで「来た言語」を推定する。
//   1) 直前ページ(/<lang>/… カタログや詳細)から来たなら referrer の言語
//   2) ゲームが保存している言語(localStorage)
//   3) 既定 en
function resolveFrontendLang(): (typeof SUPPORTED_LANGS)[number] {
  try {
    if (document.referrer) {
      const refPath = new URL(document.referrer).pathname
      const match = refPath.match(/^\/([a-z]{2})(?:\/|$)/)
      if (match && isSupportedLang(match[1])) return match[1]
    }
  } catch {
    /* referrer が空/不正でも無視 */
  }

  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY)
    if (isSupportedLang(saved)) return saved
  } catch {
    /* localStorage 不可でも無視 */
  }

  return 'en'
}

// 「戻る」遷移先（カタログTOP）の URL を返す。
export function resolveHubUrl(): string {
  if (window.location.pathname.startsWith(FRONTEND_GAMES_PREFIX)) {
    const lang = resolveFrontendLang()
    return new URL(`/${lang}/`, window.location.origin).toString()
  }
  return new URL('/index.html', window.location.origin).toString()
}
