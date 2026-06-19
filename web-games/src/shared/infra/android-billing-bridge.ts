import type { AndroidBillingBridge, RemoveAdsStatePayload } from '../types/android-bridge'

const EMPTY_REMOVE_ADS_STATE: RemoveAdsStatePayload = {
  removeAds: false,
  price: ''
}

export function getAndroidBillingBridge(): AndroidBillingBridge | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.AndroidBilling ?? null
}

export function readRemoveAdsStateFromBridge(): RemoveAdsStatePayload {
  const bridge = getAndroidBillingBridge()
  if (!bridge?.getRemoveAdsState) {
    return EMPTY_REMOVE_ADS_STATE
  }
  try {
    const raw = bridge.getRemoveAdsState()
    const parsed = JSON.parse(raw) as Partial<RemoveAdsStatePayload>
    return {
      removeAds: parsed.removeAds === true,
      price: typeof parsed.price === 'string' ? parsed.price : ''
    }
  } catch {
    return EMPTY_REMOVE_ADS_STATE
  }
}
