import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Trade } from '@/types/database'

export interface IvRankData {
  call_iv_rank: number | null
  put_iv_rank: number | null
}

export async function getLatestIvRanks(): Promise<IvRankData> {
  const result: IvRankData = { call_iv_rank: null, put_iv_rank: null }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: callData } = await supabase
      .from('iv_history')
      .select('iv_rank, option_type')
      .eq('option_type', 'call')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (callData && callData.iv_rank !== null) {
      result.call_iv_rank = Number(callData.iv_rank)
    }

    const { data: putData } = await supabase
      .from('iv_history')
      .select('iv_rank, option_type')
      .eq('option_type', 'put')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (putData && putData.iv_rank !== null) {
      result.put_iv_rank = Number(putData.iv_rank)
    }
  } catch {
    // iv_history table may not exist yet; return nulls
  }

  return result
}

export async function getClosedTradesInMonth(year: number, month: number): Promise<Trade[]> {
  const supabase = await createServerSupabaseClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .gte('exit_date', startDate)
    .lt('exit_date', endDate)
    .order('exit_date', { ascending: false })

  if (error) {
    console.error('Failed to fetch closed trades:', error)
    return []
  }
  return (data ?? []) as Trade[]
}

export async function getOpenTrades(): Promise<Trade[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'open')
    .order('trade_date', { ascending: false })

  if (error) {
    console.error('Failed to fetch open trades:', error)
    return []
  }
  return (data ?? []) as Trade[]
}
