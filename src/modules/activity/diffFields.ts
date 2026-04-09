/**
 * Simple field-level diff algorithm for comparing document versions.
 * Compares top-level fields and produces a structured diff result.
 */

// Fields that should be ignored during comparison
const SYSTEM_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  '_status',
  '_verificationToken',
  'globalType',
  'globalSlug',
])

export type DiffChangeType = 'added' | 'removed' | 'changed' | 'unchanged'

export interface WordDiff {
  text: string
  type: 'same' | 'added' | 'removed'
}

export interface FieldDiff {
  field: string
  changeType: DiffChangeType
  oldValue: unknown
  newValue: unknown
  /** Word-level diff for string fields */
  wordDiff?: WordDiff[]
}

/**
 * Compute word-level diff between two strings.
 * Splits by whitespace and compares word-by-word using LCS approach.
 */
export function wordDiff(oldStr: string, newStr: string): WordDiff[] {
  const oldWords = oldStr.split(/\s+/).filter(Boolean)
  const newWords = newStr.split(/\s+/).filter(Boolean)

  // Build LCS table
  const m = oldWords.length
  const n = newWords.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to build diff
  const result: WordDiff[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ text: oldWords[i - 1], type: 'same' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: newWords[j - 1], type: 'added' })
      j--
    } else {
      result.unshift({ text: oldWords[i - 1], type: 'removed' })
      i--
    }
  }

  return result
}

/**
 * Compare two document objects field by field.
 * Returns an array of field diffs, excluding system fields.
 */
export function diffFields(
  oldDoc: Record<string, unknown> | null,
  newDoc: Record<string, unknown> | null,
): FieldDiff[] {
  if (!oldDoc && !newDoc) return []

  const old = oldDoc || {}
  const cur = newDoc || {}

  // Collect all unique field names
  const allFields = new Set([...Object.keys(old), ...Object.keys(cur)])

  const diffs: FieldDiff[] = []

  for (const field of allFields) {
    if (SYSTEM_FIELDS.has(field)) continue

    const oldVal = old[field]
    const newVal = cur[field]

    // Field only in new doc
    if (!(field in old)) {
      diffs.push({ field, changeType: 'added', oldValue: undefined, newValue: newVal })
      continue
    }

    // Field only in old doc
    if (!(field in cur)) {
      diffs.push({ field, changeType: 'removed', oldValue: oldVal, newValue: undefined })
      continue
    }

    // Deep equality check via JSON serialization
    const oldJson = JSON.stringify(oldVal)
    const newJson = JSON.stringify(newVal)

    if (oldJson === newJson) {
      diffs.push({ field, changeType: 'unchanged', oldValue: oldVal, newValue: newVal })
      continue
    }

    // Changed — compute word diff for strings
    const diff: FieldDiff = {
      field,
      changeType: 'changed',
      oldValue: oldVal,
      newValue: newVal,
    }

    if (typeof oldVal === 'string' && typeof newVal === 'string') {
      diff.wordDiff = wordDiff(oldVal, newVal)
    }

    diffs.push(diff)
  }

  return diffs
}
