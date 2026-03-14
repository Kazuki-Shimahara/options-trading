/**
 * バッチ処理APIルート - IVデータの定期取得
 *
 * 外部cronサービス（cron-job.org等）から定期的に呼び出される。
 * 取得タイミング: 日中クローズ（15:15 JST）/ 夜間クローズ（翌6:00 JST）
 *
 * 認証: x-api-key ヘッダーで API_SECRET_KEY を検証
 *
 * 処理フロー:
 * 1. API_SECRET_KEY で認証（x-api-keyヘッダー）
 * 2. J-Quants APIからオプション価格（IV含む）を取得
 * 3. ATM IVを算出
 * 4. iv_history テーブルに蓄積
 * 5. 過去1年のIVデータからIVランクを計算
 * 6. シグナル判定
 */

import { NextResponse } from 'next/server'
import { getValidIdToken } from '@/lib/jquants-token'
import { fetchOptionPrices, type JQuantsOptionPrice } from '@/lib/jquants'
import { supabase } from '@/lib/supabase'
import { calculateIvRank, calculateIvPercentile } from '@/lib/iv-calculations'
import { requireInternalAuth } from '@/lib/api-auth'

/**
 * ATM（At The Money）のIVを算出する
 *
 * 原資産価格に最も近い行使価格のコールとプットのIVを平均する。
 */
function calculateAtmIv(options: JQuantsOptionPrice[]): number | null {
  // IV が存在し、原資産価格が取得できるオプションのみフィルタ
  const withIv = options.filter(
    (o) => o.ImpliedVolatility != null && o.UnderlyingPrice != null,
  )

  if (withIv.length === 0) return null

  const underlyingPrice = withIv[0].UnderlyingPrice!

  // 行使価格が原資産価格に最も近いものを見つける
  let closestStrike = withIv[0].StrikePrice
  let minDiff = Math.abs(closestStrike - underlyingPrice)

  for (const opt of withIv) {
    const diff = Math.abs(opt.StrikePrice - underlyingPrice)
    if (diff < minDiff) {
      minDiff = diff
      closestStrike = opt.StrikePrice
    }
  }

  // ATM行使価格のオプションのIVを収集
  const atmOptions = withIv.filter((o) => o.StrikePrice === closestStrike)
  if (atmOptions.length === 0) return null

  const avgIv =
    atmOptions.reduce((sum, o) => sum + o.ImpliedVolatility!, 0) /
    atmOptions.length

  return Math.round(avgIv * 100) / 100
}

export async function GET(request: Request): Promise<NextResponse> {
  // 1. API_SECRET_KEY 認証（x-api-keyヘッダー）
  const auth = requireInternalAuth(request)
  if (!auth.authenticated) return auth.response

  try {
    // 2. J-Quants APIからオプション価格データを取得
    const idToken = await getValidIdToken()
    const options = await fetchOptionPrices(idToken)

    // 3. ATM IVを算出
    const atmIv = calculateAtmIv(options)

    const now = new Date().toISOString()

    // 4. iv_history テーブルに蓄積（ATM IVがある場合のみ）
    if (atmIv !== null) {
      const { error: insertError } = await supabase
        .from('iv_history')
        .insert({
          iv_value: atmIv,
          recorded_at: now,
        })

      if (insertError) {
        console.error('Failed to insert IV history:', insertError)
        return NextResponse.json(
          { error: `Failed to store IV data: ${insertError.message}` },
          { status: 500 },
        )
      }
    }

    // 5. 過去1年のIVデータを取得してIVランクを計算
    const { data: historicalData, error: historyError } = await supabase
      .from('iv_history')
      .select('iv_value, recorded_at')
      .order('recorded_at', { ascending: true })

    if (historyError) {
      console.error('Failed to fetch IV history:', historyError)
    }

    const historicalIvs = (historicalData ?? []).map(
      (row: { iv_value: number }) => row.iv_value,
    )

    let ivRank: number | null = null
    let ivPercentile: number | null = null
    let signal: string | null = null

    if (atmIv !== null && historicalIvs.length > 0) {
      const minIv = Math.min(...historicalIvs)
      const maxIv = Math.max(...historicalIvs)

      ivRank = calculateIvRank(atmIv, minIv, maxIv)
      ivPercentile = calculateIvPercentile(atmIv, historicalIvs)

      // 6. シグナル判定
      if (ivRank <= 25) {
        signal = 'BUY' // IV低水準 → 買い好機
      } else if (ivRank >= 75) {
        signal = 'SELL' // IV高水準 → 売り好機
      } else {
        signal = 'NEUTRAL'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        atmIv,
        ivRank,
        ivPercentile,
        signal,
        optionsCount: options.length,
        recordedAt: now,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Batch collect error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
