// ゲームのタイトルの唯一のソース = カタログ CSV（catalog/games-list.csv）。
// config(app_title 等) にハードコードしない。CSV を直せば一覧・詳細・ゲーム内メニューの
// すべてに反映される（build 時取り込み）。slug = CSV の file_name 列。
import csvRaw from '../../../../catalog/games-list.csv?raw'

function buildTitleMap(): Record<string, string> {
  const lines = csvRaw.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return {}
  const header = lines[0].split(',').map((h) => h.trim())
  const iName = header.indexOf('file_name')
  const iTitle = header.indexOf('title')
  const map: Record<string, string> = {}
  if (iName < 0 || iTitle < 0) return map
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const slug = (cols[iName] ?? '').trim()
    const title = (cols[iTitle] ?? '').trim()
    if (slug) map[slug] = title
  }
  return map
}

const TITLE_MAP = buildTitleMap()

/** slug(=file_name) の CSV タイトルを返す。無ければ undefined（呼び出し側でフォールバック）。 */
export function getGameTitle(slug: string): string | undefined {
  return TITLE_MAP[slug] || undefined
}
