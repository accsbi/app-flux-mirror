import { unsafeCSS } from 'lit'

/**
 * アプリ全体のフォントの唯一の定義（単一ソース）。
 * 全コンポーネントの :host / ボタンはここを参照すること（各所でフォントをベタ書きしない）。
 * 言語フォールバックでの見え方の差は許容するが、指定自体は必ずこの1か所に統一する。
 */
// 全ゲームのフォントは HIGH & LOW に統一（Cinzel＝クラシック・セリフ。
// 日本語/中国語グリフは明朝系へフォールバック）。Cinzel はメニューの ensureClassicFont で
// document に読み込まれ、全ゲームで利用可能。
export const APP_FONT_STACK = "'Cinzel', 'Noto Serif JP', 'Hiragino Mincho ProN', Georgia, serif"
export const appFontFamily = unsafeCSS(APP_FONT_STACK)
