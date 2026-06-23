// src/lib/markdown.ts
//
// catalog/site_description_md/<id>_<slug>.md（base MD から生成・3言語1ファイル）の言語別原文を、
// JSON に潰さず「そのまま」WEB 詳細に反映するための最小 markdown ユーティリティ。
// 描画ロジックは web-games の guide-overview-panel.ts と同じ方針（marked 不要、
// #/##/-/*/・/1./[text](url)/--- を軽量に解釈）。

import { html, nothing, type TemplateResult } from 'lit'

export interface MdSection {
  heading: string
  /** 見出しの {Google / APP / WEB} を小文字トークン配列に（'web' 等）。 */
  targets: string[]
  /** 見出し以下の本文（markdown 原文のまま）。 */
  body: string
}

const LANG_RE = /^##\s*\[(\w+)\]/
const HEADING_RE = /^###\s+(.*)$/
const TAG_RE = /\{([^}]*)\}/

/** 1 ファイルに束ねた説明 md を `## [lang]` 単位で言語別セクション群に分解する。 */
export function parseMdByLang(md: string): Record<string, MdSection[]> {
  const lines = md.replace(/^﻿/, '').split('\n')
  const byLang: Record<string, string[]> = {}
  let cur: string | null = null
  for (const line of lines) {
    const m = LANG_RE.exec(line)
    if (m) {
      cur = m[1].toLowerCase()
      byLang[cur] = []
      continue
    }
    if (cur) byLang[cur].push(line)
  }
  const result: Record<string, MdSection[]> = {}
  for (const [lang, ls] of Object.entries(byLang)) {
    result[lang] = parseMdSections(ls.join('\n'))
  }
  return result
}

/** 言語別 .md を `### [ 見出し ] {tags}` 単位の節に分解する。 */
export function parseMdSections(md: string): MdSection[] {
  const lines = md.replace(/^﻿/, '').split('\n')
  const sections: MdSection[] = []
  let cur: MdSection | null = null
  let buf: string[] = []

  const flush = () => {
    if (cur) {
      cur.body = buf.join('\n').replace(/\n{3,}/g, '\n\n').trim()
      sections.push(cur)
    }
    buf = []
  }

  for (const line of lines) {
    const m = HEADING_RE.exec(line)
    if (m) {
      flush()
      let head = m[1].trim()
      let targets: string[] = []
      const tm = TAG_RE.exec(head)
      if (tm) {
        targets = tm[1].split(/[/,]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        head = head.slice(0, tm.index).trim()
      }
      cur = { heading: head.replace(/^\[|\]$/g, '').trim(), targets, body: '' }
    } else if (cur) {
      buf.push(line)
    }
  }
  flush()
  return sections
}

// 行内の [text](url) を <a> に、それ以外は素のテキストに。
function renderInline(text: string): unknown[] {
  const parts: unknown[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      html`<a class="md-link" href=${m[2].trim()} target="_blank" rel="noopener noreferrer">${m[1]}</a>`,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : [text]
}

// 1 行を 見出し/箇条書き/番号/区切り線/段落 に振り分けて描画。
function renderLine(raw: string): TemplateResult | typeof nothing {
  const line = raw.trimEnd()
  const t = line.trim()
  if (t.length === 0) return nothing
  if (/^([-*_])\1{2,}$/.test(t)) return html`<hr class="md-hr" />`

  const heading = /^(#{1,6})\s+(.*)$/.exec(t)
  if (heading) {
    const level = Math.min(heading[1].length, 4)
    return html`<p class="md-h md-h${level}">${renderInline(heading[2])}</p>`
  }
  const bullet = /^[-*・]\s*(.*)$/.exec(t)
  if (bullet) {
    return html`<p class="md-li"><span class="md-mark">•</span><span>${renderInline(bullet[1])}</span></p>`
  }
  const numbered = /^(\d+)[.)]\s+(.*)$/.exec(t)
  if (numbered) {
    return html`<p class="md-li"><span class="md-mark md-num">${numbered[1]}.</span><span>${renderInline(numbered[2])}</span></p>`
  }
  return html`<p class="md-p">${renderInline(line)}</p>`
}

/** markdown 本文（複数行）を Lit テンプレート配列に描画する。 */
export function renderMarkdown(body: string): unknown[] {
  return body.split('\n').map((line) => renderLine(line))
}

/** カード/見出し用の平文化（インライン markdown と改行を除去）。 */
export function mdToPlain(body: string): string {
  return body
    .split('\n')
    .map((l) => l.replace(/^#{1,6}\s+/, '').replace(/^[-*・]\s*/, '').replace(/^\d+[.)]\s+/, ''))
    .join(' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}
