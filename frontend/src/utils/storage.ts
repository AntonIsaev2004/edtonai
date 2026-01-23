const STORAGE_KEY = 'edtonai_draft'

export interface DraftData {
  resumeText: string
  vacancyText: string
  resultText: string
  savedAt: number
}

export function saveDraft(data: Omit<DraftData, 'savedAt'>): void {
  try {
    const draft: DraftData = {
      ...data,
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch (e) {
    console.warn('Failed to save draft:', e)
  }
}

export function loadDraft(): DraftData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const draft: DraftData = JSON.parse(stored)

    // Validate structure
    if (
      typeof draft.resumeText !== 'string' ||
      typeof draft.vacancyText !== 'string' ||
      typeof draft.resultText !== 'string'
    ) {
      return null
    }

    return draft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear draft:', e)
  }
}

// Debounce helper
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
