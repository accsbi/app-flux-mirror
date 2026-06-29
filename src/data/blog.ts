// src/data/blog.ts
//
// ブログのデータ層。正本（編集する場所）は catalog/blog/<NNNN>_<slug>.md のみ。
//   - 1記事 = 1ファイル（3言語まとめ）。先頭に `date: YYYY-MM-DD`、続けて
//     `## [en]` / `## [ja]` / `## [zh]` の言語ブロック。各ブロックの先頭 `### 見出し`
//     が記事タイトル、それ以降が本文（markdown 原文）。
//   - 記事を増やすときは catalog/blog/ に MD を足すだけ（コード変更不要）。
//     HTML スタブは `node scripts/node/build_blog_pages.mjs` で全記事ぶん生成する。
//
// games-catalog.ts と同じ方針：データは catalog/ に集約し、Vite の import.meta.glob で
// build 時に取り込み、JSON に潰さず markdown のまま描画する（人間が .md をレビューできる）。

import { parseMdByLang } from '../lib/markdown'
import { LANGS, DEFAULT_LANG, type Lang } from './games-catalog'

// catalog/blog/*.md を build 時に取り込む（唯一のソース）。
const postModules = import.meta.glob<string>('../../catalog/blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export interface BlogPost {
  /** ファイル名先頭の連番（0001 等）。安定キー。 */
  numId: string
  /** スラッグ = ファイル名から連番を除いた部分。URL の鍵。 */
  slug: string
  /** 公開日（ISO: YYYY-MM-DD）。並び順に使う。 */
  date: string
  /** サムネ/ヒーロー画像のパス（`image:` 行）。任意。 */
  image?: string
  /** 指定言語のタイトル。 */
  title: string
  /** 指定言語の本文（markdown 原文）。本文中の `![](…)` 画像も含む。 */
  body: string
}

const DATE_RE = /^date:\s*(.+)$/m
const IMAGE_RE = /^image:\s*(.+)$/m

interface RawPost {
  numId: string
  slug: string
  date: string
  image?: string
  /** lang -> { title, body }。本文が無い言語は持たない。 */
  byLang: Partial<Record<Lang, { title: string; body: string }>>
}

// catalog/blog/*.md を slug 単位に整える。
const rawPosts: RawPost[] = Object.entries(postModules)
  .map(([path, raw]): RawPost => {
    const base = path.split('/').pop()!.replace(/\.md$/, '')
    const numId = (/^(\d+)_/.exec(base)?.[1]) ?? base
    const slug = base.replace(/^\d+_/, '')
    const date = DATE_RE.exec(raw)?.[1].trim() ?? ''
    if (!date) throw new Error(`blog: missing "date:" in catalog/blog/${base}.md`)
    const image = IMAGE_RE.exec(raw)?.[1].trim() || undefined

    const byLangSections = parseMdByLang(raw)
    const byLang: RawPost['byLang'] = {}
    for (const lang of LANGS) {
      const secs = byLangSections[lang]
      if (!secs || secs.length === 0) continue
      // 先頭セクションの見出し=タイトル。本文は先頭セクション以降を見出しごと連結。
      const title = secs[0].heading
      const body = secs
        .map((s, i) => (i === 0 ? s.body : `### ${s.heading}\n${s.body}`))
        .join('\n\n')
        .trim()
      byLang[lang] = { title, body }
    }
    return { numId, slug, date, image, byLang }
  })
  // 公開日の新しい順（同日は連番の大きい順）。
  .sort((a, b) => (b.date.localeCompare(a.date) || b.numId.localeCompare(a.numId)))

/** 指定言語の記事一覧（新しい順）。本文が無い言語は DEFAULT_LANG にフォールバックせず、その言語の訳が無ければ除外。 */
export function loadPosts(lang: Lang): BlogPost[] {
  return rawPosts
    .map((p): BlogPost | null => {
      const t = p.byLang[lang] ?? p.byLang[DEFAULT_LANG]
      if (!t) return null
      return { numId: p.numId, slug: p.slug, date: p.date, image: p.image, title: t.title, body: t.body }
    })
    .filter((p): p is BlogPost => p !== null)
}

/** 1件取得（個別記事ページ用）。 */
export function getPost(lang: Lang, slug: string): BlogPost | undefined {
  return loadPosts(lang).find((p) => p.slug === slug)
}

/** 全記事の slug 一覧（HTML 生成スクリプト・サイトマップ用）。 */
export function allPostSlugs(): string[] {
  return rawPosts.map((p) => p.slug)
}

/** 公開日（ISO）を言語別の表示文字列に整える。 */
export function formatPostDate(lang: Lang, iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  const month = String(Number(mo))
  const day = String(Number(d))
  if (lang === 'ja' || lang === 'zh') return `${y}年${month}月${day}日`
  const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${EN_MONTHS[Number(mo) - 1]} ${day}, ${y}`
}
