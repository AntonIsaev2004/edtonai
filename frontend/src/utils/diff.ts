import * as Diff from 'diff'

export type DiffGranularity = 'line' | 'word'

export interface DiffSegment {
  type: 'equal' | 'add' | 'remove'
  text: string
}

export interface DiffResult {
  segments: DiffSegment[]
  stats: {
    added: number
    removed: number
    unchanged: number
  }
}

export function computeDiff(
  before: string,
  after: string,
  granularity: DiffGranularity = 'word'
): DiffResult {
  const changes =
    granularity === 'line' ? Diff.diffLines(before, after) : Diff.diffWords(before, after)

  const segments: DiffSegment[] = []
  let added = 0
  let removed = 0
  let unchanged = 0

  for (const change of changes) {
    if (change.added) {
      segments.push({ type: 'add', text: change.value })
      added += change.value.length
    } else if (change.removed) {
      segments.push({ type: 'remove', text: change.value })
      removed += change.value.length
    } else {
      segments.push({ type: 'equal', text: change.value })
      unchanged += change.value.length
    }
  }

  return {
    segments,
    stats: { added, removed, unchanged },
  }
}

// Escape HTML special characters to prevent XSS
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
