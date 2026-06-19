import type { LitElement } from 'lit'

export const STAGE_WIDTH = 540
export const STAGE_HEIGHT = 960

type StageScaleOptions = {
  preferLayoutViewport?: boolean
}

export function applyStageScale(host: LitElement, options: StageScaleOptions = {}): void {
  const preferLayoutViewport = options.preferLayoutViewport === true
  const viewportWidth = preferLayoutViewport
    ? window.innerWidth
    : window.visualViewport?.width ?? window.innerWidth
  const viewportHeight = preferLayoutViewport
    ? window.innerHeight
    : window.visualViewport?.height ?? window.innerHeight
  const bodyStyles = getComputedStyle(document.body)
  const insetTop = Number.parseFloat(bodyStyles.paddingTop) || 0
  const insetRight = Number.parseFloat(bodyStyles.paddingRight) || 0
  const insetBottom = Number.parseFloat(bodyStyles.paddingBottom) || 0
  const insetLeft = Number.parseFloat(bodyStyles.paddingLeft) || 0
  const availableWidth = Math.max(0, viewportWidth - insetLeft - insetRight)
  const availableHeight = Math.max(0, viewportHeight - insetTop - insetBottom)

  const isSmartphone = viewportWidth < 768
  const fitMargin = isSmartphone ? 0 : 8

  const widthScale = Math.max(0, availableWidth - fitMargin) / STAGE_WIDTH
  const heightScale = Math.max(0, availableHeight - fitMargin) / STAGE_HEIGHT
  const scale = isSmartphone ? Math.min(widthScale, heightScale) : Math.min(widthScale, heightScale, 2.2)

  const offsetX = (insetLeft - insetRight) / 2
  const offsetY = (insetTop - insetBottom) / 2
  const stageVisibleWidth = STAGE_WIDTH * scale
  const stageOffsetLeft = insetLeft + Math.max(0, (availableWidth - stageVisibleWidth) / 2)
  const stageOffsetTop = insetTop
  const stageLogicalHeight = scale > 0 ? Math.ceil(availableHeight / scale) : STAGE_HEIGHT

  host.style.setProperty('--game-scale', String(scale))
  host.style.setProperty('--safe-offset-x', `${offsetX}px`)
  host.style.setProperty('--safe-offset-y', `${offsetY}px`)
  host.style.setProperty('--viewport-width', `${viewportWidth}px`)
  host.style.setProperty('--viewport-height', `${viewportHeight}px`)
  host.style.setProperty('--stage-visible-width', `${stageVisibleWidth}px`)
  host.style.setProperty('--stage-visible-height', `${availableHeight}px`)
  host.style.setProperty('--stage-offset-left', `${stageOffsetLeft}px`)
  host.style.setProperty('--stage-offset-top', `${stageOffsetTop}px`)
  host.style.setProperty('--stage-logical-height', `${stageLogicalHeight}px`)
  host.style.setProperty('--stage-height-ratio', String(stageLogicalHeight / STAGE_HEIGHT))
}
