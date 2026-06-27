// WEB(base '/') / Android(base './' + appassets WebViewAssetLoader) 共通の base 相対スキーム
// （共有 buildGameAssetUrl と同一）。Android では ./web-games/game-assets/... =
// /assets/web-games/game-assets/... に解決される。旧 './assets/...' 分岐は二重 assets で 404 だった（削除）。
export function buildHighLowAssetUrl(relativePath: string): string {
  if (window.location.pathname.startsWith('/highlowgame/')) {
    return `/highlowgame/public/assets/high-low/${relativePath}`
  }

  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/high-low/${relativePath}`, window.location.href).toString()
}

export function buildHighLowCommonAssetUrl(relativePath: string): string {
  return new URL(`${import.meta.env.BASE_URL}web-games/game-assets/common/${relativePath}`, window.location.href).toString()
}
