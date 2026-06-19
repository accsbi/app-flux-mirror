import { buildGameAssetUrl } from './game-asset-url'
import { SOUND_ENABLED_KEY } from '../config/storage-keys'

// 「決定音(submit.mp3)」を鳴らすだけの処理の単一ソース。
// 各スタンドアロンアプリ/ハブで同じコードがコピペされていたのを集約。
// 効果音 OFF（SOUND_ENABLED_KEY === 'false'）のときは鳴らさない。
export function playSubmitSound(): void {
  if (localStorage.getItem(SOUND_ENABLED_KEY) === 'false') {
    return
  }
  const audio = new Audio(buildGameAssetUrl('effects/submit.mp3'))
  audio.currentTime = 0
  void audio.play().catch(() => undefined)
}
