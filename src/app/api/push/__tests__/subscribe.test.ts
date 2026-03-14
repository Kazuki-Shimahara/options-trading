import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  requireUserAuth: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'test-user-id',
  }),
}))

// Mock supabase before importing route
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  },
}))

import { POST, DELETE } from '../subscribe/route'
import { supabase } from '@/lib/supabase'

function createRequest(method: string, body: unknown): Request {
  return new Request('http://localhost/api/push/subscribe', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as never)
  })

  it('購読情報をDBに保存する', async () => {
    const subscription = {
      endpoint: 'https://push.example.com/sub/123',
      keys: { p256dh: 'key1', auth: 'key2' },
    }

    const req = createRequest('POST', { subscription })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
  })

  it('subscriptionが不正な場合400を返す', async () => {
    const req = createRequest('POST', {})
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabase.from).mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: mockEq }),
    } as never)
  })

  it('endpointに一致する購読を削除する', async () => {
    const req = createRequest('DELETE', {
      endpoint: 'https://push.example.com/sub/123',
    })
    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
  })

  it('endpointがない場合400を返す', async () => {
    const req = createRequest('DELETE', {})
    const res = await DELETE(req)

    expect(res.status).toBe(400)
  })
})
