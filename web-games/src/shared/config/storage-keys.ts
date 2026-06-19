// localStorage キーの単一ソース。各ゲーム/ラッパーでのベタ書き重複を禁止し、ここを唯一の正とする。
//
// 重要: キーの「値」は据え置き厳守。既存ユーザーの保存データ（言語/効果音/購入状態など）の
// 参照先そのものなので、値を変えると全端末で設定が消える。"simplebj" 等の旧名は値の中だけに残すが、
// 定数名・ファイル名・要素名は意味の通る形に統一する。
// BGM 系キーは既存の単一ソース ./../infra/bgm-setting.ts を使うこと（ここでは再定義しない）。

export const LANGUAGE_KEY = 'playingcardshub_language'
export const SOUND_ENABLED_KEY = 'simplebj_sound_enabled'

// 初回起動時に「設定画面(言語選択)」を出したかどうかの完了フラグ。全カードゲーム共通の単一フラグ
// （最初に来たゲームで1回だけ表示）。値はハブ既存値を据え置き流用（native互換）。
export const INITIAL_SETUP_COMPLETED_KEY = 'playingcardshub_initial_setup_completed'
