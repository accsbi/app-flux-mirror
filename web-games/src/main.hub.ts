// Browser Games ハブ（/web-games/index.html）のエントリ。
// ゲーム一覧は唯一のソース catalog/games-list.csv から動的生成する（ハードコード禁止）。
// 列: title / file_name を使い、published=false・web_published=false は除外。CSV の並び順を維持。
import csvRaw from '../../catalog/games-list.csv?raw'

interface HubGame {
  title: string
  fileName: string
}

// 明示的に false 系のときだけ非公開扱い（空/未指定は公開）。games-catalog.ts の parsePublished と同方針。
function isFalsey(value: string): boolean {
  const s = (value || '').trim().toLowerCase()
  return s === 'false' || s === 'no' || s === '0'
}

function parseHubGames(csv: string): HubGame[] {
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = lines[0].split(',').map((h) => h.trim())
  const iTitle = header.indexOf('title')
  const iName = header.indexOf('file_name')
  const iPublished = header.indexOf('published')
  const iWebPublished = header.indexOf('web_published')
  if (iTitle < 0 || iName < 0) return []

  const games: HubGame[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const fileName = (cols[iName] ?? '').trim()
    if (!fileName) continue
    if (iPublished >= 0 && isFalsey(cols[iPublished] ?? '')) continue // 非公開は出さない
    if (iWebPublished >= 0 && isFalsey(cols[iWebPublished] ?? '')) continue // WEB 未公開は出さない
    games.push({ title: (cols[iTitle] ?? '').trim() || fileName, fileName })
  }
  return games
}

// 各ゲームの実体は同階層の <file_name>.html。base:'/' 前提で絶対パスに解決する。
const base = import.meta.env.BASE_URL || '/'
const gameHref = (slug: string): string =>
  `${base}web-games/${slug}.html`.replace(/\/{2,}/g, '/')

function render(): void {
  const root = document.getElementById('hub-list')
  if (!root) return
  const games = parseHubGames(csvRaw)
  if (games.length === 0) {
    root.innerHTML = '<p class="hub-empty">No browser games available.</p>'
    return
  }
  root.replaceChildren(
    ...games.map((g) => {
      const item = document.createElement('article')
      item.className = 'hub-item'

      const title = document.createElement('h2')
      title.className = 'hub-title'
      title.textContent = g.title

      const link = document.createElement('a')
      link.className = 'hub-link'
      link.href = gameHref(g.fileName)
      link.textContent = 'Browser Game'

      item.append(title, link)
      return item
    }),
  )
}

render()
