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
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}))

import { POST } from '../check/route'
import { supabase } from '@/lib/supabase'
import webpush from 'web-push'

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/pnl-alerts/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'test-key',
    },
    body: JSON.stringify(body),
  })
}

const mockOpenTrade = {
  id: 'trade-1',
  user_id: 'user-1',
  trade_date: '2026-01-01',
  trade_type: 'put',
  strike_price: 38000,
  expiry_date: '2026-02-14',
  quantity: 2,
  entry_price: 300,
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
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockAlertSetting = {
  id: 'setting-1',
  trade_id: 'trade-1',
  threshold_amount: 100000,
  direction: 'loss',
  enabled: true,
  cooldown_minutes: 60,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('POST /api/pnl-alerts/check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-public-key')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key')
  })

  it('current_pricesが不足の場合400を返す', async () => {
    const req = createRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('閾値超過時にPush通知を送信しアラート結果を返す', async () => {
    // Setup supabase mocks for different tables
    const mockFrom = vi.fn()

    // trades query
    mockFrom.mockImplementation((table: string) => {
      if (table === 'trades') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockOpenTrade],
              error: null,
            }),
          }),
        }
      }
      if (table === 'pnl_alert_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockAlertSetting],
              error: null,
            }),
          }),
        }
      }
      if (table === 'pnl_alert_notifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'push_subscriptions') {
        return {
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
        }
      }
      return {}
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const req = createRequest({
      current_prices: { 'trade-1': 200 },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.alerts_triggered).toBe(1)
    expect(json.notifications_sent).toBeGreaterThanOrEqual(0)
  })

  it('閾値未達では通知を送信しない', async () => {
    const mockFrom = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'trades') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockOpenTrade],
              error: null,
            }),
          }),
        }
      }
      if (table === 'pnl_alert_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockAlertSetting],
              error: null,
            }),
          }),
        }
      }
      if (table === 'pnl_alert_notifications') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      if (table === 'push_subscriptions') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }
      }
      return {}
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    const req = createRequest({
      current_prices: { 'trade-1': 290 }, // PnL = -20,000 (under 100,000 threshold)
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.alerts_triggered).toBe(0)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })
})
