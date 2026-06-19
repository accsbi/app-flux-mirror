import { LitElement, css, html, nothing } from 'lit'
import { classicBlueButtonStyles } from '../classic-button.styles'
import { customElement, property, state } from 'lit/decorators.js'
import { FeedbackService } from '../../infra/feedback-service'

// 全ゲーム共通のフィードバック部品（単一ソース）。
// フッターの Feedback ボタンから open() で開く。Formspree 直 POST。
// ダイアログ・スタイル・送信ロジックを内包し、Web/Android 両方の src ビルドに同一で乗る。
// ゲーム側は <game-footer-bar showFeedback @footer-feedback> でこの open() を呼ぶだけ。
//
// 発火イベント（ゲーム側は任意で購読）:
//   feedback-open    : 入力ダイアログを開いた（自動演出の一時停止などに使う）
//   feedback-close   : ダイアログを完全に閉じた（再開に使う）
//   feedback-interact: ボタン操作のたび（効果音の再生などに使う）
@customElement('game-feedback')
export class GameFeedback extends LitElement {
  // Formspree エンドポイント（既定は memory と同一。ゲームで上書き可）
  @property({ type: String })
  endpoint = 'https://formspree.io/f/xwpopnan'

  // 送信に含めるゲーム識別子（Formspree 側でゲームを区別する）
  @property({ type: String })
  gameTitle = 'playing-cards'

  @property({ type: String })
  lang: 'en' | 'ja' | 'zh' = 'en'

  // ラベル（既定は英語。各ゲームの i18n から差し替え可）
  @property({ type: String }) titleLabel = 'Feedback'
  @property({ type: String }) placeholder = 'Please enter your feedback'
  @property({ type: String }) okLabel = 'Send'
  @property({ type: String }) cancelLabel = 'Cancel'
  @property({ type: String }) validationMin = 'Please enter at least 10 characters.'
  @property({ type: String }) submitFailed = 'Failed to send feedback. Please try again.'
  @property({ type: String }) submitSuccess = 'Thank you for your feedback.'
  @property({ type: String }) resultOkLabel = 'OK'

  @state() private isDialogOpen = false
  @state() private isResultOpen = false
  @state() private isSubmitting = false
  @state() private message = ''
  @state() private errorMessage = ''
  @state() private resultMessage = ''
  // ハニーポット（render の度に拾うので @state 不要）
  private gotcha = ''

  // フッターの Feedback ボタンから呼ぶ公開メソッド
  public open(): void {
    this.message = ''
    this.errorMessage = ''
    this.gotcha = ''
    this.isSubmitting = false
    this.isDialogOpen = true
    this.emit('feedback-open')
  }

  private emit(type: 'feedback-open' | 'feedback-close' | 'feedback-interact'): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }))
  }

  private closeDialog(): void {
    if (this.isSubmitting) return
    this.emit('feedback-interact')
    this.isDialogOpen = false
    this.message = ''
    this.errorMessage = ''
    this.emit('feedback-close')
  }

  private onInput(event: Event): void {
    this.message = (event.target as HTMLTextAreaElement).value
    if (this.errorMessage.length > 0) this.errorMessage = ''
  }

  private async submit(): Promise<void> {
    if (this.isSubmitting) return
    this.emit('feedback-interact')
    const message = this.message.trim()
    if (message.length < 10) {
      this.errorMessage = this.validationMin
      return
    }
    // ハニーポットが埋まっていれば（＝ボット）、送信せず成功扱いで黙って弾く。
    if (this.gotcha.trim().length > 0) {
      this.showResult()
      return
    }
    this.isSubmitting = true
    this.errorMessage = ''
    try {
      const service = new FeedbackService(this.endpoint)
      const response = await service.submit({
        message,
        game_title: this.gameTitle,
        lang: this.lang,
        gotcha: this.gotcha
      })
      if (!response.ok) {
        this.errorMessage = this.submitFailed
        return
      }
      this.showResult()
    } catch {
      this.errorMessage = this.submitFailed
    } finally {
      this.isSubmitting = false
    }
  }

  private showResult(): void {
    this.isDialogOpen = false
    this.message = ''
    this.resultMessage = this.submitSuccess
    this.isResultOpen = true
  }

  private closeResult(): void {
    this.emit('feedback-interact')
    this.isResultOpen = false
    this.resultMessage = ''
    this.emit('feedback-close')
  }

  render() {
    if (!this.isDialogOpen && !this.isResultOpen) return nothing
    if (this.isResultOpen) {
      return html`
        <section class="feedback-overlay">
          <div class="modal feedback-modal">
            <p class="feedback-result">${this.resultMessage}</p>
            <button class="dialog-btn primary single-action classic-btn-blue" @click=${this.closeResult}>${this.resultOkLabel}</button>
          </div>
        </section>
      `
    }
    return html`
      <section class="feedback-overlay">
        <div class="modal feedback-modal">
          <h3>${this.titleLabel}</h3>
          <textarea
            class="feedback-input"
            placeholder=${this.placeholder}
            .value=${this.message}
            ?disabled=${this.isSubmitting}
            @input=${this.onInput}
          ></textarea>
          <input
            class="feedback-gotcha"
            type="text"
            name="_gotcha"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            .value=${this.gotcha}
            @input=${(e: Event) => { this.gotcha = (e.target as HTMLInputElement).value }}
          />
          ${this.errorMessage.length > 0
            ? html`<p class="feedback-error">${this.errorMessage}</p>`
            : nothing}
          <div class="feedback-actions">
            <button
              class="dialog-btn classic-btn-blue"
              ?disabled=${this.isSubmitting}
              @click=${this.closeDialog}
            >${this.cancelLabel}</button>
            <button
              class="dialog-btn primary classic-btn-blue"
              ?disabled=${this.isSubmitting}
              @click=${this.submit}
            >${this.okLabel}</button>
          </div>
        </div>
      </section>
    `
  }

  static styles = [css`
    /* このホスト自身はレイアウトボックスを生成しない。ゲーム盤面の flex/grid に
       「空の要素＋gap」が割り込んで本文(ステータス文言やカード列)を潰すのを防ぐ。
       ダイアログを開いたときの .feedback-overlay は position:fixed なので影響なし。 */
    :host {
      display: contents;
    }

    /* フィードバックはステージの scale 外に出した固定オーバーレイ。
       キーボードで visualViewport が縮んでも文字サイズは実 px のまま縮まない。
       上寄せでキーボードに隠れにくくする。 */
    .feedback-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: clamp(12px, 5vh, 48px) 14px 14px;
      background: rgba(5, 10, 11, 0.78);
      z-index: 1000;
      overflow-y: auto;
    }

    .modal {
      width: min(100%, 680px);
      max-height: calc(100% - 24px);
      overflow: auto;
      background: rgba(10, 23, 25, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 18px;
      padding: 14px;
      box-sizing: border-box;
    }

    .dialog-btn {
      min-height: 64px;
      border-radius: 999px;
      border: 0;
      font-family: inherit;
      font-size: 18px;
      font-weight: 800;
      cursor: pointer;
    }

    /* Web版（タブレット以上）では少し小さめでOK */
    @media (min-width: 768px) {
      .dialog-btn {
        min-height: 56px;
      }
    }

    /* primary の色は classic-btn-blue（青系クラシック）に委ねる＝ここで background/color を指定しない。 */

    .dialog-btn:disabled {
      opacity: 0.56;
      cursor: default;
    }

    .single-action {
      width: 100%;
    }

    .feedback-modal {
      display: grid;
      gap: 10px;
    }

    .feedback-modal h3 {
      margin: 0;
      font-size: 32px;
      line-height: 1.2;
      color: #f4fbff;
    }

    .feedback-input {
      width: 100%;
      min-height: 144px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(6, 14, 16, 0.72);
      color: #f4fbff;
      /* textarea は UA 既定が monospace。アプリ共通フォント＋設定相当サイズに統一。 */
      font-family: inherit;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.45;
      padding: 12px;
      box-sizing: border-box;
      outline: none;
      resize: vertical;
    }

    .feedback-error,
    .feedback-result {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
      white-space: pre-line;
      color: #f2f6f7;
    }

    .feedback-error {
      color: #ffb4b4;
    }

    .feedback-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    /* ハニーポット：人間には見えない。ボットだけが埋める想定 */
    .feedback-gotcha {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  `, classicBlueButtonStyles]
}

declare global {
  interface HTMLElementTagNameMap {
    'game-feedback': GameFeedback
  }
}
