/**
 * IV データ蓄積 API エンドポイント
 *
 * POST /api/iv-data/collect
 * J-Quants APIからATM周辺のオプションIVデータを取得し、
 * iv_historyテーブルに蓄積する。
 *
 * リクエストボディ（任意）:
 * - date: string (YYYY-MM-DD形式。省略時は直近営業日)
 *
 * 認証: API_SECRET_KEY ヘッダーで簡易認証（cronジョブからの呼び出し想定）
 */

import { NextResponse } from 'next/server'
import { collectIvData } from '@/lib/iv-collect'
import { requireInternalAuth } from '@/lib/api-auth'

export async function POST(request: Request) {
  const auth = requireInternalAuth(request)
  if (!auth.authenticated) return auth.response

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string
    }

    const result = await collectIvData(body.date)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
