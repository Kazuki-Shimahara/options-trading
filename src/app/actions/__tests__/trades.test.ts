import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before importing the module under test
const mockInsert = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockFrom = vi.fn((table: string) => ({
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}))
const mockGetUser = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createTrade, updateTrade, deleteTrade } from '../trades'

const validCreateInput = {
  trade_date: '2026-01-15',
  trade_type: 'call' as const,
  strike_price: 38000,
  expiry_date: '2026-02-13',
  quantity: 1,
  entry_price: 150,
  exit_price: null,
  exit_date: null,
  iv_at_entry: null,
  memo: null,
  entry_delta: null,
  entry_gamma: null,
  entry_theta: null,
  entry_vega: null,
  defeat_tags: null,
  market_env_tags: null,
  is_mini: false,
  playbook_id: null,
  playbook_compliance: null,
}

const validUpdateInput = {
  trade_date: '2026-01-15',
  trade_type: 'call' as const,
  strike_price: 38000,
  expiry_date: '2026-02-13',
  quantity: 1,
  entry_price: 150,
  exit_price: 200,
  exit_date: '2026-01-20',
  iv_at_entry: null,
  memo: null,
  is_mini: false,
  playbook_id: null,
  playbook_compliance: null,
}

function mockAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  })
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createTrade', () => {
  it('returns validation error for invalid input', async () => {
    const result = await createTrade({ trade_date: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('returns auth error when not authenticated', async () => {
    mockUnauthenticated()
    const result = await createTrade(validCreateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('認証が必要です')
    }
  })

  it('inserts trade and returns success', async () => {
    mockAuthenticatedUser()
    mockInsert.mockResolvedValue({ error: null })

    const result = await createTrade(validCreateInput)
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('trades')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        trade_date: '2026-01-15',
        trade_type: 'call',
        strike_price: 38000,
        user_id: 'user-123',
        status: 'open',
        pnl: null, // no exit price
      }),
    )
  })

  it('sets status to closed when exit_price is provided', async () => {
    mockAuthenticatedUser()
    mockInsert.mockResolvedValue({ error: null })

    const input = { ...validCreateInput, exit_price: 200, exit_date: '2026-01-20' }
    await createTrade(input)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'closed',
        pnl: 50000, // (200 - 150) * 1 * 1000
      }),
    )
  })

  it('calculates PnL with mini multiplier', async () => {
    mockAuthenticatedUser()
    mockInsert.mockResolvedValue({ error: null })

    const input = { ...validCreateInput, exit_price: 200, exit_date: '2026-01-20', is_mini: true }
    await createTrade(input)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        pnl: 5000, // (200 - 150) * 1 * 100
        is_mini: true,
      }),
    )
  })

  it('returns DB error on insert failure', async () => {
    mockAuthenticatedUser()
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await createTrade(validCreateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB error')
    }
  })
})

describe('updateTrade', () => {
  it('returns error when id is empty', async () => {
    const result = await updateTrade('', validUpdateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('取引IDが指定されていません')
    }
  })

  it('returns validation error for invalid input', async () => {
    const result = await updateTrade('trade-1', { trade_date: '' })
    expect(result.success).toBe(false)
  })

  it('returns auth error when not authenticated', async () => {
    mockUnauthenticated()
    const result = await updateTrade('trade-1', validUpdateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('認証が必要です')
    }
  })

  it('updates trade and returns success', async () => {
    mockAuthenticatedUser()
    mockUpdateEq.mockResolvedValue({ error: null })

    const result = await updateTrade('trade-1', validUpdateInput)
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('trades')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        trade_date: '2026-01-15',
        status: 'closed',
        pnl: 50000,
      }),
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'trade-1')
  })

  it('returns DB error on update failure', async () => {
    mockAuthenticatedUser()
    mockUpdateEq.mockResolvedValue({ error: { message: 'update failed' } })

    const result = await updateTrade('trade-1', validUpdateInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('update failed')
    }
  })
})

describe('deleteTrade', () => {
  it('returns error when id is empty', async () => {
    const result = await deleteTrade('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('取引IDが指定されていません')
    }
  })

  it('returns auth error when not authenticated', async () => {
    mockUnauthenticated()
    const result = await deleteTrade('trade-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('認証が必要です')
    }
  })

  it('deletes trade and returns success', async () => {
    mockAuthenticatedUser()
    mockDeleteEq.mockResolvedValue({ error: null })

    const result = await deleteTrade('trade-1')
    expect(result).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('trades')
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'trade-1')
  })

  it('returns DB error on delete failure', async () => {
    mockAuthenticatedUser()
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const result = await deleteTrade('trade-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('delete failed')
    }
  })
})
