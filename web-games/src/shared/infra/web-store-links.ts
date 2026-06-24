import { buildGameAssetUrl } from './game-asset-url'

export type WebPromotionLinks = {
  title: string
  storeUrl: string
  storeBadgeUrl: string
  storeBadgeAlt: string
  youtubeUrl: string
  youtubeBadgeUrl: string
  youtubeBadgeAlt: string
  /** ニュース / 更新情報 (外部リンク) の slug。app-flux.com/{lang}/games-apps/<slug> */
  newsUrlSlug: string
}

const GOOGLE_PLAY_BADGE_URL = buildGameAssetUrl('common/images/google-play.svg')
const YOUTUBE_BADGE_URL = buildGameAssetUrl('common/images/youtube.svg')

/**
 * メニューの「ニュース / 更新情報 (外部リンク)」のURL（唯一の正）。
 *
 * リンク先はゲームごとに異なる（slug で分岐）。呼び出し側にURLを直書きせず、
 * 必ずこの関数と各ゲームの WebPromotionLinks.newsUrlSlug を経由すること。
 */
export function buildNewsUrl(links: WebPromotionLinks, language: string): string {
  return `https://app-flux.com/${language}/games-apps/${links.newsUrlSlug}`
}

// メニューの「詳細」ボタンの遷移先＝本サイトの該当ゲーム詳細ページ（外部ではない・内部）。
// 言語とゲーム slug(=file_name) で動的に組み立てる。例 /en/games-apps/blackjack/
export function buildDetailUrl(slug: string, language: string): string {
  return `/${language}/games-apps/${slug}/`
}

/**
 * メニュー「別のカードゲーム」(Android のみ)の遷移先。
 * 一覧は CSV(games-apps-list.csv)管理・サイト再デプロイで更新するため、アプリは
 * この固定 URL を外部ブラウザで開くだけ（アプリ更新＝Google 再申請は不要）。
 */
export function buildOtherCardGamesUrl(language: string): string {
  return `https://app-flux.com/${language}/games-apps`
}

// playing_cards の web/データを公開するライブ・ベースURL。
// 方針: **Cloudflare Pages** に新規デプロイ（app-flux は触らない・後でドメイン載せ替え）。
// Android アプリのモーダル（別のカードゲーム一覧・お知らせ・feat 画像）はアプリにバンドルせず
// ここから**ライブ取得**する。サイト再デプロイで反映＝Google 再申請不要。手順: docs/DEPLOY_CLOUDFLARE.md。
// Cloudflare Pages の公開URL（ルート配信 base:'/'）。未デプロイ/オフライン時は fetch 失敗→
// バンドルにフォールバックする。
// ※ ゲーム一覧そのものはハードコードしない（中身は card-games-list.json＝games-list.csv 由来）。
export const PLAYING_CARDS_LIVE_BASE = 'https://app-flux-mirror.pages.dev'

/** ライブデータ(JSON/画像)の絶対URLを組む。例 buildLiveDataUrl('web-games/game-assets/configs/card-games-list.json') */
export function buildLiveDataUrl(relPath: string): string {
  return `${PLAYING_CARDS_LIVE_BASE}/${relPath.replace(/^\//, '')}`
}

// お知らせモーダルの「このアプリについて」外部リンク（別窓）。
// 形: https://{ドメイン=PLAYING_CARDS_LIVE_BASE}/{language}/games-apps/{file_name}/（言語は表示言語）。
export function buildAboutUrl(fileName: string, language: string): string {
  return `${PLAYING_CARDS_LIVE_BASE}/${language}/games-apps/${fileName}/`
}

export const MEMORY_BATTLE_WEB_LINKS: WebPromotionLinks = {
  title: 'Classic Simple Memory Battle',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.games.memorymonsters',
  storeBadgeUrl: GOOGLE_PLAY_BADGE_URL,
  storeBadgeAlt: 'Classic Simple Memory Battle on Google Play',
  youtubeUrl: 'https://www.youtube.com/watch?v=4Qjgvynijgs',
  youtubeBadgeUrl: YOUTUBE_BADGE_URL,
  youtubeBadgeAlt: 'Classic Simple Memory Battle on YouTube',
  newsUrlSlug: 'memorymonsters'
}

export const CARD_GAMES_HUB_WEB_LINKS: WebPromotionLinks = {
  title: 'Blackjack Poker Casino War hub',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.game.playingcardshub',
  storeBadgeUrl: GOOGLE_PLAY_BADGE_URL,
  storeBadgeAlt: 'Blackjack Poker Casino War hub on Google Play',
  youtubeUrl: 'https://www.youtube.com/watch?v=ZNJr2_5G9qA',
  youtubeBadgeUrl: YOUTUBE_BADGE_URL,
  youtubeBadgeAlt: 'Blackjack Poker Casino War hub on YouTube',
  // playingcardshub のページは存在しないため、存在する blackjack_3in1 へ直接向ける（{lang}は動的）。
  newsUrlSlug: 'blackjack_3in1'
}

// High & Low はストア/ニュースのリンク先が独立。共通部分はハブ設定を参照しつつ、
// 固有のリンク（Google Play / ニュース slug）だけ上書きする。
export const HIGH_LOW_WEB_LINKS: WebPromotionLinks = {
  ...CARD_GAMES_HUB_WEB_LINKS,
  title: 'Classic Simple High & Low',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.game.highandlow',
  storeBadgeAlt: 'Classic Simple High & Low on Google Play',
  // High & Low は YouTube 動画リンク無し（web-app_list.csv で空）。アイコンを出さない。
  youtubeUrl: '',
  newsUrlSlug: 'highandlow'
}
