import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('common-footer')
export class CommonFooter extends LitElement {
  @property({ type: String })
  text = '© 2026 Casino Platform'

  render() {
    return html`<footer>${this.text}</footer>`
  }

  static styles = css`
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0.8%;
      z-index: 40;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }

    footer {
      color: rgba(222, 238, 244, 0.78);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }
  `
}
