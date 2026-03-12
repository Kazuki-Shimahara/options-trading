import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  })),
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

describe('Supabase Auth クライアント', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  it('createBrowserSupabaseClient がブラウザ用クライアントを返す', async () => {
    const { createBrowserSupabaseClient } = await import('@/lib/supabase/client')
    const client = createBrowserSupabaseClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })

  it('ブラウザクライアントが auth メソッドを持つ', async () => {
    const { createBrowserSupabaseClient } = await import('@/lib/supabase/client')
    const client = createBrowserSupabaseClient()
    expect(client.auth.signInWithPassword).toBeDefined()
    expect(client.auth.signUp).toBeDefined()
    expect(client.auth.signOut).toBeDefined()
  })
})

describe('認証ヘルパー', () => {
  it('PUBLIC_PATHS に認証不要なパスが含まれる', async () => {
    const { PUBLIC_PATHS } = await import('@/lib/supabase/auth-config')
    expect(PUBLIC_PATHS).toContain('/auth/login')
    expect(PUBLIC_PATHS).toContain('/auth/signup')
    expect(PUBLIC_PATHS).toContain('/auth/callback')
  })

  it('isPublicPath が公開パスを正しく判定する', async () => {
    const { isPublicPath } = await import('@/lib/supabase/auth-config')
    expect(isPublicPath('/auth/login')).toBe(true)
    expect(isPublicPath('/auth/signup')).toBe(true)
    expect(isPublicPath('/trades')).toBe(false)
    expect(isPublicPath('/')).toBe(false)
  })
})
