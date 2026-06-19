import { css, html, nothing, type ReactiveController, type ReactiveControllerHost } from 'lit'

// HOME 復帰などの画面遷移で「フワッと黒へ → 切替 → フワッと戻す」演出の単一ソース。
// 手本は kaitensushimaster の scene-fade（out=不透明化, in=透明化）。全ゲームで挙動を統一する。
export const SCENE_FADE_MS = 460

export type SceneFadeState = 'idle' | 'out' | 'in'

// Lit コンポーネント用スタイル（static styles に混ぜる）
export const sceneFadeStyles = css`
  .scene-fade {
    position: fixed;
    inset: 0;
    z-index: 1200;
    background: #000;
    pointer-events: none;
  }
  .scene-fade.out {
    animation: sceneFadeOut ${SCENE_FADE_MS}ms ease forwards;
  }
  .scene-fade.in {
    animation: sceneFadeIn ${SCENE_FADE_MS}ms ease forwards;
  }
  @keyframes sceneFadeOut {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes sceneFadeIn {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`

// Lit コンポーネントの render に差し込むオーバーレイ
export function renderSceneFade(state: SceneFadeState) {
  return state === 'idle' ? nothing : html`<div class="scene-fade ${state}"></div>`
}

// 同一ページ内遷移（例: ゲーム→メニュー）用。out→action→in を回す。
export class SceneFadeController implements ReactiveController {
  state: SceneFadeState = 'idle'
  private timer: number | null = null

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostDisconnected(): void {
    this.clearTimer()
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
  }

  private set(next: SceneFadeState): void {
    this.state = next
    this.host.requestUpdate()
  }

  // フワッと黒へ → action 実行 → フワッと戻す
  run(action: () => void): void {
    if (this.state !== 'idle') {
      return
    }
    this.clearTimer()
    this.set('out')
    this.timer = window.setTimeout(() => {
      action()
      this.set('in')
      this.timer = window.setTimeout(() => {
        this.set('idle')
        this.timer = null
      }, SCENE_FADE_MS)
    }, SCENE_FADE_MS)
  }
}

// 別ページへ遷移する場合（main.*.ts の window.location 直前）用。
// body に黒オーバーレイを差してフェードし、完了で resolve。遷移後は新ページが描画される。
export function playSceneFadeOut(): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.cssText =
      `position:fixed;inset:0;z-index:2147483600;background:#000;opacity:0;` +
      `pointer-events:none;transition:opacity ${SCENE_FADE_MS}ms ease;`
    document.body.appendChild(overlay)
    // 2フレーム後に不透明化してトランジションを確実に発火させる
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1'
      })
    })
    window.setTimeout(resolve, SCENE_FADE_MS)
  })
}
