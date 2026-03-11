'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { calculatePnl } from '@/lib/trade'
import type { TradeType } from '@/types/database'

export type TradeActionResult =
  | { success: true }
  | { success: false; error: string }

interface CreateTradeInput {
  trade_date: string
  trade_type: TradeType
  strike_price: number
  expiry_date: string
  quantity: number
  entry_price: number
  exit_price: number | null
  exit_date: string | null
  iv_at_entry: number | null
  memo: string | null
  entry_delta: number | null
  entry_gamma: number | null
  entry_theta: number | null
  entry_vega: number | null
}

interface UpdateTradeInput {
  trade_date: string
  trade_type: TradeType
  strike_price: number
  expiry_date: string
  quantity: number
  entry_price: number
  exit_price: number | null
  exit_date: string | null
  iv_at_entry: number | null
  memo: string | null
}

function validateTradeInput(data: CreateTradeInput | UpdateTradeInput): string | null {
  if (!data.trade_date) return '取引日は必須です'
  if (!data.trade_type || !['call', 'put'].includes(data.trade_type)) return '種別はcallまたはputを指定してください'
  if (!data.strike_price || data.strike_price <= 0) return '権利行使価格は正の数を指定してください'
  if (!data.expiry_date) return '限月（SQ日）は必須です'
  if (!data.quantity || data.quantity < 1) return '枚数は1以上を指定してください'
  if (data.entry_price == null || data.entry_price < 0) return '購入価格は0以上を指定してください'
  return null
}

export async function createTrade(data: CreateTradeInput): Promise<TradeActionResult> {
  const validationError = validateTradeInput(data)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const pnl = calculatePnl(data.exit_price, data.entry_price, data.quantity)

  const { error } = await supabase.from('trades').insert({
    trade_date: data.trade_date,
    trade_type: data.trade_type,
    strike_price: data.strike_price,
    expiry_date: data.expiry_date,
    quantity: data.quantity,
    entry_price: data.entry_price,
    exit_price: data.exit_price,
    exit_date: data.exit_date,
    pnl,
    iv_at_entry: data.iv_at_entry,
    memo: data.memo,
    status: data.exit_price !== null ? 'closed' : 'open',
    defeat_tags: null,
    user_id: null,
    entry_delta: data.entry_delta,
    entry_gamma: data.entry_gamma,
    entry_theta: data.entry_theta,
    entry_vega: data.entry_vega,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/trades')
  return { success: true }
}

export async function updateTrade(id: string, data: UpdateTradeInput): Promise<TradeActionResult> {
  if (!id) {
    return { success: false, error: '取引IDが指定されていません' }
  }

  const validationError = validateTradeInput(data)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const pnl = calculatePnl(data.exit_price, data.entry_price, data.quantity)

  const { error } = await supabase
    .from('trades')
    .update({
      trade_date: data.trade_date,
      trade_type: data.trade_type,
      strike_price: data.strike_price,
      expiry_date: data.expiry_date,
      quantity: data.quantity,
      entry_price: data.entry_price,
      exit_price: data.exit_price,
      exit_date: data.exit_date,
      pnl,
      iv_at_entry: data.iv_at_entry,
      memo: data.memo,
      status: data.exit_price !== null ? 'closed' : 'open',
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/trades')
  revalidatePath(`/trades/${id}`)
  return { success: true }
}

export async function deleteTrade(id: string): Promise<TradeActionResult> {
  if (!id) {
    return { success: false, error: '取引IDが指定されていません' }
  }

  const { error } = await supabase.from('trades').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/trades')
  return { success: true }
}
