import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api-auth
vi.mock('@/lib/api-auth', () => ({
  requireInternalAuth: vi.fn().mockReturnValue({
    authenticated: true,
    userId: 'internal',
  }),
}))

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  },
}))

import { POST } from '../send/route'
import { supabase } from '@/lib/supabase'
import webpush from 'web-push'

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/push/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key')

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            endpoint: 'https://push.example.com/sub/1',
            p256dh: 'key1',
            auth: 'auth1',
          },
        ],
        error: null,
      }),
    } as never)
  })

  it('全購読者に通知を送信する', async () => {
    const req = createRequest({
      title: 'IVシグナル',
      body: 'IVランクが80%を超えました',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.sent).toBe(1)
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
  })

  it('titleが不足の場合400を返す', async () => {
    const req = createRequest({ body: 'test' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('bodyが不足の場合400を返す', async () => {
    const req = createRequest({ title: 'test' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})
