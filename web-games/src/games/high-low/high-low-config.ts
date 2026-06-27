import type { AppLanguage } from '../../shared/config/app-config'

export type HLConfig = {
  default_language?: string
  app_info?: { version?: string; play_store_url?: string; youtube_url?: string; store_state?: string }
  languages?: Record<string, HLConfigLang>
}

export type HLConfigLang = {
  menu?: Record<string, string>
  overview_info?: Record<string, string>
  settings?: Record<string, string>
  game?: Record<string, string>
  /** 広告削除ダイアログ文言（3in1 ハブと同じ ads ブロック。playingcardshub に揃える） */
  ads?: Record<string, string>
}

let configPromise: Promise<HLConfig> | null = null

type RuntimeHighLowConfigWindow = Window & {
  __ANDROID_APP__?: boolean
  __HIGHLOW_APP_CONFIG_JSON__?: HLConfig
}

function resolveHighLowConfigUrl(): string {
  if (window.location.pathname.startsWith('/highlowgame/')) {
    return '/highlowgame/public/assets/configs/high-low_app_config.json'
  }
  // WEB(base '/') / Android(base './' + appassets WebViewAssetLoader) 共通の base 相対スキーム
  // （共有 buildGameAssetUrl と同一）。dist 構成は web-games/game-assets/ なので Android でも
  //   ./web-games/game-assets/... = /assets/web-games/game-assets/... に解決される。
  // 旧 Android 専用 './assets/configs/...' は /assets/assets/... の二重 assets で 404 だった（削除）。
  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/configs/high-low_app_config.json`, window.location.href).toString()
}

export function loadHighLowConfig(): Promise<HLConfig> {
  if (configPromise) return configPromise
  // 埋め込み config があれば優先（旧 app-flux の inline 方式）。新 Android は appassets(WebViewAssetLoader)
  // 経由の https fetch が使えるため未設定＝下の fetch で web と同じく取得する。
  const embedded = (window as RuntimeHighLowConfigWindow).__HIGHLOW_APP_CONFIG_JSON__
  if (embedded) {
    configPromise = Promise.resolve(embedded)
    return configPromise
  }
  configPromise = fetch(resolveHighLowConfigUrl())
    .then(r => r.json() as Promise<HLConfig>)
    .catch(() => { throw new Error('high-low config の取得に失敗しました（フォールバック禁止）。') })
  return configPromise
}

export function hlGet(config: HLConfig, lang: AppLanguage, section: keyof HLConfigLang, key: string, fallback = ''): string {
  return config?.languages?.[lang]?.[section]?.[key]
    ?? config?.languages?.['en']?.[section]?.[key]
    ?? fallback
}

export function hlFmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}
