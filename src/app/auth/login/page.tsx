'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#00d4aa] rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-black text-xl font-bold">N</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-2">ログイン</h1>
          <p className="text-xs text-[#666] mt-1">NK225 Options</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 rounded-lg px-3 py-2.5 text-sm text-[#ff6b6b]">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-[10px] font-medium text-[#00d4aa]/70 mb-1 uppercase tracking-wider">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-white placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa]"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[10px] font-medium text-[#00d4aa]/70 mb-1 uppercase tracking-wider">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-white placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa]"
              placeholder="6文字以上"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#00d4aa] hover:bg-[#00c49a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#555]">
          アカウントをお持ちでない方は{' '}
          <Link href="/auth/signup" className="text-[#00d4aa] hover:opacity-80">
            新規登録
          </Link>
        </p>
      </div>
    </main>
  )
}
