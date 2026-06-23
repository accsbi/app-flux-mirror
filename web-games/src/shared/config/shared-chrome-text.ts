import type { AppLanguage } from './app-config'

/**
 * 共有 UI クローム文言の「唯一の正（single source of truth）」。
 *
 * ゲーム画面のヘッダー（ホーム / 設定 / ガイド）と、ホームへ戻る確認ダイアログ
 * （題名・本文・OK・キャンセル）の文言は、すべてのゲームでこのモジュールから
 * 取得すること。各ゲームの JSON config から個別に読み出したり、ゲームごとに
 * 文字列をコピーして持つことは禁止（訳語のブレ防止）。
 *
 * ルール詳細: docs/AGENTS_assets_multilingual.md の
 *   「Shared UI Chrome Text Rule」を参照。
 */
export type SharedChromeText = {
  /** ヘッダーのホームボタン */
  home: string
  /** ヘッダー・メニューの設定ボタン */
  settings: string
  /** ヘッダーのガイドボタン（短い表記） */
  guide: string
  /** メニューのガイドボタン（ガイド / 概要 の長い表記） */
  guideOverview: string
  /** メニューのスタートボタン */
  start: string
  /** メニューのニュース / 更新情報（外部リンク）ボタンのラベル（WEB 用・(外部) サフィックス付き） */
  news: string
  /** News ラベルの外部サフィックス無し版（Android 用・外部アイコン+注記で示すため括弧不要） */
  newsShort: string
  /** メニューの広告削除ボタン（Android のみ表示） */
  removeAds: string
  /** メニューの「別のカードゲーム」ボタン（Android のみ・外部リンク） */
  otherCardGames: string
  /** News ボタン下「アイコン＝外部リンク」の説明文（Android のみ） */
  externalLinkNote: string
  /** メニューの戻るボタン */
  back: string
  /** プロモーション欄の「Google Play ストアでも入手可能」notice */
  alsoOnGooglePlay: string
  /** ホーム確認ダイアログの題名（ホームと同じ語） */
  leaveTitle: string
  /** ホーム確認ダイアログの本文 */
  leaveMessage: string
  /** 確認ダイアログの OK ボタン */
  ok: string
  /** 確認ダイアログのキャンセルボタン */
  cancel: string
  /** ゲーム終了画面の「もう一度遊ぶ」ボタン。全ゲーム共通（訳語のブレ防止）。 */
  playAgain: string
  /** 初回起動時の設定画面タイトル（言語選択を促す） */
  initialSetupTitle: string
  /** 初回設定 完了通知のタイトル */
  initialSetupDoneTitle: string
  /** 初回設定 完了通知の本文 */
  initialSetupDoneMessage: string
  /** 設定: 言語ラベル */
  settingsLanguage: string
  /** 設定: 効果音ラベル */
  settingsEffect: string
  /** 設定: BGM ラベル */
  settingsBgm: string
  /** 設定: キャッシュクリアのボタン文言 */
  settingsClearCache: string
  /** 設定: サウンドヘルプ(?)のタイトル */
  soundHelpTitle: string
  /** 設定: サウンドヘルプ(?)の本文 */
  soundHelpMessage: string
  /** 広告表示時オフライン警告のタイトル */
  offlineAdTitle: string
  /** 広告表示時オフライン警告の本文（スタートへ戻る旨） */
  offlineAdMessage: string
  /** SELECT BET モーダルの説明文（テンキー入力の案内）。全ゲーム共通。 */
  betInstruction: string
  /** COIN 補充ダイアログのタイトル。全ゲーム共通。 */
  coinRecoveryTitle: string
  /** COIN 補充ダイアログの本文1行目。 */
  coinRecoveryLine1: string
  /** COIN 補充ダイアログの本文2行目。 */
  coinRecoveryLine2: string
}

const SHARED_CHROME_TEXT: Record<AppLanguage, SharedChromeText> = {
  ja: {
    home: 'ホーム',
    settings: '設定',
    guide: 'ガイド',
    guideOverview: 'ガイド / 概要',
    start: 'スタート',
    news: '詳細',
    newsShort: 'お知らせ・更新',
    removeAds: '広告を削除',
    otherCardGames: '別のカードゲーム',
    externalLinkNote: 'インターネット環境が必要です',
    back: '戻る',
    alsoOnGooglePlay: 'Google Play ストアでも入手可能',
    leaveTitle: 'ホーム',
    leaveMessage: 'メニューに戻りますか？',
    ok: 'OK',
    cancel: 'キャンセル',
    playAgain: 'もう一度遊ぶ',
    initialSetupTitle: '初期設定',
    initialSetupDoneTitle: '設定完了',
    initialSetupDoneMessage: '言語や音はいつでも設定から変更できます。遊び方はメニューのガイド / 概要をご覧ください。',
    settingsLanguage: '言語',
    settingsEffect: '効果音',
    settingsBgm: 'BGM',
    settingsClearCache: 'キャッシュをクリア',
    soundHelpTitle: 'サウンドについて',
    soundHelpMessage: '音が出ない場合は、端末がサイレントモードまたはミュートになっていないか確認してください。',
    offlineAdTitle: 'ネットワーク接続が必要です',
    offlineAdMessage: '本アプリは、開発・運用を継続するため、広告表示へのご理解をお願いいたします。アプリ内課金により、広告を非表示、及び、オフラインプレイ(機内モード、電波がない場所等)が可能です。',
    betInstruction: '※数値をタップで、テンキー入力できます',
    coinRecoveryTitle: 'コイン補充',
    coinRecoveryLine1: 'COINが0になりました。',
    coinRecoveryLine2: 'OKで100 COINを補充します。'
  },
  zh: {
    home: '首页',
    settings: '设置',
    guide: '指南',
    guideOverview: '指南 / 概要',
    start: '开始',
    news: '详情',
    newsShort: '公告 / 更新',
    removeAds: '移除广告',
    otherCardGames: '其他纸牌游戏',
    externalLinkNote: '需要互联网连接',
    back: '返回',
    alsoOnGooglePlay: 'Google Play 商店亦可下载',
    leaveTitle: '首页',
    leaveMessage: '要返回菜单吗？',
    ok: '确定',
    cancel: '取消',
    playAgain: '再玩一次',
    initialSetupTitle: '初始设置',
    initialSetupDoneTitle: '设置完成',
    initialSetupDoneMessage: '语言和声音可随时在设置中更改。玩法请从菜单的指南 / 概要查看。',
    settingsLanguage: '语言',
    settingsEffect: '音效',
    settingsBgm: '背景音乐',
    settingsClearCache: '清除缓存',
    soundHelpTitle: '关于声音',
    soundHelpMessage: '如果没有声音，请检查设备是否处于静音模式或已静音。',
    offlineAdTitle: '需要网络连接',
    offlineAdMessage: '为持续开发与运营本应用，敬请理解广告展示。通过应用内购买，可隐藏广告，并支持离线游玩（飞行模式、无信号区域等）。',
    betInstruction: '※点击数字可用数字键盘输入。',
    coinRecoveryTitle: '金币补充',
    coinRecoveryLine1: '金币已用尽。',
    coinRecoveryLine2: '点击确定补充100金币。'
  },
  en: {
    home: 'Home',
    settings: 'Settings',
    guide: 'Guide',
    guideOverview: 'Guide / Overview',
    start: 'START',
    news: 'Details',
    newsShort: 'News / Updates',
    removeAds: 'Remove Ads',
    otherCardGames: 'Other Card Games',
    externalLinkNote: 'Internet connection required',
    back: 'Back',
    alsoOnGooglePlay: 'Also available on Google Play',
    leaveTitle: 'Home',
    leaveMessage: 'Return to menu?',
    ok: 'OK',
    cancel: 'Cancel',
    playAgain: 'Play Again',
    initialSetupTitle: 'Initial Settings',
    initialSetupDoneTitle: 'Setup Complete',
    initialSetupDoneMessage: 'You can change the language and sound anytime from Settings. Open Guide / Overview from the menu for how to play.',
    settingsLanguage: 'Language',
    settingsEffect: 'Sound Effect',
    settingsBgm: 'BGM',
    settingsClearCache: 'Clear Cache',
    soundHelpTitle: 'Sound',
    soundHelpMessage: 'If sound does not play, please check whether your device is in silent mode or muted.',
    offlineAdTitle: 'Network connection required',
    offlineAdMessage: 'To continue development and operation, we ask for your understanding regarding ad display. In-app purchases let you hide ads and enable offline play (airplane mode, areas with no signal, etc.).',
    betInstruction: '*Tap a number to enter with the keypad.',
    coinRecoveryTitle: 'COIN Recovery',
    coinRecoveryLine1: 'COIN reached 0.',
    coinRecoveryLine2: 'Press OK to refill 100 COIN.'
  }
}

/**
 * 指定言語の共有クローム文言を返す。未知の言語は英語にフォールバックする。
 */
export function getSharedChromeText(language: AppLanguage): SharedChromeText {
  return SHARED_CHROME_TEXT[language] ?? SHARED_CHROME_TEXT.en
}
