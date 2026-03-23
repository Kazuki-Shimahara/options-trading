import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  requireUserAuth: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user-1',
  }),
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  },
}))

import { GET, POST, DELETE } from '../settings/route'
import { supabase } from '@/lib/supabase'

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL('http://localhost/api/pnl-alerts/settings')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new Request(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('GET /api/pnl-alerts/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('trade_idでアラート設定一覧を取得する', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'setting-1',
              trade_id: 'trade-1',
              threshold_amount: 100000,
              direction: 'loss',
              enabled: true,
              cooldown_minutes: 60,
            },
          ],
          error: null,
        }),
      }),
    } as never)

    const req = createRequest('GET', undefined, { trade_id: 'trade-1' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].trade_id).toBe('trade-1')
  })

  it('trade_idが指定されていない場合400を返す', async () => {
    const req = createRequest('GET')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/pnl-alerts/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('新しいアラート設定を作成する', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'setting-new',
              trade_id: 'trade-1',
              threshold_amount: 50000,
              direction: 'both',
              enabled: true,
              cooldown_minutes: 30,
            },
            error: null,
          }),
        }),
      }),
    } as never)

    const req = createRequest('POST', {
      trade_id: 'trade-1',
      threshold_amount: 50000,
      direction: 'both',
      cooldown_minutes: 30,
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.threshold_amount).toBe(50000)
  })

  it('必須フィールドが不足の場合400を返す', async () => {
    const req = createRequest('POST', { trade_id: 'trade-1' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('不正なdirectionの場合400を返す', async () => {
    const req = createRequest('POST', {
      trade_id: 'trade-1',
      threshold_amount: 50000,
      direction: 'invalid',
      cooldown_minutes: 30,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/pnl-alerts/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('アラート設定を削除する', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    } as never)

    const req = createRequest('DELETE', { id: 'setting-1' })
    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('idが指定されていない場合400を返す', async () => {
    const req = createRequest('DELETE', {})
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })
})
