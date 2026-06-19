import type { AppLanguage } from '../../games/memory/memory-app-config'

export type RemoveAdsUiLanguage = {
  close_label?: string
  purchase_label?: string
  cancel_label?: string
  terms_label?: string
  terms_title?: string
  terms_close_label?: string
  purchase_message?: string
  terms_content?: string
}

export type RemoveAdsUiConfigRoot = {
  default_language?: AppLanguage
  languages?: Record<string, RemoveAdsUiLanguage>
}

let removeAdsUiConfigPromise: Promise<RemoveAdsUiConfigRoot> | null = null

function resolveRemoveAdsUiConfigUrl(): string {
  const runtimeWindow = window as Window & { __ANDROID_APP__?: boolean }
  if (runtimeWindow.__ANDROID_APP__) {
    return './assets/configs/remove_ads_ui.json'
  }
  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/configs/remove_ads_ui.json`, window.location.href).toString()
}

export async function loadRemoveAdsUiConfig(): Promise<RemoveAdsUiConfigRoot> {
  if (!removeAdsUiConfigPromise) {
    const inlineWindow = window as Window & { __ANDROID_APP__?: boolean; __REMOVE_ADS_UI_CONFIG_JSON__?: RemoveAdsUiConfigRoot }
    if (inlineWindow.__ANDROID_APP__ && inlineWindow.__REMOVE_ADS_UI_CONFIG_JSON__) {
      removeAdsUiConfigPromise = Promise.resolve(inlineWindow.__REMOVE_ADS_UI_CONFIG_JSON__)
    } else {
      removeAdsUiConfigPromise = fetch(resolveRemoveAdsUiConfigUrl(), { cache: 'no-cache' }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load remove_ads_ui.json: ${response.status}`)
        }
        return (await response.json()) as RemoveAdsUiConfigRoot
      })
    }
  }
  return removeAdsUiConfigPromise
}

export function getRemoveAdsUiLanguage(config: RemoveAdsUiConfigRoot | null, language: AppLanguage): RemoveAdsUiLanguage | undefined {
  if (!config?.languages) {
    return undefined
  }
  const selected = config.languages[language]
  if (selected) {
    return selected
  }
  const fallbackLanguage = config.default_language ?? 'en'
  return config.languages[fallbackLanguage] ?? config.languages.en
}
