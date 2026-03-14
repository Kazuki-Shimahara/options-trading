/**
 * API認証ヘルパー
 *
 * ユーザー向けAPI: Supabase Auth（Cookieベースセッション）
 * 内部API（cron等）: x-api-keyヘッダー
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AuthResult =
  | { authenticated: true; userId: string }
  | { authenticated: false; response: NextResponse }

/**
 * ユーザー向けAPIの認証
 * Supabase Authのセッション（Cookie）を検証し、ユーザーIDを返す
 */
export async function requireUserAuth(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    }
  }

  return { authenticated: true, userId: user.id }
}

/**
 * 内部API（cron等）の認証
 * x-api-keyヘッダーでAPI_SECRET_KEYを検証する
 */
export function requireInternalAuth(request: Request): AuthResult {
  const apiSecretKey = process.env.API_SECRET_KEY
  if (!apiSecretKey) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'API_SECRET_KEY is not configured' },
        { status: 401 },
      ),
    }
  }

  const providedKey = request.headers.get('x-api-key')
  if (providedKey !== apiSecretKey) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    }
  }

  return { authenticated: true, userId: 'internal' }
}
