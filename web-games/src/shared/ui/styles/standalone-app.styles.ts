import { css } from 'lit'
import { STAGE_HEIGHT, STAGE_WIDTH } from './stage-layout'
import { appFontFamily } from './fonts'

export const standaloneAppHostStyles = css`
  :host {
    display: block;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #101518;
  }
`

export const standaloneModalStyles = css`
  .shell,
  .app-shell,
  .menu-shell,
  .modal-shell {
    width: 100%;
    height: 100%;
  }

  .menu-shell {
    position: relative;
    overflow: hidden;
  }

  /* 設定/ガイド/ルール等のモーダルは「ゲーム内設定」と完全一致させる（唯一の正）:
     540 論理ステージを --game-scale で縮小した中に、sharedOverlayStyles(.modal) と
     同じ 680px/padding14/radius18 で描画する。各 standalone app が applyStageScale() で
     --game-scale 等をセットしている前提（メニュー画面でも設定が必要）。
     幅やパネル寸法はここ＋ settings-panel 既定値が唯一の正。個別 clamp 上書きはしない。 */
  .modal-shell {
    position: absolute;
    left: 0;
    top: 0;
    right: auto;
    bottom: auto;
    width: ${STAGE_WIDTH}px;
    height: var(--stage-logical-height, ${STAGE_HEIGHT}px);
    transform: translate(var(--stage-offset-left, 0px), var(--stage-offset-top, 0px))
      scale(var(--game-scale, 1));
    transform-origin: top left;
    display: grid;
    place-items: center;
    padding: 12px;
    box-sizing: border-box;
    background: rgba(5, 10, 11, 0.78);
    z-index: 8;
  }

  .modal-card {
    width: min(100%, 680px);
    max-height: calc(100% - 24px);
    overflow-y: auto;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(10, 23, 25, 0.98);
    color: #f2f6f7;
    /* モーダル内の全パネル(設定/ガイド/確認/広告削除/通知)のフォントを単一ソースで統一。
       ホストのフォント差に依存させない（shadow を跨いで継承させる）。 */
    font-family: ${appFontFamily};
    padding: 14px;
    box-sizing: border-box;
    display: grid;
    gap: 8px;
    text-align: left;
  }
`
