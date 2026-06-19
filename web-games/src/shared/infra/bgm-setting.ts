export const BGM_ENABLED_KEY = 'simplebj_bgm_enabled'
export const BGM_VOLUME_KEY = 'simplebj_bgm_volume'
export const BGM_SETTING_CHANGED_EVENT = 'casino-hub:bgm-setting-changed'
export const DEFAULT_BGM_VOLUME = 0.18

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
