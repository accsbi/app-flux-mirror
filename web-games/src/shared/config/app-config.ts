export type AppLanguage = 'en' | 'ja' | 'zh'

export type AppConfigRoot = {
  app_info?: {
    version?: string
    app_name?: string
    news_url_template?: string
    play_store_url?: string
    youtube_url?: string
    store_state?: string
  }
  play_store?: {
    default_language?: string
  }
  languages?: Record<string, AppConfigLanguage>
}

export type AppConfigLanguage = {
  app_title?: string
  menu?: Record<string, string>
  overview_info?: Record<string, string>
  settings?: Record<string, string>
  common?: Record<string, string>
  ads?: Record<string, string>
  game?: Record<string, string>
}

// ゲームごとに設定ファイルを分割（blackjack/poker/casino-war/old-maid）。
// 1ページ＝1ゲームだが、念のため設定名ごとにキャッシュする。
const appConfigPromises = new Map<string, Promise<AppConfigRoot>>()

type RuntimeConfigWindow = Window & {
  __ANDROID_APP__?: boolean
  __APP_CONFIG_JSON__?: AppConfigRoot
}
const MOJIBAKE_TOKENS = ['繧', '繝', '郢', '隨', '邵', '髫', '鬩', '陟', '蛻', '螳']

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  if (!value) {
    return 'en'
  }
  const normalized = value.toLowerCase()
  if (normalized.startsWith('ja')) {
    return 'ja'
  }
  if (normalized.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

function resolveConfigUrl(configName: string): string {
  const file = `${configName}_app_config.json`
  const runtimeWindow = window as RuntimeConfigWindow
  if (runtimeWindow.__ANDROID_APP__) {
    return `./assets/configs/${file}`
  }
  if (window.location.pathname.startsWith('/playingcardshub/')) {
    return `/playingcardshub/public/assets/configs/${file}`
  }
  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/configs/${file}`, window.location.href).toString()
}

// configName = ゲームの slug（= CSV file_name。例 'blackjack'）。各ゲームの設定ファイルを読む。
export async function loadAppConfig(configName: string): Promise<AppConfigRoot> {
  let promise = appConfigPromises.get(configName)
  if (!promise) {
    const runtimeWindow = window as RuntimeConfigWindow
    const embeddedConfig = runtimeWindow.__APP_CONFIG_JSON__
    if (embeddedConfig) {
      promise = Promise.resolve(sanitizeMojibakeLanguageValues(embeddedConfig))
    } else {
      promise = fetch(resolveConfigUrl(configName), { cache: 'no-cache' }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${configName}_app_config.json: ${response.status}`)
        }
        const parsed = (await response.json()) as AppConfigRoot
        return sanitizeMojibakeLanguageValues(parsed)
      })
    }
    appConfigPromises.set(configName, promise)
  }
  return promise
}

function looksMojibake(value: string): boolean {
  if (value.length < 4) {
    return false
  }
  let hits = 0
  for (const token of MOJIBAKE_TOKENS) {
    const parts = value.split(token).length - 1
    hits += parts
    if (hits >= 2) {
      return true
    }
  }
  return false
}

function sanitizeSection(
  targetSection: Record<string, string> | undefined,
  fallbackSection: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!targetSection && !fallbackSection) {
    return undefined
  }
  const next: Record<string, string> = { ...(targetSection ?? {}) }
  const keys = new Set<string>([...Object.keys(targetSection ?? {}), ...Object.keys(fallbackSection ?? {})])
  keys.forEach((key) => {
    const current = targetSection?.[key]
    const fallback = fallbackSection?.[key]
    if (typeof current !== 'string' || looksMojibake(current)) {
      if (typeof fallback === 'string' && fallback.length > 0) {
        next[key] = fallback
      }
    }
  })
  return next
}

function sanitizeLanguage(
  target: AppConfigLanguage | undefined,
  fallback: AppConfigLanguage | undefined
): AppConfigLanguage | undefined {
  if (!target && !fallback) {
    return undefined
  }
  const next: AppConfigLanguage = { ...(target ?? {}) }
  const targetTitle = target?.app_title
  if (typeof targetTitle !== 'string' || looksMojibake(targetTitle)) {
    if (typeof fallback?.app_title === 'string' && fallback.app_title.length > 0) {
      next.app_title = fallback.app_title
    }
  }
  next.menu = sanitizeSection(target?.menu, fallback?.menu)
  next.overview_info = sanitizeSection(target?.overview_info, fallback?.overview_info)
  next.settings = sanitizeSection(target?.settings, fallback?.settings)
  next.common = sanitizeSection(target?.common, fallback?.common)
  next.ads = sanitizeSection(target?.ads, fallback?.ads)
  next.game = sanitizeSection(target?.game, fallback?.game)
  return next
}

function sanitizeMojibakeLanguageValues(config: AppConfigRoot): AppConfigRoot {
  const languages = config.languages
  if (!languages) {
    return config
  }
  const en = languages.en
  if (!en) {
    return config
  }
  const nextLanguages: Record<string, AppConfigLanguage> = { ...languages }
  const ja = sanitizeLanguage(languages.ja, en)
  if (ja) {
    nextLanguages.ja = ja
  }
  const zh = sanitizeLanguage(languages.zh, en)
  if (zh) {
    nextLanguages.zh = zh
  }
  return {
    ...config,
    languages: nextLanguages
  }
}

export function getDefaultLanguage(config: AppConfigRoot): AppLanguage {
  const fromPlayStore = normalizeLanguage(config.play_store?.default_language)
  if (fromPlayStore === 'ja' || fromPlayStore === 'zh' || fromPlayStore === 'en') {
    return fromPlayStore
  }
  return 'en'
}

export function getLanguageBlock(config: AppConfigRoot, language: AppLanguage): AppConfigLanguage {
  const languages = config.languages ?? {}
  return (
    languages[language] ??
    languages[getDefaultLanguage(config)] ??
    languages.en ??
    ({} as AppConfigLanguage)
  )
}

export function getLocalizedString(source: Record<string, string> | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = source?.[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return ''
}

export function splitTextLines(value: string, options?: { preserveEmpty?: boolean }): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => options?.preserveEmpty || line.length > 0)
}
