// 広告表示のためのゲームカウント＆判定の単一ソース。
// 方針: WEB(PC/スマホBrowser)=モックダイアログ / Android アプリ=実広告。7ゲームに一度。
// カウンタのキーはゲーム/プラットフォームごとに分けて渡す
//   （例: highlow_web_game_count, highlow_app_game_count, simplebj_web_game_count）。
export const AD_INTERVAL = 7

// 全カードゲーム共通の WEB 広告カウント（単一ソース）。
//   Blackjack / Poker / Casino War = 1ゲームで +1
//   High & Low = Next Turn 押下(=1プレイ)で +1
// 合算で 7 ごとにモック広告。各ゲームとも「1プレイ +1、7 ごと」で揃える（専用ロジックは持たない）。
export const WEB_AD_COUNT_KEY = 'card_games_web_ad_count'

// memorymonsters 専用の広告カウント（他カードゲームとは別系統）。
// memory の広告タイミングは「7ごと」ではなく、一人用=1ゲーム終了 / CPU対戦=プレイヤー5ペア時点
// （詳細は memory-battle-game-table.ts の requestAd）。間隔判定には使わず表示カウントの記録だけに使う。
export const MEMORY_WEB_AD_COUNT_KEY = 'memorymonsters_web_ad_count'

// old-maid 専用の広告カウント（他カードゲームとは別系統＝独自ルール）。
// 広告タイミングは「7ごと」ではなく「Player の手札が初めて3枚以下になった時点・1ゲーム1回」
// （old-maid-game-table.ts の maybeShowHandCountAd）。間隔判定には使わず、モック表示カウントの記録だけ。
// ★重要: old-maid と memory は共通カウント WEB_AD_COUNT_KEY(card_games_web_ad_count) を増やさない。
//   他カードゲームから遊びに来ても 1 とカウントせず、各自専用キーのみで完結する（独自ルール）。
export const OLD_MAID_WEB_AD_COUNT_KEY = 'oldmaid_web_ad_count'

// WEB かスマホアプリ(Android)かの単一判定。
export function isAndroidApp(): boolean {
  return (window as Window & { __ANDROID_APP__?: boolean }).__ANDROID_APP__ === true
}

// 広告表示前のネットワーク確認（**Android のみ**）の単一ソース。
// オフラインだと実広告を出せないため、呼び出し側は true のとき広告を出さず、統一文言
// （shared-chrome-text の offlineAdTitle/offlineAdMessage）で警告してスタートへ戻す。
// WEB は広告自体が無いので常に false（＝ネットワークチェックしない＝Android限定）。
export function isOfflineForAd(): boolean {
  return isAndroidApp() && navigator.onLine === false
}

// Android: 1ゲーム終了（high-low は PLAYER 攻撃ターン）を毎回ネイティブへ通知するだけ。
// 7回カウント・課金(広告削除)判定・ネットワーク確認・実広告の表示は **すべてネイティブ側** が行う。
// （Web ビルドのコピーで上書きされない＝ロジックの単一所在をネイティブに固定する方針）。
// WEB ブラウザでは何もしない（モックは各ゲームが別途出す）。
export function notifyNativeGameEnd(): void {
  const win = window as Window & { AppFluxHost?: { postMessage: (msg: string) => void } }
  win.AppFluxHost?.postMessage(JSON.stringify({ type: 'game-end' }))
}

function readCount(key: string): number {
  const n = Number(localStorage.getItem(key))
  return Number.isInteger(n) && n >= 0 ? n : 0
}

// 指定キーのゲームカウンタを +1 し、{count, show(7回ごと true)} を返す。
export function countGameForAd(key: string): { count: number; show: boolean } {
  const next = readCount(key) + 1
  localStorage.setItem(key, String(next))
  return { count: next, show: next > 0 && next % AD_INTERVAL === 0 }
}

// 指定キーの現在カウントを増やさずに読むだけ（デバッグ表示用）。
export function peekGameCount(key: string): number {
  return readCount(key)
}
