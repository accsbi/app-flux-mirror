export function getLocalizedString(source: Record<string, string> | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = source?.[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return ''
}

export function splitTextLines(value: string, options?: { preserveEmpty?: boolean }): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => options?.preserveEmpty || line.length > 0)
}

// ガイド本文は config.overview_info.guide_content（build_content.py 生成）が唯一の正。
// 設定ロード済み(overview あり)で欠如していればエラー（直書き/空フォールバック禁止）。
export function requireGuideContent(overview: Record<string, string> | undefined, where: string): string[] {
  const gc = overview?.guide_content ?? ''
  if (overview && !gc) {
    throw new Error(`guide_content がありません (${where})。build_content.py で生成してください（直書きフォールバック禁止）。`)
  }
  return splitTextLines(gc, { preserveEmpty: true })
}
