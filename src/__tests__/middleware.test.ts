import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  })),
}))

// Mock auth-config
vi.mock('@/lib/supabase/auth-config', () => ({
  isPublicPath: vi.fn(() => false),
}))

describe('middleware SKIP_AUTH', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('development環境でSKIP_AUTH=trueなら認証をスキップする', async () => {
    vi.stubEnv('SKIP_AUTH', 'true')
    vi.stubEnv('NODE_ENV', 'development')

    const { middleware } = await import('@/middleware')
    const request = new NextRequest(new URL('http://localhost:3000/trades'))
    const response = await middleware(request)

    // Should pass through without redirect
    expect(response.status).toBe(200)
  })

  it('production環境でSKIP_AUTH=trueでも認証をスキップしない', async () => {
    vi.stubEnv('SKIP_AUTH', 'true')
    vi.stubEnv('NODE_ENV', 'production')

    // Mock getUser to return no user (unauthenticated)
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const { middleware } = await import('@/middleware')
    const request = new NextRequest(new URL('http://localhost:3000/trades'))
    const response = await middleware(request)

    // Should redirect to login since auth is NOT skipped in production
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
  })

  it('SKIP_AUTH未設定なら通常の認証フローを実行する', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as any)

    const { middleware } = await import('@/middleware')
    const request = new NextRequest(new URL('http://localhost:3000/trades'))
    const response = await middleware(request)

    // Should redirect to login
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/login')
  })
})
