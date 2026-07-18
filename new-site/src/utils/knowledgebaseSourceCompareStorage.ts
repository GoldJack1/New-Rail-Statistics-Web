const SOURCE_COMPARE_STORAGE_KEY = 'rs-gbnr-source-compare'

export const SOURCE_COMPARE_CHANGED_EVENT = 'rs-gbnr-source-compare-changed'

export function readKnowledgebaseSourceCompareEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SOURCE_COMPARE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeKnowledgebaseSourceCompareEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (enabled) {
      localStorage.setItem(SOURCE_COMPARE_STORAGE_KEY, '1')
    } else {
      localStorage.removeItem(SOURCE_COMPARE_STORAGE_KEY)
    }
    window.dispatchEvent(new Event(SOURCE_COMPARE_CHANGED_EVENT))
  } catch {
    /* quota / private mode */
  }
}
