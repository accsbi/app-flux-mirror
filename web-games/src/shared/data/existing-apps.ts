// 既存（別管理）アプリ。CSV(games-list.csv)とは同期しない「固定のハードコード」。
// 「別のカードゲーム」一覧に常時表示する。出典は catalog/existing_app/existing -list.csv を手で転記
// （同期不要＝CSV を直しても自動反映しない／ここを直すのが唯一の正）。
// feat 画像は public/site-assets/images/games-apps/<slug>/<slug>-feat.webp に配置済み。
export type ExistingApp = { slug: string; title: string; storeUrl: string }

export const EXISTING_APPS: ExistingApp[] = [
  { slug: 'simpleblackjack', title: 'Simple Blackjack', storeUrl: 'https://play.google.com/store/apps/details?id=com.game.simpleblackjack' },
  { slug: 'simple_poker', title: 'Simple Poker (Five-card draw)', storeUrl: 'https://play.google.com/store/apps/details?id=com.game.simple_poker' },
  { slug: 'playingcardshub', title: 'Blackjack Poker Casino War hub', storeUrl: 'https://play.google.com/store/apps/details?id=com.game.playingcardshub' },
]
