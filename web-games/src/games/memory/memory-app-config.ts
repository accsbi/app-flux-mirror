export type AppLanguage = 'en' | 'ja' | 'zh'

export type MemoryAppInfo = {
  version?: string
  news_url_template?: string
  play_store_url?: string
}

export type MemoryAppAssetConfig = {
  background?: string
  card_base_path?: string
  back_card?: string
  locked_stage_thumb?: string
  bgm?: string
  card_open_sound?: string
  match_sound?: string
  submit_sound?: string
  win_sound?: string
  lose_sound?: string
  draw_sound?: string
  match_banner?: string
  win_banner?: string
  lose_banner?: string
  start_banner?: string
  wait_banner?: string
}

export type MemoryEnemyLanguage = {
  name?: string
  profile?: string
}

export type MemoryEnemyConfig = {
  stage: number
  reward_coin: number
  pair_capture_chance_percent?: number
  image?: string
  languages?: Record<string, MemoryEnemyLanguage>
}

export type MemoryAppLanguage = {
  menu?: Record<string, string>
  settings?: Record<string, string>
  common?: Record<string, string>
  ads?: Record<string, string>
  game?: Record<string, string>
  overview_info?: Record<string, string>
}

export type MemoryAppConfigRoot = {
  default_language?: AppLanguage
  app_info?: MemoryAppInfo
  assets?: MemoryAppAssetConfig
  enemies?: MemoryEnemyConfig[]
  languages?: Record<string, MemoryAppLanguage>
}

let memoryAppConfigPromise: Promise<MemoryAppConfigRoot> | null = null

const REQUIRED_MEMORY_ASSET_KEYS: Array<keyof MemoryAppAssetConfig> = [
  'background',
  'card_base_path',
  'back_card',
  'locked_stage_thumb',
  'bgm',
  'card_open_sound',
  'match_sound',
  'submit_sound',
  'win_sound',
  'lose_sound',
  'draw_sound',
  'match_banner',
  'win_banner',
  'lose_banner',
  'start_banner',
  'wait_banner'
]

type RuntimeMemoryConfigWindow = Window & {
  __ANDROID_APP__?: boolean
  __MEMORY_APP_CONFIG_JSON__?: MemoryAppConfigRoot
}

function resolveMemoryAppConfigUrl(): string {
  const runtimeWindow = window as RuntimeMemoryConfigWindow
  if (runtimeWindow.__ANDROID_APP__) {
    return './assets/configs/memory_app_config.json'
  }
  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/configs/memory_app_config.json`, window.location.href).toString()
}

export async function loadMemoryAppConfig(): Promise<MemoryAppConfigRoot> {
  if (!memoryAppConfigPromise) {
    const runtimeWindow = window as RuntimeMemoryConfigWindow
    const embeddedConfig = runtimeWindow.__MEMORY_APP_CONFIG_JSON__
    if (embeddedConfig) {
      memoryAppConfigPromise = Promise.resolve(validateMemoryAppConfig(embeddedConfig))
    } else {
      memoryAppConfigPromise = fetch(resolveMemoryAppConfigUrl(), { cache: 'no-cache' }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load memory_app_config.json: ${response.status}`)
        }
        return validateMemoryAppConfig((await response.json()) as MemoryAppConfigRoot)
      })
    }
  }
  return memoryAppConfigPromise
}

function validateMemoryAppConfig(config: MemoryAppConfigRoot): MemoryAppConfigRoot {
  const missingAssetKeys = REQUIRED_MEMORY_ASSET_KEYS.filter((key) => {
    const value = config.assets?.[key]
    return typeof value !== 'string' || value.length === 0
  })
  if (missingAssetKeys.length > 0) {
    throw new Error(`memory_app_config.json is missing required asset keys: ${missingAssetKeys.join(', ')}`)
  }
  return config
}

export function getMemoryAppLanguage(config: MemoryAppConfigRoot | null, language: AppLanguage): MemoryAppLanguage | undefined {
  if (!config?.languages) {
    return undefined
  }
  const selected = config.languages[language]
  const fallbackLanguage = config.default_language ?? 'en'
  const fallback = config.languages[fallbackLanguage] ?? config.languages.en
  if (!selected) {
    return fallback
  }
  return {
    menu: { ...(fallback?.menu ?? {}), ...(selected.menu ?? {}) },
    settings: { ...(fallback?.settings ?? {}), ...(selected.settings ?? {}) },
    common: { ...(fallback?.common ?? {}), ...(selected.common ?? {}) },
    ads: { ...(fallback?.ads ?? {}), ...(selected.ads ?? {}) },
    game: { ...(fallback?.game ?? {}), ...(selected.game ?? {}) },
    overview_info: { ...(fallback?.overview_info ?? {}), ...(selected.overview_info ?? {}) }
  }
}

export function getMemoryEnemyLanguage(
  enemy: MemoryEnemyConfig | undefined,
  config: MemoryAppConfigRoot | null,
  language: AppLanguage
): MemoryEnemyLanguage | undefined {
  if (!enemy?.languages) {
    return undefined
  }
  const selected = enemy.languages[language]
  if (selected) {
    return selected
  }
  const fallbackLanguage = config?.default_language ?? 'en'
  return enemy.languages[fallbackLanguage] ?? enemy.languages.en
}
