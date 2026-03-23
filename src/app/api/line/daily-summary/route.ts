import { NextResponse } from 'next/server'
import { requireInternalAuth } from '@/lib/api-auth'
import { getOpenTrades, getLatestIvRanks } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { sendLineFlexMessage } from '@/lib/line-notify'
import {
  buildPositionSummary,
  buildIvRankChange,
  buildUpcomingEvents,
  buildDailySummaryMessage,
} from '@/lib/daily-summary'
import { getEventsForYear } from '@/lib/events'
import type { IvRankData } from '@/lib/supabase'

/**
 * POST /api/line/daily-summary
 * 15:15以降にcronで呼び出される日次サマリーLINE通知
 * 認証: x-api-key ヘッダー
 */
export async function POST(request: Request) {
  const auth = requireInternalAuth(request)
  if (!auth.authenticated) return auth.response

  try {
    // オープンポジション取得
    const openTrades = await getOpenTrades()

    // 今日のIVランク取得
    const todayIvRanks = await getLatestIvRanks()

    // 前日のIVランク取得
    const yesterdayIvRanks = await getYesterdayIvRanks()

    // 翌日イベント取得
    const today = new Date()
    const events = getEventsForYear(today.getFullYear())
    const upcomingEvents = buildUpcomingEvents(events, today)

    // サマリー構築
    // 現在価格は最新のentry_priceを参考値として使用（簡易版）
    const currentPrice = openTrades.length > 0 ? openTrades[0].entry_price : 0
    const positions = buildPositionSummary(openTrades, currentPrice)
    const ivChange = buildIvRankChange(todayIvRanks, yesterdayIvRanks)
    const message = buildDailySummaryMessage(positions, ivChange, upcomingEvents)

    // LINE送信
    await sendLineFlexMessage(message)

    return NextResponse.json({
      success: true,
      positionCount: positions.length,
      upcomingEventCount: upcomingEvents.length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Daily summary error:', errorMessage)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 前日のIVランクを取得する
 * iv_historyテーブルから前日のデータを取得
 */
async function getYesterdayIvRanks(): Promise<IvRankData> {
  const result: IvRankData = { call_iv_rank: null, put_iv_rank: null }

  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: callData } = await supabase
      .from('iv_history')
      .select('iv_rank')
      .eq('option_type', 'call')
      .gte('recorded_at', yesterdayStr)
      .lt('recorded_at', todayStr)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (callData?.iv_rank != null) {
      result.call_iv_rank = Number(callData.iv_rank)
    }

    const { data: putData } = await supabase
      .from('iv_history')
      .select('iv_rank')
      .eq('option_type', 'put')
      .gte('recorded_at', yesterdayStr)
      .lt('recorded_at', todayStr)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (putData?.iv_rank != null) {
      result.put_iv_rank = Number(putData.iv_rank)
    }
  } catch {
    // iv_history table may not exist yet; return nulls
  }

  return result
}
