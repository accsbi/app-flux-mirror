const GUIDE_LINES_TO_HIDE = [
  'privacy policy',
  'プライバシーポリシー',
  '隐私政策',
  'privacy-policy/',
  '(external link)',
  '（外部リンク）'
]

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
    .filter((line) => {
      const normalized = line.toLowerCase()
      return !GUIDE_LINES_TO_HIDE.some((token) => normalized.includes(token))
    })
    .filter((line) => options?.preserveEmpty || line.length > 0)
}
