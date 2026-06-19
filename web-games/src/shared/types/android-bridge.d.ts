export type RemoveAdsStatePayload = {
  removeAds: boolean
  price: string
}

export type BillingResultPayload = {
  code: string
}

export type AndroidBillingBridge = {
  buyRemoveAds: () => void
  getRemoveAdsState: () => string
  showInterstitialAd: () => boolean
  showRecoveryInterstitialAd?: () => boolean
  // デバッグビルドのみネイティブが生やす：広告削除を consume して未購入へ戻す（購入テスト用）。
  // UI には出さず、開発者が Chrome DevTools のコンソールから直接呼ぶ用途（本番ビルドは no-op）。
  debugConsumeRemoveAds?: () => void
}

declare global {
  interface Window {
    AndroidBilling?: AndroidBillingBridge
    __onEntitlementsChanged?: (payload: Partial<RemoveAdsStatePayload>) => void
    __onBillingResult?: (payload: BillingResultPayload) => void
  }
}

export {}
