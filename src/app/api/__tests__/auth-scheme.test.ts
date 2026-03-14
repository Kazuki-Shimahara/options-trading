/**
 * API認証スキーム統一テスト
 *
 * 全APIルートが正しい認証方式を使用していることを検証する:
 * - ユーザー向けAPI: Supabase Auth (requireUserAuth)
 * - 内部API（cron等）: x-api-key (requireInternalAuth)
 * - 公開API（auth callback）: 認証なし
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock api-auth module
const mockRequireUserAuth = vi.fn()
const mockRequireInternalAuth = vi.fn()

vi.mock('@/lib/api-auth', () => ({
  requireUserAuth: (...args: unknown[]) => mockRequireUserAuth(...args),
  requireInternalAuth: (...args: unknown[]) => mockRequireInternalAuth(...args),
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

// Mock supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}))

// Mock csv-export
vi.mock('@/lib/csv-export', () => ({
  generateCsv: vi.fn(() => 'csv-data'),
}))

// Mock jquants
vi.mock('@/lib/jquants', () => ({
  getRefreshToken: vi.fn(),
  getIdToken: vi.fn(),
  fetchOptionPrices: vi.fn().mockResolvedValue([]),
}))

// Mock jquants-token
vi.mock('@/lib/jquants-token', () => ({
  saveTokens: vi.fn(),
  getStoredTokens: vi.fn(),
  getValidIdToken: vi.fn().mockResolvedValue('mock-token'),
}))

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}))

// Mock iv-collect
vi.mock('@/lib/iv-collect', () => ({
  collectIvData: vi.fn().mockResolvedValue({ inserted: 0 }),
}))

import { NextResponse } from 'next/server'

function createRequest(
  url: string,
  options: RequestInit = {},
): Request {
  return new Request(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
}

describe('ユーザー向けAPI: Supabase Auth必須', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('GET /api/trades/export は未認証で401を返す', async () => {
    mockRequireUserAuth.mockResolvedValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { GET } = await import('@/app/api/trades/export/route')
    const res = await GET()
    expect(mockRequireUserAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })

  it('POST /api/push/subscribe は未認証で401を返す', async () => {
    mockRequireUserAuth.mockResolvedValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { POST } = await import('@/app/api/push/subscribe/route')
    const req = createRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: 'https://example.com',
          keys: { p256dh: 'key1', auth: 'key2' },
        },
      }),
    })
    const res = await POST(req)
    expect(mockRequireUserAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/jquants は未認証で401を返す', async () => {
    mockRequireUserAuth.mockResolvedValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { POST } = await import('@/app/api/auth/jquants/route')
    const req = createRequest('http://localhost/api/auth/jquants', {
      method: 'POST',
      body: JSON.stringify({
        mailAddress: 'test@example.com',
        password: 'password',
      }),
    })
    const res = await POST(req)
    expect(mockRequireUserAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })

  it('GET /api/auth/jquants は未認証で401を返す', async () => {
    mockRequireUserAuth.mockResolvedValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { GET } = await import('@/app/api/auth/jquants/route')
    const res = await GET()
    expect(mockRequireUserAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })
})

describe('内部API: x-api-key必須', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('API_SECRET_KEY', 'test-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('POST /api/iv-data/collect はx-api-keyなしで401を返す', async () => {
    mockRequireInternalAuth.mockReturnValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { POST } = await import('@/app/api/iv-data/collect/route')
    const req = createRequest('http://localhost/api/iv-data/collect', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(mockRequireInternalAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })

  it('GET /api/iv-data/batch-collect はx-api-keyなしで401を返す', async () => {
    mockRequireInternalAuth.mockReturnValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { GET } = await import('@/app/api/iv-data/batch-collect/route')
    const req = createRequest('http://localhost/api/iv-data/batch-collect')
    const res = await GET(req)
    expect(mockRequireInternalAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })

  it('POST /api/push/send はx-api-keyなしで401を返す', async () => {
    mockRequireInternalAuth.mockReturnValue({
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const { POST } = await import('@/app/api/push/send/route')
    const req = createRequest('http://localhost/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'test', body: 'test' }),
    })
    const res = await POST(req)
    expect(mockRequireInternalAuth).toHaveBeenCalled()
    expect(res.status).toBe(401)
  })
})
