import { html } from 'lit'
import { formatTemplate, isPlayerAutoModeEnabled, PRACTICE_CARD_COUNT_OPTIONS } from './memory-battle-game-table.helpers'
import { coinIcon } from '../../shared/ui/icons/coin-icon'
import '../../shared/ui/chrome/game-top-header'

type MemoryBattleRenderHost = {
  [key: string]: any
}

export function renderMemoryBattleHeader(host: MemoryBattleRenderHost) {
  const t = host.texts()
  // 他カードゲームと同じ共通ヘッダー(game-top-header)に統一。文字サイズ・体裁は共通の単一ソース。
  return html`
    <game-top-header
      .homeLabel=${t.home}
      .settingsLabel=${t.settings}
      .guideLabel=${t.guide}
      @header-home=${() => host.requestGoHome()}
      @header-settings=${() => host.openSettings()}
      @header-guide=${() => host.openGuide()}
    ></game-top-header>
  `
}

export function renderMemoryBattleStatus(host: MemoryBattleRenderHost) {
  const showEnemyStatus = host.shouldShowEnemyStatus()
  // 「COIN / BET / STAGE」を共有 .bet-status（他ゲームと統一）で1行表示。
  // BET / STAGE は BET 確定後の対戦中だけ出す（shouldShowEnemyStatus）。それ以外は COIN のみ。
  const stage = host.currentEnemy().stage

  return html`
    <section class="status-strip ${showEnemyStatus ? '' : 'is-coin-only'}">
      <header class="bet-status">
        ${coinIcon()} COIN ${host.coin}${showEnemyStatus ? html` / BET ${host.currentBet} / STAGE ${stage}` : ''}
      </header>
    </section>
  `
}

export function renderMemoryBattleScreen(host: MemoryBattleRenderHost) {
  switch (host.screen) {
    case 'practice-setup':
      return renderPracticeSetup(host)
    case 'enemy-intro':
      return renderEnemyIntro(host)
    case 'draw-battle':
      return renderDrawBattle(host)
    case 'turn-select':
      return renderTurnSelect(host)
    case 'battle':
      return renderBattle(host)
    case 'result-win':
      return renderWin(host)
    case 'result-lose':
      return renderLose(host)
    case 'result-draw':
      return renderDraw(host)
    case 'result-practice':
      return renderPracticeResult(host)
    case 'title':
    default:
      return renderTitleScreen(host)
  }
}

function renderTitleScreen(host: MemoryBattleRenderHost) {
  const t = host.texts()
  return html`
    <section class="content-card center-card">
      <h1>${t.title}</h1>
      <h2>${t.stageSelectTitle}</h2>
      <div class="stage-select-grid">
        <button class="stage-select-btn stage-select-btn--practice is-unlocked" @click=${host.openPracticeSetup}>
          <div class="stage-select-main stage-select-main--practice">
            <div class="stage-select-copy">
              <span class="stage-select-label">${t.practiceStageButton}</span>
            </div>
          </div>
        </button>
        ${host.allStageNumbers().map((stage: number) => {
          const isUnlocked = host.isStageUnlocked(stage)
          const isCleared = host.isStageCleared(stage)
          const enemyImagePath = isUnlocked ? host.stageEnemyImagePath(stage) : host.assetUrl(host.memoryAsset('locked_stage_thumb'))
          const enemyName = isUnlocked ? host.stageEnemyName(stage) : 'locked stage'
          return html`
            <button
              class="stage-select-btn ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${isCleared ? 'is-cleared' : ''}"
              ?disabled=${!isUnlocked}
              @click=${() => host.requestStageStart(stage)}
            >
              <div class="stage-select-main">
                <div class="stage-select-copy">
                  <span class="stage-select-label">${formatTemplate(t.stageLabel, { stage })}</span>
                  <span class="stage-select-enemy-name">${isUnlocked ? enemyName : '???'}</span>
                  ${isCleared
                    ? html`<span class="stage-clear-badge">${t.stageClearedLabel}</span>`
                    : html`<span class="stage-select-placeholder" aria-hidden="true"></span>`}
                </div>
                ${enemyImagePath ? html`<img class="stage-select-thumb ${isUnlocked ? '' : 'is-locked-thumb'}" src=${enemyImagePath} alt=${enemyName} />` : null}
              </div>
            </button>
          `
        })}
      </div>
    </section>
  `
}

function renderPracticeSetup(host: MemoryBattleRenderHost) {
  const t = host.texts()
  return html`
    <section class="content-card center-card">
      <h2>${t.practiceSetupTitle}</h2>
      <p>${t.practiceSetupMessage}</p>
      <p class="practice-coin-note">${t.practiceCoinNote}</p>
      <label class="practice-select-block">
        <span class="practice-select-label">${t.practiceCardCountLabel}</span>
        <select class="practice-select" @change=${host.updatePracticeCardCount}>
          ${PRACTICE_CARD_COUNT_OPTIONS.map(
            (count) => html`<option value=${String(count)} ?selected=${count === host.practiceCardCount}>${host.practiceCardOptionLabel(count)}</option>`
          )}
        </select>
      </label>
      <div class="stack-actions">
        <button class="primary-btn" @click=${host.startPracticeMode}>${t.practiceStartButton}</button>
        <button class="secondary-btn" @click=${host.returnToStageSelect}>${t.returnToStageSelect}</button>
      </div>
    </section>
  `
}

// ゲーム中に敵画像をタップしたときに、画面遷移せず「ふわっと」重ねて出す敵情報。
// 内容は enemy-intro（スタートバトル前）と同じ。✕/背景タップでカード表示へ戻る。
export function renderEnemyInfoOverlay(host: MemoryBattleRenderHost) {
  const t = host.texts()
  const enemy = host.currentEnemy()
  const enemyName = host.currentEnemyName()
  const enemyProfile = host.currentEnemyProfile()
  const enemyImagePath = host.currentEnemyImagePath()
  return html`
    <div class="enemy-info-overlay" @click=${() => host.closeEnemyInfo()}>
      <section class="content-card center-card enemy-info-card" @click=${(e: Event) => e.stopPropagation()}>
        <button class="enemy-info-close" @click=${() => host.closeEnemyInfo()} aria-label="close">✕</button>
        <h2>${formatTemplate(t.enemyIntroTitle, { stage: enemy.stage })}</h2>
        ${enemyImagePath
          ? html`<div class="enemy-portrait-wrap"><img class="enemy-portrait" src=${enemyImagePath} alt=${enemyName} /></div>`
          : null}
        <p class="enemy-name">${enemyName}</p>
        <div class="enemy-profile-block"><p class="enemy-profile">${enemyProfile}</p></div>
        <p>${formatTemplate(t.enemyReward, { mult: host.betMultiplierLabel() })}</p>
      </section>
    </div>
  `
}

function renderEnemyIntro(host: MemoryBattleRenderHost) {
  const t = host.texts()
  const enemy = host.currentEnemy()
  const enemyName = host.currentEnemyName()
  const enemyProfile = host.currentEnemyProfile()
  const enemyImagePath = host.currentEnemyImagePath()
  return html`
    <section class="content-card center-card">
      <h2>${formatTemplate(t.enemyIntroTitle, { stage: enemy.stage })}</h2>
      ${enemyImagePath
        ? html`
            <div class="enemy-portrait-wrap">
              <img class="enemy-portrait" src=${enemyImagePath} alt=${enemyName} />
            </div>
          `
        : null}
      <p class="enemy-name">${enemyName}</p>
      <div class="enemy-profile-block">
        <p class="enemy-profile">${enemyProfile}</p>
      </div>
      <div class="enemy-reward-line">
        <span class="enemy-reward-value">${formatTemplate(t.enemyReward, { mult: host.betMultiplierLabel() })}</span>
        <button class="reward-help-btn" @click=${() => host.openRewardHelp()} aria-label="reward help">
          ${t.rewardHelpLabel} ⓘ
        </button>
      </div>
      <div class="stack-actions">
        <button class="primary-btn" @click=${() => host.openBetDialog()}>${t.startBattle}</button>
        <button class="secondary-btn" @click=${() => host.returnToStageSelect()}>${t.returnToStageSelect}</button>
      </div>
    </section>
  `
}

function renderDrawBattle(host: MemoryBattleRenderHost) {
  const t = host.texts()
  const hasSelectedDrawCard = Boolean(host.drawPlayerCard && host.drawCpuCard)
  const leftCardClass = host.drawBattleCardClass('left')
  const rightCardClass = host.drawBattleCardClass('right')
  const leftCard = host.drawBattleSlotCard('left')
  const rightCard = host.drawBattleSlotCard('right')
  return html`
    <section class="content-card decision-card draw-battle-card">
      <div class="decision-copy-block">
        <h2>${t.drawBattleTitle}</h2>
        <p>${t.drawBattleMessage}</p>
      </div>
      <div class="draw-battle-grid">
        <div class="draw-card-panel">
          <span class="draw-card-owner ${host.shouldShowDrawBattleOwnerLabels() ? '' : 'is-placeholder'}" aria-hidden=${host.shouldShowDrawBattleOwnerLabels() ? 'false' : 'true'}
            >${host.drawBattleOwnerLabel('left')}</span
          >
          <button class="draw-card-button ${leftCardClass}" ?disabled=${hasSelectedDrawCard || host.isBusy} @click=${() => host.chooseDrawCard('left')}>
            ${leftCard
              ? html`<img class="draw-card" src=${host.assetUrl(leftCard.imagePath)} alt=${leftCard.label} />`
              : html`<img class="draw-card" src=${host.assetUrl(host.memoryAsset('back_card'))} alt=${t.backCardAlt} />`}
          </button>
        </div>
        <div class="draw-card-panel">
          <span class="draw-card-owner ${host.shouldShowDrawBattleOwnerLabels() ? '' : 'is-placeholder'}" aria-hidden=${host.shouldShowDrawBattleOwnerLabels() ? 'false' : 'true'}
            >${host.drawBattleOwnerLabel('right')}</span
          >
          <button class="draw-card-button ${rightCardClass}" ?disabled=${hasSelectedDrawCard || host.isBusy} @click=${() => host.chooseDrawCard('right')}>
            ${rightCard
              ? html`<img class="draw-card" src=${host.assetUrl(rightCard.imagePath)} alt=${rightCard.label} />`
              : html`<img class="draw-card" src=${host.assetUrl(host.memoryAsset('back_card'))} alt=${t.backCardAlt} />`}
          </button>
        </div>
      </div>
      <div class="decision-status-block">
        ${host.statusMessage ? html`<p class="status-copy decision-status-copy">${host.statusMessage}</p>` : null}
      </div>
      <div class="decision-actions draw-battle-actions">
        ${host.drawResolution === 'player-choice'
          ? html`
              <div class="stack-actions">
                <button class="primary-btn" ?disabled=${host.isBusy} @click=${() => host.chooseTurn('player')}>${t.goFirst}</button>
                <button class="secondary-btn" ?disabled=${host.isBusy} @click=${() => host.chooseTurn('cpu')}>${t.goSecond}</button>
              </div>
            `
          : host.drawResolution === 'cpu-confirm'
            ? html`
                <div class="stack-actions">
                  <button class="primary-btn" ?disabled=${host.isBusy} @click=${host.confirmCpuOpeningTurn}>${t.ok}</button>
                </div>
              `
            : html`
                <div class="stack-actions is-reserved" aria-hidden="true">
                  <button class="primary-btn" tabindex="-1" disabled>placeholder</button>
                  <button class="secondary-btn" tabindex="-1" disabled>placeholder</button>
                </div>
              `}
      </div>
    </section>
  `
}

function renderTurnSelect(host: MemoryBattleRenderHost) {
  const t = host.texts()
  return html`
    <section class="content-card decision-card turn-select-card">
      <div class="decision-copy-block">
        <h2>${t.chooseTurnTitle}</h2>
        <p>${t.playerWonDraw}</p>
        <p>${t.chooseTurnMessage}</p>
      </div>
      <div class="decision-spacer" aria-hidden="true"></div>
      <div class="stack-actions decision-actions">
        <button class="primary-btn" @click=${() => host.chooseTurn('player')}>${t.goFirst}</button>
        <button class="secondary-btn" @click=${() => host.chooseTurn('cpu')}>${t.goSecond}</button>
      </div>
    </section>
  `
}

function renderBattle(host: MemoryBattleRenderHost) {
  const t = host.texts()
  const isPlayerTurn = host.currentTurn === 'player' && !host.isBusy
  const isCpuTurn = host.currentTurn === 'cpu'
  const isPracticeMode = host.isPracticeMode()
  const quitButtonLabel = isPracticeMode || host.clinchedWinner === 'player' ? t.quitPracticeButton : t.quitBattleButton
  return html`
    <section class="battle-panel">
      <div class="battle-fixed-head">
        <div class="score-row ${isPracticeMode ? 'is-practice' : ''}">
          <button class="quit-battle-btn" @click=${host.requestQuitBattle}>${quitButtonLabel}</button>
          ${isPracticeMode
            ? null
            : html`<div class="score-board">
                <span class="score-pill ${isPlayerTurn ? 'is-active' : ''}">${formatTemplate(t.playerScore, { score: host.playerPairs })}</span>
                <span class="turn-arrow ${isPlayerTurn ? 'is-player-turn' : isCpuTurn ? 'is-cpu-turn' : ''}">${host.turnArrowSymbol()}</span>
                <span class="score-pill ${isCpuTurn ? 'is-active' : ''}">${formatTemplate(t.cpuScore, { score: host.cpuPairs })}</span>
              </div>`}
          ${isPracticeMode || !host.currentEnemyImagePath()
            ? null
            : html`<button class="battle-enemy-portrait ${isCpuTurn ? 'is-active' : ''}" @click=${() => host.openEnemyInfo()} title=${host.currentEnemyName()}>
                <img src=${host.currentEnemyImagePath()} alt=${host.currentEnemyName()} />
              </button>`}
        </div>
      </div>
      <div class="card-grid-area">
        <div class="card-grid" aria-label="memory battle grid">
          ${host.cards.map((card: any) => {
            const isRevealed = card.isFaceUp || card.isMatched
            const isManualCardInputDisabled = host.isBusy || card.isMatched || host.currentTurn !== 'player' || isPlayerAutoModeEnabled()
            return html`
              <button class="memory-card ${card.isMatched ? 'matched' : ''}" ?disabled=${isManualCardInputDisabled} @click=${() => host.onCardTap(card.id)}>
                <img src=${host.assetUrl(isRevealed ? card.imagePath : host.memoryAsset('back_card'))} alt=${isRevealed ? card.label : t.backCardAlt} />
              </button>
            `
          })}
        </div>
        ${host.dealOverlayBanner
          ? html`<div class="deal-overlay" role="status" aria-live="polite">
              <img class="deal-overlay-image" src=${host.assetUrl(host.dealOverlayBanner)} alt="" />
            </div>`
          : null}
      </div>
    </section>
  `
}

function renderWin(host: MemoryBattleRenderHost) {
  const t = host.texts()
  const isFirstAllClear = host.winResultMode === 'first-all-clear'
  const isNewStageClear = host.winResultMode === 'new-stage-clear'
  const winMessage = isFirstAllClear ? t.allClearMessage : isNewStageClear ? t.winMessage : t.stageClearMessage
  return html`
    <section class="content-card center-card result-card">
      <div class="result-media">
        ${host.renderResultBanner(host.memoryAsset('win_banner'), 'Win')}
      </div>
      <div class="result-copy-block">
        <p>${formatTemplate(t.rewardLabel, { coin: host.resultReward })}</p>
        <p>${formatTemplate(t.totalCoinLabel, { coin: host.coin })}</p>
        <p class="result-message">${winMessage}</p>
      </div>
      <div class="result-spacer" aria-hidden="true"></div>
      <div class="stack-actions result-actions">
        ${isNewStageClear ? html`<button class="primary-btn" @click=${host.goToNextStage}>${t.next}</button>` : null}
        <button class="${isNewStageClear ? 'secondary-btn' : 'primary-btn'}" @click=${host.returnToStageSelect}>${t.returnToStageSelect}</button>
      </div>
    </section>
  `
}

function renderLose(host: MemoryBattleRenderHost) {
  const t = host.texts()
  return html`
    <section class="content-card center-card result-card">
      <div class="result-media">
        ${host.renderResultBanner(host.memoryAsset('lose_banner'), 'Lose')}
      </div>
      <div class="result-copy-block">
        <p class="result-message">${t.loseMessage}</p>
      </div>
      <div class="result-spacer" aria-hidden="true"></div>
      <div class="stack-actions result-actions">
        <button class="primary-btn" @click=${host.continueAfterLose}>${t.continueButton}</button>
        <button class="secondary-btn" @click=${host.leaveToMenuAfterLose}>${t.returnToMenuButton}</button>
      </div>
    </section>
  `
}

function renderDraw(host: MemoryBattleRenderHost) {
  const t = host.texts()
  return html`
    <section class="content-card center-card result-card">
      <div class="result-media">
        <h2 class="result-title-text">${t.retryTitle}</h2>
      </div>
      <div class="result-copy-block">
        <p class="result-message">${t.retryMessage}</p>
      </div>
      <div class="result-spacer" aria-hidden="true"></div>
      <div class="stack-actions result-actions">
        <button class="primary-btn" @click=${host.retryLevel}>${t.retryButton}</button>
        <button class="secondary-btn" @click=${host.returnToStageSelect}>${t.returnToStageSelect}</button>
      </div>
    </section>
  `
}

function renderPracticeResult(host: MemoryBattleRenderHost) {
  const t = host.texts()
  const practiceResultSummary = formatTemplate(t.practiceResultSummary, {
    count: host.practiceCardCount,
    turns: host.playerTurnCount
  })
  return html`
    <section class="content-card center-card result-card result-card--practice">
      <h2>${t.practiceClearTitle}</h2>
      <p>${practiceResultSummary}</p>
      <p>${t.practiceClearMessage}</p>
      <div class="stack-actions">
        <button class="primary-btn" @click=${host.openPracticeSetup}>${t.practiceRetryButton}</button>
        <button class="secondary-btn" @click=${host.returnToStageSelect}>${t.returnToStageSelect}</button>
      </div>
    </section>
  `
}
