import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

export interface BreadcrumbItem {
  label: string
  href?: string
}

// パンくず。app-flux Breadcrumb.astro の構造/見た目を踏襲（区切りは "/"）。
@customElement('ccg-breadcrumb')
export class CcgBreadcrumb extends LitElement {
  @property({ attribute: false }) items: BreadcrumbItem[] = []

  static styles = css`
    nav {
      margin: 0 0 16px;
    }
    ol {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.85rem;
    }
    li {
      display: flex;
      align-items: center;
    }
    .sep {
      margin: 0 8px;
      color: var(--gold-deep);
    }
    a {
      color: var(--green-accent);
      text-decoration: none;
      transition: color 0.15s ease;
    }
    a:hover {
      text-decoration: underline;
    }
    .current {
      color: var(--text);
    }
  `

  render() {
    return html`
      <nav aria-label="Breadcrumb">
        <ol>
          ${this.items.map(
            (item, i) => html`
              <li>
                ${i > 0 ? html`<span class="sep">/</span>` : null}
                ${item.href
                  ? html`<a href=${item.href}>${item.label}</a>`
                  : html`<span class="current">${item.label}</span>`}
              </li>
            `,
          )}
        </ol>
      </nav>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ccg-breadcrumb': CcgBreadcrumb
  }
}
