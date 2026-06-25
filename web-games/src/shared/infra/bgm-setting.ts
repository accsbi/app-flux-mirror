export const BGM_ENABLED_KEY = 'simplebj_bgm_enabled'
export const BGM_VOLUME_KEY = 'simplebj_bgm_volume'
export const BGM_SETTING_CHANGED_EVENT = 'casino-hub:bgm-setting-changed'
export const DEFAULT_BGM_VOLUME = 0.18

// BGM アセットの単一ソース。全ゲーム共通の置き場へ集約:
//   public/web-games/game-assets/common/bgm/  （default = main_bgm_01.ogg）。
// 02/03 は容量次第で今後 Android 用に使う想定。UI は従来どおり ON/OFF のみで曲は選ばせない。
export const DEFAULT_BGM_FILE = 'main_bgm_01.ogg'
// buildGameAssetUrl() / assetUrl()（'common/' 始まりを尊重）用。
export const DEFAULT_BGM_ASSET = `common/bgm/${DEFAULT_BGM_FILE}`
// buildHighLowCommonAssetUrl() など「common ルート相対」を受け取る入口用。
export const DEFAULT_BGM_COMMON_RELATIVE = `bgm/${DEFAULT_BGM_FILE}`

export function loadBgmEnabledSetting(): boolean {
  const raw = localStorage.getItem(BGM_ENABLED_KEY)
  if (raw === null || raw.trim() === '') {
    return false
  }
  return raw === 'true'
}

export function loadBgmVolumeSetting(): number {
  const raw = localStorage.getItem(BGM_VOLUME_KEY)
  if (raw === null || raw.trim() === '') {
    return DEFAULT_BGM_VOLUME
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BGM_VOLUME
  }
  return Math.max(0, Math.min(1, parsed))
}

export function saveBgmEnabledSetting(enabled: boolean): void {
  localStorage.setItem(BGM_ENABLED_KEY, String(enabled))
  window.dispatchEvent(
    new CustomEvent(BGM_SETTING_CHANGED_EVENT, {
      detail: { enabled }
    })
  )
}

export function saveBgmVolumeSetting(volume: number): void {
  const normalized = Math.max(0, Math.min(1, volume))
  localStorage.setItem(BGM_VOLUME_KEY, String(normalized))
  window.dispatchEvent(
    new CustomEvent(BGM_SETTING_CHANGED_EVENT, {
      detail: { volume: normalized }
    })
  )
}
