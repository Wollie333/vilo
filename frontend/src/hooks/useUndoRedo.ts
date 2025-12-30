import { useState, useCallback, useEffect } from 'react'

interface UseUndoRedoOptions<T> {
  initialState: T
  maxHistory?: number
}

interface UseUndoRedoReturn<T> {
  state: T
  setState: (newState: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  reset: (newState?: T) => void
  historyLength: number
}

export function useUndoRedo<T>({
  initialState,
  maxHistory = 50,
}: UseUndoRedoOptions<T>): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState])
  const [currentIndex, setCurrentIndex] = useState(0)

  const state = history[currentIndex]

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(prev => {
      const current = prev[currentIndex]
      const next = typeof newState === 'function'
        ? (newState as (prev: T) => T)(current)
        : newState

      // Don't add to history if state hasn't changed
      if (JSON.stringify(current) === JSON.stringify(next)) {
        return prev
      }

      // Create new history by slicing up to current index
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push(next)

      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift()
        setCurrentIndex(i => Math.max(0, i - 1))
      }

      return newHistory
    })
    setCurrentIndex(i => Math.min(i + 1, maxHistory - 1))
  }, [currentIndex, maxHistory])

  const undo = useCallback(() => {
    setCurrentIndex(i => Math.max(0, i - 1))
  }, [])

  const redo = useCallback(() => {
    setCurrentIndex(i => Math.min(history.length - 1, i + 1))
  }, [history.length])

  const reset = useCallback((newState?: T) => {
    setHistory([newState ?? initialState])
    setCurrentIndex(0)
  }, [initialState])

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength: history.length,
  }
}

// Hook for debounced auto-save
export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  delay = 3000
) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!data) return

      setIsSaving(true)
      setError(null)

      try {
        await onSave(data)
        setLastSaved(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auto-save failed')
      } finally {
        setIsSaving(false)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [data, onSave, delay])

  return { isSaving, lastSaved, error }
}
