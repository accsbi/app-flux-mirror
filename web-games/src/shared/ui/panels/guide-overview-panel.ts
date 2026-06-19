import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classicButtonStyles } from '../classic-button.styles'

@customElement('guide-overview-panel')
export class GuideOverviewPanel extends LitElement {
  @property({ type: String }) title = ''
  @property({ type: Array }) lines: string[] = []
  @property({ type: String }) imageSrc = ''
  @property({ type: String }) imageAlt = ''
  @property({ type: String }) okLabel = ''

  private close(): void {
    this.dispatchEvent(new CustomEvent('guide-close', { bubbles: true, composed: true }))
  }

  private isExternalUrlLine(line: string): boolean {
    return /^https?:\/\/\S+$/i.test(line.trim())
  }

  // 行内の markdown リンク [text](url) を <a> に変換し、その他はテキストとして返す。
  private renderInline(text: string): unknown[] {
    const parts: unknown[] = []
    const re = /\[([^\]]+)\]\(([^)]+)\)/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      parts.push(html`<a class="external-link" href=${m[2].trim()} target="_blank" rel="noopener noreferrer">${m[1]}</a>`)
      last = m.index + m[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length ? parts : [text]
  }

  // 1 行を見出し/箇条書き/番号/リンク/段落に振り分けて整形表示する。
  // markdown(#, ##, -, *, [text](url)) と日本語箇条書き(・)・番号(1.)を軽量に解釈（marked 不要）。
  private renderLine(raw: string) {
    const line = raw.trimEnd()
    if (line.trim().length === 0) {
      return html`<div class="guide-spacer" aria-hidden="true"></div>`
    }
    const t = line.trim()

    const heading = /^(#{1,6})\s+(.*)$/.exec(t)
    if (heading) {
      const level = Math.min(heading[1].length, 4)
      return html`<p class="gh gh${level}">${this.renderInline(heading[2])}</p>`
    }
    const bullet = /^[-*・]\s*(.*)$/.exec(t)
    if (bullet) {
      return html`<p class="gli"><span class="gmark">•</span><span>${this.renderInline(bullet[1])}</span></p>`
    }
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(t)
    if (numbered) {
      return html`<p class="gli"><span class="gmark gnum">${numbered[1]}.</span><span>${this.renderInline(numbered[2])}</span></p>`
    }
    if (this.isExternalUrlLine(line)) {
      return html`<p><a class="external-link" href=${t} target="_blank" rel="noopener noreferrer">${line}</a></p>`
    }
    return html`<p>${this.renderInline(line)}</p>`
  }

  render() {
    const hasImage = this.imageSrc.trim().length > 0

    return html`
      <button class="top-close-btn classic-btn" @click=${this.close} aria-label="Close">✕</button>
      <h3>${this.title}</h3>
      ${hasImage
        ? html`<img class="guide-image" src=${this.imageSrc} alt=${this.imageAlt || this.title} loading="lazy" />`
        : html`<div class="guide-body">${this.lines.map((line) => this.renderLine(line))}</div>`}
      <button class="ok-btn classic-btn" @click=${this.close}>${this.okLabel}</button>
    `
  }

  static styles = [css`
    :host {
      display: grid;
      gap: 8px;
      font-size: var(--panel-font-size, 24px);
      line-height: 1.4;
      color: #f2f6f7;
      position: relative;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: var(--panel-title-size, 32px);
      padding-right: 44px; /* 右上 X ボタンと被らないように */
    }

    /* 右上の閉じる X（広告削除ダイアログと同じ体裁・ガイドからも戻れるように） */
    .top-close-btn {
      position: absolute;
      right: 0;
      top: 0;
      min-width: 44px;
      min-height: 44px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(0, 0, 0, 0.35);
      color: #f2f6f7;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      z-index: 2;
    }

    /* 本文：行ごとに見出し/箇条書き/段落を整える（ASTRO ほどではないが体裁を整える） */
    .guide-body {
      display: grid;
      gap: 6px;
      text-align: left;
    }

    /* 見出し（# → 大、## → 中、### 以下 → 小）。本文と明確に差をつける。 */
    .gh {
      font-weight: 800;
      color: #bdeee6;
      line-height: 1.3;
      margin-top: 14px;
    }
    .gh1 { font-size: 1.12em; }
    .gh2 { font-size: 1.04em; }
    .gh3,
    .gh4 { font-size: 0.98em; color: #9fd9cf; }
    /* 先頭の見出しは上余白を詰める */
    .guide-body > .gh:first-child { margin-top: 0; }

    /* 箇条書き / 番号：マーカーをぶら下げて読みやすく */
    .gli {
      display: grid;
      grid-template-columns: 1.4em 1fr;
      column-gap: 4px;
      align-items: start;
    }
    .gmark {
      color: #6fd6c4;
      text-align: left;
    }
    .gnum { font-variant-numeric: tabular-nums; }

    .ok-btn {
      min-height: var(--panel-btn-height, 72px);
      margin-top: 16px; /* 最後の本文との隙間を少し空ける */
      border-radius: 999px;
      border: 0;
      background: #6f4a2e;
      color: #1a1a1a;
      font-size: var(--panel-font-size, 24px);
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
    }

    .guide-image {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 8px;
    }

    .external-link {
      color: #6ee7ff;
      text-decoration: underline;
      word-break: break-all;
    }

    .guide-spacer {
      min-height: 12px;
    }
  `, classicButtonStyles]
}
