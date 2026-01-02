import { useState, useEffect, useRef, useCallback } from 'react'

interface UseAutoSaveOptions {
  delay?: number
  enabled?: boolean
}

interface UseAutoSaveReturn {
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  save: () => Promise<void>
  markAsDirty: () => void
  error: string | null
}

export function useAutoSave(
  saveFunction: () => Promise<void>,
  dependencies: unknown[],
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { delay = 1500, enabled = true } = options

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstRender = useRef(true)
  const saveFunctionRef = useRef(saveFunction)

  // Keep save function ref updated
  saveFunctionRef.current = saveFunction

  // Manual save function
  const save = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setIsSaving(true)
    setError(null)

    try {
      await saveFunctionRef.current()
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Mark as having unsaved changes
  const markAsDirty = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  // Auto-save effect
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!enabled || !hasUnsavedChanges) return

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        await save()
      } catch {
        // Error is already set in save function
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, hasUnsavedChanges, delay, save, ...dependencies])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    save,
    markAsDirty,
    error
  }
}
