// src/data/games-catalog.ts
//
// Classic Card Games Collection のデータ層。正本（編集する場所）はトップレベルの catalog/ のみ:
//   - meta（構造データ） = catalog/games-list.csv
//   - 説明              = catalog/descriptions/<file_name>.json
//
// app-flux frontend/catalog/ と同じく「データはトップレベル catalog/ にまとめる」。
// Vite の ?raw / import.meta.glob で build 時に catalog/ から直接読み込む
// （public/data に複製・配置しない）。ロジックは app-flux gamesAppsCatalog.ts を移植。

// catalog/ を build 時に取り込む（唯一のソース）。
import csvRaw from '../../catalog/games-list.csv?raw'
const descModules = import.meta.glob<DescFile>('../../catalog/descriptions/*.json', {
  eager: true,
  import: 'default',
})

export type Lang = 'en' | 'ja' | 'zh'
export const LANGS: Lang[] = ['en', 'ja', 'zh']
export const DEFAULT_LANG: Lang = 'en'

/** 公開ファイル名（=app_name/スラッグ）。URL・JSON名・画像フォルダ名の唯一の鍵。 */
const WEB_GAMES_BASE = '/web-games/'
const FEAT_IMAGE_BASE = '/site-assets/images/games-apps/'

/** info 説明画像の最大枚数（命名規約: <slug>-info1.webp … -info8.webp）。 */
export const MAX_INFO_IMAGES = 8

// 命名規約（AGENTS_assets_multilingual.md）に沿った画像URLビルダ。
// フォルダ名・ファイル名は必ず slug(=file_name) に一致させる。
const gameImageDir = (slug: string) => `${FEAT_IMAGE_BASE}${slug}/`
export const featImageUrl = (slug: string) => `${gameImageDir(slug)}${slug}-feat.webp`
export const iconImageUrl = (slug: string) => `${gameImageDir(slug)}${slug}-icon.webp`
export const infoImageUrl = (slug: string, n: number) => `${gameImageDir(slug)}${slug}-info${n}.webp`

export interface GameMeta {
  /** CSV の数字 id（00001 等）。表示順の安定キー。 */
  numId: string
  title: string
  packageName: string
  /** スラッグ = file_name。URL/JSON/画像フォルダ名の鍵。 */
  fileName: string
  googlePlayUrl?: string
  youtubeUrl?: string
  /** 一覧/詳細に出すか。false ならカードごと非表示（最優先・他が true でもこれが false なら非公開）。 */
  published: boolean
  /** Google Play ボタンの状態: button=リンク表示 / comingsoon=「近日公開」文字のみ(リンク無し) / hidden=非表示。 */
  storeState: StoreState
  /** YouTube ボタンを出すか。youtube_url がある時のみ適用（無ければ無視）。 */
  youtubePublished: boolean
  /** WEB ゲームのボタンを出すか。false なら非公開（old-maid 等の未実装時）。 */
  webPublished: boolean
  newRelease: boolean
  update: boolean
  /** 規約導出: /site-assets/images/games-apps/<file_name>/<file_name>-feat.webp */
  featImage: string
  /** 規約導出: /web-games/<file_name>.html（フェーズ1は仮メニュー） */
  webGameHref: string
}

export interface DescSection {
  heading: string
  targets: string[]
  body: string
}

export interface GameEntry extends GameMeta {
  /** 概略（各言語の最初のセクション本文）。詳細・SEO 用。 */
  description: string
  /** カード用の説明（最初に web を含むセクション本文）。3行 clamp 表示。 */
  cardText: string
  /** 表示言語ぶんの全セクション（詳細ページ用に保持）。 */
  sections: DescSection[]
}

// ── CSV パース（引用符・カンマ・改行対応の最小実装。app-flux から移植） ──────
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '') // BOM 除去

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== '') rows.push(row)
  }

  if (rows.length === 0) return []
  const header = rows[0]
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim()
    })
    return obj
  })
}

// 明示的に true 系のときだけ true。NULL/空/未指定は false。
function parseBool(v: string): boolean {
  const s = (v || '').trim().toLowerCase()
  return s === 'true' || s === 'yes' || s === '1'
}

// published 系: 明示的に false 系のときだけ false。空/未指定/その他は true(公開)。
function parsePublished(v: string): boolean {
  const s = (v || '').trim().toLowerCase()
  return !(s === 'false' || s === 'no' || s === '0')
}

export type StoreState = 'button' | 'comingsoon' | 'hidden'

// store_published 三状態: comingsoon=「近日公開」文字 / false=非表示 / それ以外(true/空)=ボタン。
function parseStoreState(v: string): StoreState {
  const s = (v || '').trim().toLowerCase()
  if (s === 'comingsoon' || s === 'coming-soon' || s === 'coming_soon') return 'comingsoon'
  if (s === 'false' || s === 'no' || s === '0') return 'hidden'
  return 'button'
}

function csvToMeta(text: string): GameMeta[] {
  return parseCsv(text)
    .filter((r) => r.file_name) // データ行のみ
    .map((r) => ({
      numId: r.id,
      title: r.title,
      packageName: r.package_name,
      fileName: r.file_name,
      googlePlayUrl: r.google_play_store_url || undefined,
      youtubeUrl: r.youtube_url || undefined,
      published: parsePublished(r.published),
      storeState: parseStoreState(r.store_published),
      youtubePublished: parsePublished(r.youtube_published),
      webPublished: parsePublished(r.web_published),
      newRelease: parseBool(r.app_new_release),
      update: parseBool(r.app_update),
      featImage: featImageUrl(r.file_name),
      webGameHref: `${WEB_GAMES_BASE}${r.file_name}.html`,
    }))
}

// ── 説明 JSON ─────────────────────────────────────────────────────────
interface DescFile {
  default_lang?: Lang
  languages: Partial<Record<Lang, { sections: DescSection[] }>>
}

// カードやヘッダーに平文で出すため、インライン markdown 記号を除去する（app-flux 同等）。
function stripInlineMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 説明 JSON から、要求言語（無ければ default→en）のセクション群を取り出す。 */
function pickSections(desc: DescFile, lang: Lang): DescSection[] {
  const fallback = desc.default_lang ?? DEFAULT_LANG
  return (
    desc.languages[lang]?.sections ??
    desc.languages[fallback]?.sections ??
    desc.languages[DEFAULT_LANG]?.sections ??
    []
  )
}

// ── catalog/descriptions/*.json を slug→DescFile のマップに整える ────────────
//   glob のキーは相対パス（…/descriptions/<slug>.json）。basename から slug を取る。
const descBySlug: Record<string, DescFile> = {}
for (const [path, mod] of Object.entries(descModules)) {
  const slug = path.split('/').pop()!.replace(/\.json$/, '')
  descBySlug[slug] = mod
}

/** 指定言語の表示用エントリ一覧を返す。CSV 初出順（= 数字 id 昇順）を維持。 */
export function loadGames(lang: Lang): GameEntry[] {
  // published=false はカードごと非表示（最優先）。
  return csvToMeta(csvRaw)
    .filter((m) => m.published)
    .map((m): GameEntry => {
    const desc = descBySlug[m.fileName]
    const sections = desc ? pickSections(desc, lang) : [] // 説明が無くてもタイトル＋リンクは表示
    const description = sections[0]?.body ?? ''
    const webSection = sections.find((s) => s.targets.includes('web')) ?? sections[1] ?? sections[0]
    return {
      ...m,
      description: stripInlineMd(description),
      cardText: stripInlineMd(webSection?.body ?? ''),
      sections,
    }
  })
}

/** 1件取得（詳細ページ用・将来用）。 */
export function getGame(lang: Lang, fileName: string): GameEntry | undefined {
  return loadGames(lang).find((e) => e.fileName === fileName)
}
