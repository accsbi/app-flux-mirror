import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { AppLanguage } from '../../shared/config/app-config'
import { getSharedChromeText } from '../../shared/config/shared-chrome-text'
import { LANGUAGE_KEY } from '../../shared/config/storage-keys'
import { getLocalizedString } from '../../shared/config/text-utils'
import { loadMemoryAppConfig, getMemoryAppLanguage, type MemoryAppConfigRoot } from './memory-app-config'
import './memory-battle-game-table'

type MemoryBattleBackHandler = {
  onSystemBack: () => boolean
}

// 「次回から表示しない」の保存先（他ゲームと同形式：<slug>_rules_hidden）。
const RULES_HIDDEN_KEY = 'memory-battle_rules_hidden'

// Memory Battle のスタンドアロン殻。メニュー/設定は盤面(memory-battle-game-table)が内蔵するため
// ここは盤面のマウントと Android 戻る制御の橋渡し、そして初回のルール説明(チュートリアル)のみ。
// window グローバル名 __SIMPLE_MEMORY_BATTLE_APP__ は native 参照のため据え置き。
@customElement('memory-battle-standalone-app')
export class MemoryBattleStandaloneApp extends LitElement {
  // 初回起動時のルール説明（チュートリアル）。high-low と同一挙動：
  // 初回は表示、チェックで次回以降は localStorage に保存して非表示。
  @state() private showRules = false
  @state() private rulesDontShow = false
  // 開始説明（rules_text）は memory の設定 game.rules_text（= base MD の Quick Start 由来）から取得。
  @state() private memoryConfig: MemoryAppConfigRoot | null = null

  connectedCallback(): void {
    super.connectedCallback()
    ;(window as Window & { __SIMPLE_MEMORY_BATTLE_APP__?: MemoryBattleBackHandler }).__SIMPLE_MEMORY_BATTLE_APP__ = {
      onSystemBack: () => this.handleSystemBack()
    }
    // この殻は memorymonsters 側で START 後（route='game'）に初めてマウントされる＝
    // 「メニューからゲーム画面へ変わった直後」。よって未非表示なら、ここでルール説明を重ねる
    // （元 app-flux の HIGH&LOW と同じく、ゲーム画面に変わってから説明）。
    void loadMemoryAppConfig().then((c) => { this.memoryConfig = c }).catch(() => undefined)
    if (localStorage.getItem(RULES_HIDDEN_KEY) !== 'true') {
      this.rulesDontShow = false
      this.showRules = true
    }
  }

  disconnectedCallback(): void {
    const runtimeWindow = window as Window & { __SIMPLE_MEMORY_BATTLE_APP__?: MemoryBattleBackHandler }
    delete runtimeWindow.__SIMPLE_MEMORY_BATTLE_APP__
    super.disconnectedCallback()
  }

  private goHome(): void {
    this.dispatchEvent(
      new CustomEvent('go-home', {
        bubbles: true,
        composed: true
      })
    )
  }

  private handleSystemBack(): boolean {
    // ルール説明が開いていれば、まずそれを閉じる（他ゲームと同挙動）。
    if (this.showRules) { this.showRules = false; return true }
    const table = this.renderRoot.querySelector('memory-battle-game-table') as
      | (HTMLElement & { handleSystemBack?: () => boolean })
      | null
    if (table?.handleSystemBack) {
      return table.handleSystemBack()
    }
    return false
  }

  private get language(): AppLanguage {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return saved === 'ja' || saved === 'zh' || saved === 'en' ? saved : 'en'
  }

  // 開始説明（rules_text）は設定 game.rules_text（= base MD の Quick Start 由来）から取得。
  private get rulesText(): string {
    const game = getMemoryAppLanguage(this.memoryConfig, this.language)?.game
    const fromConfig = getLocalizedString(game, 'rules_text')
    if (fromConfig.length > 0) return fromConfig
    const fb: Record<AppLanguage, string> = {
      en: 'How to play will be shown here.',
      ja: 'ここに遊び方のメッセージが入ります。',
      zh: '这里将显示玩法说明。'
    }
    return fb[this.language] ?? fb.en
  }

  private get rulesDontShowLabel(): string {
    const game = getMemoryAppLanguage(this.memoryConfig, this.language)?.game
    const fromConfig = getLocalizedString(game, 'rules_dont_show')
    if (fromConfig.length > 0) return fromConfig
    const fb: Record<AppLanguage, string> = {
      en: "Don't show again",
      ja: '次回から表示しない',
      zh: '下次不再显示'
    }
    return fb[this.language] ?? fb.en
  }

  // ルール説明 OK：チェックされていれば次回以降非表示にして閉じる。
  private confirmRules(): void {
    if (this.rulesDontShow) localStorage.setItem(RULES_HIDDEN_KEY, 'true')
    this.showRules = false
  }

  render() {
    const ok = getSharedChromeText(this.language).ok
    return html`
      <main class="app-shell">
        <memory-battle-game-table @go-home=${this.goHome}></memory-battle-game-table>
      </main>
      ${this.showRules
        ? html`
            <div class="rules-overlay">
              <section class="rules-card">
                <p class="rules-text">${this.rulesText}</p>
                <button class="rules-ok" @click=${() => this.confirmRules()}>${ok}</button>
                <label class="rules-dont">
                  <input
                    type="checkbox"
                    .checked=${this.rulesDontShow}
                    @change=${(e: Event) => { this.rulesDontShow = (e.target as HTMLInputElement).checked }}
                  />
                  <span>${this.rulesDontShowLabel}</span>
                </label>
              </section>
            </div>
          `
        : null}
    `
  }

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }

    .app-shell {
      width: 100%;
      height: 100%;
      display: block;
      overflow: hidden;
    }

    /* ルール説明（チュートリアル）。high-low と同一の見た目・挙動の自己完結版。 */
    .rules-overlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(5, 10, 11, 0.8);
    }
    .rules-card {
      width: min(100%, 460px);
      box-sizing: border-box;
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 14px;
      background: rgba(10, 23, 25, 0.98);
    }
    .rules-text {
      margin: 0;
      white-space: pre-line;
      text-align: left;
      font-size: 17px;
      line-height: 1.6;
      font-weight: 600;
      color: #eef4f5;
      max-height: 60vh;
      overflow-y: auto;
    }
    .rules-ok {
      min-height: 64px;
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      background: linear-gradient(180deg, #a06a34, #5e3818);
      color: #eafff8;
      font-family: inherit;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .rules-dont {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      color: rgba(238, 244, 245, 0.85);
    }
    .rules-dont input {
      width: 22px;
      height: 22px;
      accent-color: #a06a34;
      cursor: pointer;
    }
  `
}
