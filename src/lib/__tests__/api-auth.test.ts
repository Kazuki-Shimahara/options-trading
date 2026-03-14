import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase/server
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

import { requireUserAuth, requireInternalAuth } from '@/lib/api-auth'

describe('requireUserAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('認証済みユーザーのuserIdを返す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })

    const result = await requireUserAuth()
    expect(result.authenticated).toBe(true)
    if (result.authenticated) {
      expect(result.userId).toBe('user-123')
    }
  })

  it('未認証の場合401を返す', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    })

    const result = await requireUserAuth()
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) {
      expect(result.response.status).toBe(401)
    }
  })
})

describe('requireInternalAuth', () => {
  beforeEach(() => {
    vi.stubEnv('API_SECRET_KEY', 'test-secret-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('正しいx-api-keyで認証が通る', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-api-key': 'test-secret-key' },
    })

    const result = requireInternalAuth(request)
    expect(result.authenticated).toBe(true)
  })

  it('不正なx-api-keyで401を返す', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-api-key': 'wrong-key' },
    })

    const result = requireInternalAuth(request)
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) {
      expect(result.response.status).toBe(401)
    }
  })

  it('x-api-keyヘッダーなしで401を返す', () => {
    const request = new Request('http://localhost/api/test')

    const result = requireInternalAuth(request)
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) {
      expect(result.response.status).toBe(401)
    }
  })

  it('API_SECRET_KEY未設定で401を返す', () => {
    vi.unstubAllEnvs()
    delete process.env.API_SECRET_KEY

    const request = new Request('http://localhost/api/test', {
      headers: { 'x-api-key': 'some-key' },
    })

    const result = requireInternalAuth(request)
    expect(result.authenticated).toBe(false)
    if (!result.authenticated) {
      expect(result.response.status).toBe(401)
    }
  })
})
