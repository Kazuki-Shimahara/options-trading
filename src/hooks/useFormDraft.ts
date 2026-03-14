'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DEBOUNCE_MS = 500

export function useFormDraft<T extends object>(
  storageKey: string,
  initialValues: T
) {
  const [values, setValues] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValues
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          return parsed as T
        }
      }
    } catch {
      // invalid JSON, use initial values
    }
    return initialValues
  })

  const [hasDraft, setHasDraft] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        JSON.parse(saved)
        return true
      }
    } catch {
      // invalid JSON
    }
    return false
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialValuesRef = useRef(initialValues)

  const updateValues = useCallback(
    (newValues: T) => {
      setValues(newValues)
      setHasDraft(true)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newValues))
        } catch {
          // localStorage full or unavailable
        }
      }, DEBOUNCE_MS)
    },
    [storageKey]
  )

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    localStorage.removeItem(storageKey)
    setValues(initialValuesRef.current)
    setHasDraft(false)
  }, [storageKey])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { values, hasDraft, updateValues, clearDraft }
}
