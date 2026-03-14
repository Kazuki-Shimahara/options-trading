import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the route
vi.mock('@/lib/jquants-token', () => ({
  getValidIdToken: vi.fn(),
}))

vi.mock('@/lib/jquants', () => ({
  fetchOptionPrices: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { GET } from '../../iv-data/batch-collect/route'
import { getValidIdToken } from '@/lib/jquants-token'
import { fetchOptionPrices } from '@/lib/jquants'
import { supabase } from '@/lib/supabase'

const mockedGetValidIdToken = vi.mocked(getValidIdToken)
const mockedFetchOptionPrices = vi.mocked(fetchOptionPrices)
const mockedSupabase = vi.mocked(supabase)

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/iv-data/batch-collect', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/iv-data/batch-collect', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Set CRON_SECRET env var
    process.env.API_SECRET_KEY = 'test-secret-123'
  })

  it('x-api-keyなしのリクエストは401を返す', async () => {
    const request = createRequest()
    const response = await GET(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('不正なx-api-keyのリクエストは401を返す', async () => {
    const request = createRequest({
      'x-api-key': 'wrong-secret',
    })
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('正しいx-api-keyで認証が通る', async () => {
    // Setup mocks for successful flow
    mockedGetValidIdToken.mockResolvedValue('mock-id-token')
    mockedFetchOptionPrices.mockResolvedValue([
      {
        Date: '2026-03-11',
        Code: '130060018',
        WholeDayOpen: 500,
        WholeDayHigh: 520,
        WholeDayLow: 490,
        WholeDayClose: 510,
        Volume: 100,
        OpenInterest: 200,
        TurnoverValue: 5000000,
        ContractMonth: '2026-04',
        StrikePrice: 38000,
        PutCallDivision: '2', // Call
        ImpliedVolatility: 20.5,
        UnderlyingPrice: 38000,
        TheoreticalPrice: 510,
      },
    ])

    // Mock supabase select for historical data
    const selectMock = vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          { iv_value: 18.0, recorded_at: '2025-03-11' },
          { iv_value: 22.0, recorded_at: '2025-06-11' },
          { iv_value: 25.0, recorded_at: '2025-09-11' },
        ],
        error: null,
      }),
    })

    const insertMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })

    mockedSupabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'iv_history') {
        return {
          select: selectMock,
          insert: insertMock,
        }
      }
      return { select: vi.fn(), insert: vi.fn() }
    }) as ReturnType<typeof vi.fn>

    const request = createRequest({
      'x-api-key': 'test-secret-123',
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.atmIv).toBeDefined()
    expect(body.data.ivRank).toBeDefined()
  })

  it('J-Quants APIエラー時に500を返す', async () => {
    mockedGetValidIdToken.mockRejectedValue(
      new Error('J-Quants API error'),
    )

    const request = createRequest({
      'x-api-key': 'test-secret-123',
    })
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('API_SECRET_KEY環境変数が未設定の場合は401を返す', async () => {
    delete process.env.API_SECRET_KEY

    const request = createRequest({
      'x-api-key': 'test-secret-123',
    })
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('IVデータがない場合は適切にハンドリングする', async () => {
    mockedGetValidIdToken.mockResolvedValue('mock-id-token')
    mockedFetchOptionPrices.mockResolvedValue([])

    // Mock supabase for historical data query (no insert since atmIv is null)
    mockedSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }) as ReturnType<typeof vi.fn>

    const request = createRequest({
      'x-api-key': 'test-secret-123',
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.atmIv).toBeNull()
  })
})
