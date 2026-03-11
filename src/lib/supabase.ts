import { createClient } from '@supabase/supabase-js'
import type { Trade } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
