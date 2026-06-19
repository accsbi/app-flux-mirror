// ゲーム内のヒーロー/トップ画像の解決。
//
// 旧 app-flux の `*_top.webp`（3in1/images, highandlow/images 等の旧名称・旧パス）は使わない。
// サイトの feat 画像＝Google Play フィーチャーグラフィック(1024×500)を png_to_webp.py で WEBP 化した
// `<slug>-feat.webp` を、そのままゲームのトップ画像として動的に使う（「top は feat と同じ」）。
//
// 命名規約: /site-assets/images/games-apps/<slug>/<slug>-feat.webp（slug は CSV file_name）。
export function buildFeatureImageUrl(slug: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const path = `${base}site-assets/images/games-apps/${slug}/${slug}-feat.webp`.replace(/\/{2,}/g, '/')
  return new URL(path, window.location.href).toString()
}
