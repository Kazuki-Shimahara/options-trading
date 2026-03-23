import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server supabase client
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockLimit = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockGetUser = vi.fn()

const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockGetUser },
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

function setupChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error })
  mockLimit.mockReturnValue({ single: mockSingle })
  mockOrder.mockReturnValue({ data, error, limit: mockLimit })
  mockEq.mockReturnValue({ data, error, order: mockOrder, single: mockSingle })
  mockSelect.mockReturnValue({ data, error, order: mockOrder, eq: mockEq, limit: mockLimit, single: mockSingle })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockInsert.mockReturnValue({ select: mockSelect })
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Server Actions for data access', () => {
  describe('getPlaybooksForSelect', () => {
    it('should be a server-side function that returns playbooks list', async () => {
      const { getPlaybooksForSelect } = await import('@/app/actions/playbooks')

      const mockPlaybooks = [
        { id: '1', name: 'Test Playbook', rules: [] },
        { id: '2', name: 'Another Playbook', rules: [{ id: 'r1', category: 'entry', description: 'test' }] },
      ]
      setupChain(mockPlaybooks)

      const result = await getPlaybooksForSelect()

      expect(result).toEqual(mockPlaybooks)
      expect(mockFrom).toHaveBeenCalledWith('playbooks')
    })

    it('should return empty array on error', async () => {
      const { getPlaybooksForSelect } = await import('@/app/actions/playbooks')

      setupChain(null, { message: 'error' })

      const result = await getPlaybooksForSelect()

      expect(result).toEqual([])
    })
  })

  describe('getTradeById', () => {
    it('should be a server-side function that returns a single trade', async () => {
      const { getTradeById } = await import('@/app/actions/trades')

      const mockTrade = {
        id: 'abc',
        trade_date: '2024-01-01',
        trade_type: 'call',
        strike_price: 38000,
        expiry_date: '2024-02-09',
        quantity: 1,
        entry_price: 150,
        exit_price: null,
        exit_date: null,
        pnl: null,
        iv_at_entry: 20,
        memo: null,
        status: 'open',
        defeat_tags: null,
        market_env_tags: null,
        entry_delta: null,
        entry_gamma: null,
        entry_theta: null,
        entry_vega: null,
        entry_iv_rank: null,
        entry_iv_hv_ratio: null,
        is_mini: false,
        playbook_id: null,
        playbook_compliance: null,
        confidence_level: null,
        emotion: null,
        user_id: 'u1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      setupChain(mockTrade)

      const result = await getTradeById('abc')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('abc')
      expect(mockFrom).toHaveBeenCalledWith('trades')
    })

    it('should return null when trade not found', async () => {
      const { getTradeById } = await import('@/app/actions/trades')

      setupChain(null, { message: 'not found' })

      const result = await getTradeById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getPlaybookById', () => {
    it('should be a server-side function that returns a single playbook', async () => {
      const { getPlaybookById } = await import('@/app/actions/playbooks')

      const mockPlaybook = {
        id: 'pb1',
        name: 'Test Playbook',
        rules: [{ id: 'r1', category: 'entry', description: 'test rule' }],
        user_id: 'u1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      setupChain(mockPlaybook)

      const result = await getPlaybookById('pb1')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('Test Playbook')
      expect(mockFrom).toHaveBeenCalledWith('playbooks')
    })

    it('should return null when playbook not found', async () => {
      const { getPlaybookById } = await import('@/app/actions/playbooks')

      setupChain(null, { message: 'not found' })

      const result = await getPlaybookById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('loadUserPreferences / saveUserPreferences', () => {
    it('loadUserPreferences should be a server-side function', async () => {
      const { loadUserPreferences } = await import('@/app/actions/settings')

      setupChain({
        id: 'pref1',
        trading_style: 'buy_focused',
        user_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      })

      const result = await loadUserPreferences()

      expect(result).not.toBeNull()
      expect(result!.trading_style).toBe('buy_focused')
    })

    it('loadUserPreferences should return null when no preferences', async () => {
      const { loadUserPreferences } = await import('@/app/actions/settings')

      setupChain(null, { message: 'no rows' })

      const result = await loadUserPreferences()

      expect(result).toBeNull()
    })

    it('saveUserPreferences should update existing preference', async () => {
      const { saveUserPreferences } = await import('@/app/actions/settings')

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      })
      setupChain(null)

      const result = await saveUserPreferences('pref1', 'sell_focused')

      expect(result.success).toBe(true)
    })

    it('saveUserPreferences should create new preference when no id', async () => {
      const { saveUserPreferences } = await import('@/app/actions/settings')

      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      })

      const mockData = { id: 'new-pref', trading_style: 'sell_focused' }
      setupChain(mockData)

      const result = await saveUserPreferences(null, 'sell_focused')

      expect(result.success).toBe(true)
    })
  })
})

describe('No direct browser Supabase calls in page components', () => {
  it('supabase.ts should not export getOpenTrades (moved to supabase-server.ts)', async () => {
    // Read the source file and check exports rather than importing (avoids env var issues)
    const fs = await import('fs')
    const path = await import('path')
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../lib/supabase.ts'),
      'utf-8',
    )
    expect(content).not.toContain('export async function getOpenTrades')
    expect(content).not.toContain('export async function getLatestIvRanks')
  })

  it('supabase-server.ts should export getOpenTrades', async () => {
    const serverModule = await import('@/lib/supabase-server')
    expect(serverModule).toHaveProperty('getOpenTrades')
  })
})
