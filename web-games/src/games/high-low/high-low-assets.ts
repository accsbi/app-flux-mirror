export function buildHighLowAssetUrl(relativePath: string): string {
  const runtimeWindow = window as Window & { __ANDROID_APP__?: boolean }

  if (runtimeWindow.__ANDROID_APP__) {
    return `./assets/high-low/${relativePath}`
  }

  if (window.location.pathname.startsWith('/highlowgame/')) {
    return `/highlowgame/public/assets/high-low/${relativePath}`
  }

  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/high-low/${relativePath}`, window.location.href).toString()
}

export function buildHighLowCommonAssetUrl(relativePath: string): string {
  const runtimeWindow = window as Window & { __ANDROID_APP__?: boolean }

  if (runtimeWindow.__ANDROID_APP__) {
    return `./assets/common/${relativePath}`
  }

  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/common/${relativePath}`, window.location.href).toString()
}
