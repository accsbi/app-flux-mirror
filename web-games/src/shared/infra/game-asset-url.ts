// ゲーム実行用アセットの URL を組み立てる唯一の入口。
// 配信先: public/web-games/game-assets/<...>
//
// 設計ルール（3in1 のような「まとめ置き」はしない）:
//   - 全カードゲームで共通のもの（デッキ・背景・結果バナー win/lose/tie/push/blackjack(21)/match…・共通の音）
//       → 先頭フォルダ無しで渡す（例 'messages/win.png' 'effects/hit.mp3' 'cards/spades_A.png'）。
//         これらは common/ 配下に解決される。結果メッセージPNGは全ゲーム common/messages に集約。
//   - そのゲーム単独のもの（例 memory-battle のキャラ画像）
//       → 先頭にゲーム名フォルダを付けて渡す（例 'memory-battle/character/...'）。そのまま解決される。
const TOP_FOLDER = /^(common|blackjack|poker|casino-war|high-low|memory-battle|old-maid|configs)\//

function resolveRelativeAssetPath(relativePath: string): string {
  // 先頭にトップフォルダ指定があるものはそのまま（= ゲーム単独 or 明示 common）。
  if (TOP_FOLDER.test(relativePath)) return relativePath
  // 無印（messages/ effects/ cards/ images/ …）は「全カードゲーム共通」= common/ 配下。
  return `common/${relativePath}`
}

export function buildGameAssetUrl(relativePath: string): string {
  const resolved = resolveRelativeAssetPath(relativePath)
  const runtimeWindow = window as Window & { __ANDROID_APP__?: boolean }
  if (runtimeWindow.__ANDROID_APP__) {
    return `./game-assets/${resolved}`
  }
  return new URL(
    `${import.meta.env.BASE_URL}web-games/game-assets/${resolved}`,
    window.location.href,
  ).toString()
}
