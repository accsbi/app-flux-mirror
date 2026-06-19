import { css } from 'lit'
import { STAGE_HEIGHT, STAGE_WIDTH } from './stage-layout'
import { appFontFamily } from './fonts'

export const sharedGameHostStyles = css`
  :host {
    --game-scale: 1;
    --safe-offset-x: 0px;
    --safe-offset-y: 0px;
    --stage-offset-left: 0px;
    --stage-offset-top: 0px;
    display: block;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    font-family: ${appFontFamily};
    color: #f2f6f7;
  }
`

export const sharedGameStageStyles = css`
  .screen-bg {
    position: relative;
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    isolation: isolate;
    background: linear-gradient(90deg, #060a0b 0%, #122126 25%, #122126 75%, #060a0b 100%);
  }

  .stage {
    box-sizing: border-box;
    position: absolute;
    left: 0;
    top: 0;
    width: ${STAGE_WIDTH}px;
    height: var(--stage-logical-height, ${STAGE_HEIGHT}px);
    transform: translate(var(--stage-offset-left), var(--stage-offset-top)) scale(var(--game-scale));
    transform-origin: top left;
    background: #163138;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: hidden;
    contain: layout paint;
  }
`
