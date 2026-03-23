import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before imports
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
  },
  getOpenTrades: vi.fn().mockResolvedValue([]),
  getLatestIvRanks: vi.fn().mockResolvedValue({ call_iv_rank: 50, put_iv_rank: 55 }),
}))

vi.mock('@/lib/line-notify', () => ({
  sendLineFlexMessage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/events', () => ({
  getEventsForYear: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/api-auth', () => ({
  requireInternalAuth: vi.fn().mockReturnValue({ authenticated: true, userId: 'internal' }),
}))

import { POST } from '../route'
import { getOpenTrades, getLatestIvRanks } from '@/lib/supabase'
import { requireInternalAuth } from '@/lib/api-auth'

describe('POST /api/line/daily-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireInternalAuth).mockReturnValue({ authenticated: true, userId: 'internal' })
  })

  it('認証が失敗した場合401を返す', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    vi.mocked(requireInternalAuth).mockReturnValue({
      authenticated: false,
      response: mockResponse as never,
    })

    const request = new Request('http://localhost/api/line/daily-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('正常にサマリーを送信する', async () => {
    vi.mocked(getOpenTrades).mockResolvedValue([])
    vi.mocked(getLatestIvRanks).mockResolvedValue({ call_iv_rank: 50, put_iv_rank: 55 })

    const request = new Request('http://localhost/api/line/daily-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-key',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })
})
