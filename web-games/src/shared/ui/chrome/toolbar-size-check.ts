import type { LitElement } from 'lit'

function getFirstToolbarButton(host: Element | null): HTMLButtonElement | null {
  const root = (host as HTMLElement | null)?.shadowRoot
  if (!root) {
    return null
  }
  return root.querySelector('.toolbar-btn')
}

export function runToolbarSizeCheck(host: LitElement, tag: string): void {
  const header = host.renderRoot.querySelector('game-top-header')
  const footer = host.renderRoot.querySelector('game-footer-bar')
  const headerBtn = getFirstToolbarButton(header)
  const footerBtn = getFirstToolbarButton(footer)
  if (!headerBtn || !footerBtn) {
    return
  }

  const hRect = headerBtn.getBoundingClientRect()
  const fRect = footerBtn.getBoundingClientRect()
  const hStyle = window.getComputedStyle(headerBtn)
  const fStyle = window.getComputedStyle(footerBtn)
  const widthDiff = Math.abs(hRect.width - fRect.width)
  const heightDiff = Math.abs(hRect.height - fRect.height)
  const fontDiff = Math.abs(parseFloat(hStyle.fontSize) - parseFloat(fStyle.fontSize))
  const same = widthDiff < 0.5 && heightDiff < 0.5 && fontDiff < 0.1

  if (!same) {
    console.error(`[ToolbarSizeMismatch:${tag}]`, {
      header: { width: hRect.width, height: hRect.height, fontSize: hStyle.fontSize },
      footer: { width: fRect.width, height: fRect.height, fontSize: fStyle.fontSize }
    })
    return
  }
  console.info(`[ToolbarSizeOK:${tag}]`, {
    width: hRect.width,
    height: hRect.height,
    fontSize: hStyle.fontSize
  })
}

