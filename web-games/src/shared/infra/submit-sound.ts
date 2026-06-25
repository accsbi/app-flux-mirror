import { buildGameAssetUrl } from './game-asset-url'
import { SOUND_ENABLED_KEY } from '../config/storage-keys'

// 効果音(SFX)の単一ソース。各スタンドアロン/ハブ/ゲーム盤でコピペされていた
//   const a = new Audio(url); a.currentTime = 0; void a.play().catch(...)
// を集約し、さらに「再生中の SFX を追跡して一括停止」できるようにする。
// 効果音 OFF（SOUND_ENABLED_KEY === 'false'）のときは鳴らさない。

// 再生中の SFX を保持（ホーム戻りアニメ等で stopAllEffects() により一括停止する）。
const activeEffects = new Set<HTMLAudioElement>()

// ── BG-3: ホーム戻り中の効果音の鳴り込み抑止 ────────────────────────────────
// 盤面の配り演出/CPUターンは `async + await delay()` のループで、ホームへ戻って盤面を
// アンマウントしても“走り続けて”音を鳴らす（実測: 戻り +1156ms 等で deal_cards_btn が漏れた）。
// 固定時間ウィンドウでは足りないため、2系統で抑止する:
//  (A) 盤面SFX(playTrackedEffect)＝ホーム戻り後から「次のゲーム開始(clearEffectSuppression)」まで
//      無期限に抑止。残響ループが何秒続いても確実に黙らせる。メニュー操作音は別系統なので影響しない。
//  (B) 決定音(playSubmitSound)＝戻りフェード中だけの短い時間ウィンドウ。メニュー表示後はすぐ復帰させる。
let suppressTrackedUntilClear = false  // (A) 盤面SFX: ゲーム開始まで無期限
let suppressSubmitUntil = 0            // (B) 決定音: 時間ウィンドウ

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function isSoundOff(): boolean {
  return localStorage.getItem(SOUND_ENABLED_KEY) === 'false'
}

// 外部で生成した Audio を追跡集合に登録（終了時に自動で除外）。
// 自前で play を制御したい呼び出し（例: poker の結果ジングル）が使う。
export function registerEffectAudio(audio: HTMLAudioElement): void {
  activeEffects.add(audio)
  audio.addEventListener('ended', () => activeEffects.delete(audio), { once: true })
}

// Audio を追跡集合に入れて再生。失敗時は集合から除外（リーク防止）。
function trackAndPlay(audio: HTMLAudioElement): void {
  registerEffectAudio(audio)
  audio.currentTime = 0
  void audio.play().catch(() => {
    activeEffects.delete(audio)
  })
}

// 決定音(submit.mp3)。従来 API 維持。フェード中(B)のみ抑止＝メニューはすぐ鳴る。
export function playSubmitSound(): void {
  if (isSoundOff() || suppressSubmitUntil > nowMs()) {
    return
  }
  trackAndPlay(new Audio(buildGameAssetUrl('effects/submit.mp3')))
}

// 任意の効果音 URL を鳴らす（各ゲーム盤の playSound/playEffect から共通利用）。
// 盤面SFX なので、ホーム戻り後はゲーム開始まで(A)抑止＝残響ループを確実に黙らせる。
export function playTrackedEffect(url: string, opts?: { volume?: number }): void {
  if (isSoundOff() || suppressTrackedUntilClear) {
    return
  }
  const audio = new Audio(url)
  if (opts?.volume !== undefined) {
    audio.volume = opts.volume
  }
  trackAndPlay(audio)
}

// 再生中の効果音をすべて停止（ホームへ戻るフェード開始時に呼ぶ）。
// suppressMs>0 で「戻り」とみなし、盤面SFXを次のゲーム開始まで(A)、決定音をフェード中だけ(B)抑止する。
// BGM はここでは扱わない（各アプリの teardownBgm が管理）。
export function stopAllEffects(suppressMs = 0): void {
  for (const audio of activeEffects) {
    audio.pause()
    audio.currentTime = 0
  }
  activeEffects.clear()
  if (suppressMs > 0) {
    suppressTrackedUntilClear = true
    suppressSubmitUntil = nowMs() + suppressMs
  }
}

// ゲーム開始など「これから盤面の音を鳴らす」局面で抑止を解除する（必須）。
export function clearEffectSuppression(): void {
  suppressTrackedUntilClear = false
  suppressSubmitUntil = 0
}
