import { html, type TemplateResult } from 'lit'
import type { AppLanguage } from '../../config/app-config'
import { getSharedChromeText } from '../../config/shared-chrome-text'
import './settings-panel'

// 設定モーダルの「唯一の描画元（single source）」。
// 全カードゲーム(hub / high-low / memorymonsters / 3in1 standalone)はこの関数で設定画面を描く。
// 各ゲームが <settings-panel> を個別に呼び出してプロップをコピペすると、ラベル・サウンドヘルプの
// 有無・タイトルなどがズレてレイアウトがバラバラになる。ここに集約してズレを構造的に防ぐ。
// 文言は shared-chrome-text（単一ソース）、枠とフォントは standalone-app.styles の .modal-shell/.modal-card。
export interface SettingsModalOptions {
  language: AppLanguage
  effectEnabled: boolean
  bgmEnabled: boolean
  /** 初回設定モード（タイトルを「初期設定」にし、キャッシュクリアを隠す） */
  isInitialSetup?: boolean
  /** キャッシュクリア行の表示可否。未指定なら「初回設定でなければ表示」。
   *  ゲーム中の設定は false を渡す（メニューと違ってよいのはキャッシュクリアの有無だけ）。 */
  showClearCache?: boolean
  soundHelpOpen: boolean
  onClose: () => void
  onEffectChange: (enabled: boolean) => void
  onBgmChange: (enabled: boolean) => void
  onLanguageChange: (language: AppLanguage) => void
  onClearCache?: () => void
  onOpenSoundHelp: () => void
  onCloseSoundHelp: () => void
}

// 設定画面「中身」(settings-panel) の唯一の描画元。文言・サウンドヘルプ(?)・トグルはここだけ。
// 枠は呼び出し側（メニュー= .modal-shell/.modal-card / ゲーム中= .overlay/.modal）。
// これを介さず <settings-panel> を直書きすると「?」が欠けたり文言がズレる（=今までの不具合）。
export function renderSettingsPanel(options: SettingsModalOptions): TemplateResult {
  const c = getSharedChromeText(options.language)
  const showClearCache = options.showClearCache ?? !options.isInitialSetup
  return html`
    <settings-panel
      .effectEnabled=${options.effectEnabled}
      .bgmEnabled=${options.bgmEnabled}
      .language=${options.language}
      .title=${options.isInitialSetup ? c.initialSetupTitle : c.settings}
      .languageLabel=${c.settingsLanguage}
      .effectLabel=${c.settingsEffect}
      .bgmLabel=${c.settingsBgm}
      .helpLabel=${'?'}
      .showSoundHelp=${true}
      .soundHelpOpen=${options.soundHelpOpen}
      .soundHelpTitle=${c.soundHelpTitle}
      .soundHelpMessage=${c.soundHelpMessage}
      .soundHelpOkLabel=${c.ok}
      .clearStatsLabel=${''}
      .clearCacheLabel=${c.settingsClearCache}
      .showClearCache=${showClearCache}
      .okLabel=${c.ok}
      @settings-close=${options.onClose}
      @settings-effect-change=${(e: CustomEvent<{ enabled: boolean }>) => options.onEffectChange(e.detail.enabled)}
      @settings-bgm-change=${(e: CustomEvent<{ enabled: boolean }>) => options.onBgmChange(e.detail.enabled)}
      @settings-language-change=${(e: CustomEvent<{ language: AppLanguage }>) => options.onLanguageChange(e.detail.language)}
      @settings-clear-cache=${() => options.onClearCache?.()}
      @settings-open-sound-help=${options.onOpenSoundHelp}
      @settings-close-sound-help=${options.onCloseSoundHelp}
    ></settings-panel>
  `
}

export function renderSettingsModal(options: SettingsModalOptions): TemplateResult {
  return html`
    <main class="modal-shell">
      <section class="modal-card">
        ${renderSettingsPanel(options)}
      </section>
    </main>
  `
}
