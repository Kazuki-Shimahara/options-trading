import { createClient } from '@supabase/supabase-js'
import type { Trade } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface IvRankData {
  call_iv_rank: number | null
  put_iv_rank: number | null
}

export async function getLatestIvRanks(): Promise<IvRankData> {
  const result: IvRankData = { call_iv_rank: null, put_iv_rank: null }

  try {
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

export async function getOpenTrades(): Promise<Trade[]> {
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
