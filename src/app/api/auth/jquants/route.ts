/**
 * J-Quants 認証エンドポイント
 *
 * POST: メールアドレス/パスワードで初期トークン取得 → Supabaseに保存
 * GET: 現在のトークン状態を確認
 */

import { NextResponse } from 'next/server'
import { getRefreshToken, getIdToken, JQuantsApiError } from '@/lib/jquants'
import { saveTokens, getStoredTokens } from '@/lib/jquants-token'
import { requireUserAuth } from '@/lib/api-auth'

// リフレッシュトークンの有効期間（1週間）
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
// IDトークンの有効期間（24時間）
const ID_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000

/**
 * POST /api/auth/jquants
 *
 * リクエストボディ:
 * - mailAddress: string
 * - password: string
 *
 * メールアドレス/パスワードでJ-Quants APIに認証し、
 * 取得したトークンをSupabaseに保存する。
 */
export async function POST(request: Request) {
  const auth = await requireUserAuth()
  if (!auth.authenticated) return auth.response

  try {
    const body = (await request.json()) as {
      mailAddress?: string
      password?: string
    }

    const mailAddress = body.mailAddress || process.env.J_QUANTS_MAIL_ADDRESS
    const password = body.password || process.env.J_QUANTS_PASSWORD

    if (!mailAddress || !password) {
      return NextResponse.json(
        {
          error:
            'Mail address and password are required. Provide in request body or set J_QUANTS_MAIL_ADDRESS and J_QUANTS_PASSWORD environment variables.',
        },
        { status: 400 },
      )
    }

    // リフレッシュトークンを取得
    const refreshToken = await getRefreshToken(mailAddress, password)
    const refreshTokenExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_LIFETIME_MS,
    )

    // IDトークンを取得
    const idToken = await getIdToken(refreshToken)
    const idTokenExpiresAt = new Date(Date.now() + ID_TOKEN_LIFETIME_MS)

    // Supabaseに保存
    await saveTokens(
      refreshToken,
      idToken,
      refreshTokenExpiresAt,
      idTokenExpiresAt,
    )

    return NextResponse.json({
      success: true,
      message: 'J-Quants authentication successful. Tokens saved.',
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      idTokenExpiresAt: idTokenExpiresAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof JQuantsApiError) {
      return NextResponse.json(
        {
          error: `J-Quants API error: ${error.message}`,
          status: error.status,
          endpoint: error.endpoint,
        },
        { status: error.status },
      )
    }

    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/auth/jquants
 *
 * 現在のトークン状態を返す。
 * トークンの有効期限と、期限切れかどうかを確認できる。
 */
export async function GET() {
  const auth = await requireUserAuth()
  if (!auth.authenticated) return auth.response

  try {
    const stored = await getStoredTokens()

    if (!stored) {
      return NextResponse.json({
        authenticated: false,
        message:
          'No tokens found. POST to this endpoint to authenticate.',
      })
    }

    const now = new Date()
    const refreshExpiry = new Date(stored.refresh_token_expires_at)
    const idExpiry = stored.id_token_expires_at
      ? new Date(stored.id_token_expires_at)
      : null

    return NextResponse.json({
      authenticated: true,
      refreshToken: {
        expiresAt: stored.refresh_token_expires_at,
        isExpired: now >= refreshExpiry,
      },
      idToken: {
        exists: !!stored.id_token,
        expiresAt: stored.id_token_expires_at,
        isExpired: idExpiry ? now >= idExpiry : true,
      },
      updatedAt: stored.updated_at,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
