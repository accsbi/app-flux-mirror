import type { AppLanguage } from '../config/app-config'
import { INITIAL_SETUP_COMPLETED_KEY, LANGUAGE_KEY } from '../config/storage-keys'

// 初回起動時の「設定画面(言語選択)」表示判定の単一ソース。
//
// 仕様（全カードゲーム共通・playingcardshub の元実装を集約）:
//   - 初めて web-games に来た（= 完了フラグ未設定 かつ 言語未保存）場合に設定画面を表示する。
//   - 既に言語を保存済みなら「初回設定は済み」とみなしてフラグを立て、二度と出さない。
//   - 設定の「キャッシュクリア」で localStorage が消える（clearLocalStoragePreservingProgress は
//     言語/このフラグを残さない）ため、再度この判定が true になり同じ設定画面が再表示される。
//   - Android(Flutter WebView) でも同じロジックがそのまま動く（分岐しない）。

const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['en', 'ja', 'zh']

function hasSavedLanguage(): boolean {
  const saved = localStorage.getItem(LANGUAGE_KEY)
  return SUPPORTED_LANGUAGES.includes(saved as AppLanguage)
}

/**
 * 初回設定画面を表示すべきか。
 * 既に言語保存済みのときは完了フラグを立ててから false を返す（移行ケースの取りこぼし防止）。
 */
export function shouldShowInitialSetup(): boolean {
  if (localStorage.getItem(INITIAL_SETUP_COMPLETED_KEY) === 'true') {
    return false
  }
  if (hasSavedLanguage()) {
    localStorage.setItem(INITIAL_SETUP_COMPLETED_KEY, 'true')
    return false
  }
  return true
}

/** 初回設定の既定言語を en にして保存する（設定画面を開く前に呼ぶ）。 */
export function applyInitialDefaultLanguage(): AppLanguage {
  const fallback: AppLanguage = 'en'
  localStorage.setItem(LANGUAGE_KEY, fallback)
  return fallback
}

/** 初回設定の完了を記録する（設定画面を閉じたときに呼ぶ）。 */
export function markInitialSetupCompleted(): void {
  localStorage.setItem(INITIAL_SETUP_COMPLETED_KEY, 'true')
}
