const ADS_REMOVED_KEY = 'ads_removed'
const LEGACY_ADS_REMOVED_KEY = 'simplebj_ads_removed_temp'

export function isAdsRemoved(): boolean {
  if (localStorage.getItem(ADS_REMOVED_KEY) === 'true') {
    return true
  }
  return localStorage.getItem(LEGACY_ADS_REMOVED_KEY) === 'true'
}

export function setAdsRemoved(value: boolean): void {
  const normalized = value ? 'true' : 'false'
  localStorage.setItem(ADS_REMOVED_KEY, normalized)
  localStorage.setItem(LEGACY_ADS_REMOVED_KEY, normalized)
}
