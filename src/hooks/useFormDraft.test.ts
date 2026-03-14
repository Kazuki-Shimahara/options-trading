// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormDraft } from './useFormDraft'

describe('useFormDraft', () => {
  const STORAGE_KEY = 'draft:test-form'

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial values when no draft exists', () => {
    const initial = { trade_type: 'call', strike_price: '' }
    const { result } = renderHook(() => useFormDraft(STORAGE_KEY, initial))

    expect(result.current.values).toEqual(initial)
    expect(result.current.hasDraft).toBe(false)
  })

  it('restores draft from localStorage on mount', () => {
    const saved = { trade_type: 'put', strike_price: '39000' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    const initial = { trade_type: 'call', strike_price: '' }
    const { result } = renderHook(() => useFormDraft(STORAGE_KEY, initial))

    expect(result.current.values).toEqual(saved)
    expect(result.current.hasDraft).toBe(true)
  })

  it('saves values to localStorage with debounce', () => {
    const initial = { trade_type: 'call', strike_price: '' }
    const { result } = renderHook(() => useFormDraft(STORAGE_KEY, initial))

    act(() => {
      result.current.updateValues({ trade_type: 'call', strike_price: '38000' })
    })

    // Not saved yet (debounce)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    // Advance timer past debounce
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      trade_type: 'call',
      strike_price: '38000',
    })
  })

  it('clearDraft removes from localStorage and resets to initial', () => {
    const saved = { trade_type: 'put', strike_price: '39000' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))

    const initial = { trade_type: 'call', strike_price: '' }
    const { result } = renderHook(() => useFormDraft(STORAGE_KEY, initial))

    expect(result.current.values).toEqual(saved)

    act(() => {
      result.current.clearDraft()
    })

    expect(result.current.values).toEqual(initial)
    expect(result.current.hasDraft).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('updateValues updates current values', () => {
    const initial = { trade_type: 'call', strike_price: '' }
    const { result } = renderHook(() => useFormDraft(STORAGE_KEY, initial))

    act(() => {
      result.current.updateValues({ trade_type: 'put', strike_price: '40000' })
    })

    expect(result.current.values).toEqual({ trade_type: 'put', strike_price: '40000' })
  })

  it('ignores invalid JSON in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')

    const initial = { trade_type: 'call', strike_price: '' }
    const { result } = renderHook(() => useFormDraft(STORAGE_KEY, initial))

    expect(result.current.values).toEqual(initial)
    expect(result.current.hasDraft).toBe(false)
  })
})
