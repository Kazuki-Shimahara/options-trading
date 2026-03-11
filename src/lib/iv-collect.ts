/**
 * IV データ蓄積ロジック
 *
 * J-Quants APIから取得したオプション価格データを
 * ATM周辺でフィルタし、iv_historyテーブルに蓄積する。
 */

import type { JQuantsOptionPrice } from './jquants'
import { fetchOptionPrices } from './jquants'
import { getValidIdToken } from './jquants-token'
import { supabase } from './supabase'

// ATM周辺の範囲（±2000円）
const ATM_RANGE = 2000

export interface IvHistoryInsert {
  recorded_at: string
  underlying_price: number
  strike_price: number
  expiry_date: string
  option_type: 'call' | 'put'
  iv: number
  data_source: string
}

export interface CollectIvDataResult {
  savedCount: number
  fetchedCount: number
  filteredCount: number
}

/**
 * ATM±2000円以内かつIV・原資産価格が有効なオプションを抽出する
 */
export function filterAtmOptions(
  options: JQuantsOptionPrice[],
): JQuantsOptionPrice[] {
  return options.filter((opt) => {
    if (opt.UnderlyingPrice == null || opt.ImpliedVolatility == null) {
      return false
    }
    const distance = Math.abs(opt.StrikePrice - opt.UnderlyingPrice)
    return distance <= ATM_RANGE
  })
}

/**
 * J-Quantsオプション価格データからiv_historyレコードを構築する
 */
export function buildIvHistoryRecords(
  options: JQuantsOptionPrice[],
): IvHistoryInsert[] {
  const now = new Date().toISOString()

  return options.map((opt) => {
    const optionType = opt.PutCallDivision === '1' ? 'put' : 'call'

    // ContractMonth "2026-04" → "2026-04-01" (月初を仮の限月日とする)
    const expiryDate = `${opt.ContractMonth}-01`

    return {
      recorded_at: now,
      underlying_price: opt.UnderlyingPrice!,
      strike_price: opt.StrikePrice,
      expiry_date: expiryDate,
      option_type: optionType,
      iv: opt.ImpliedVolatility!,
      data_source: 'j-quants',
    }
  })
}

/**
 * J-Quants APIからIVデータを取得し、iv_historyテーブルに蓄積する
 *
 * @param date - 取得日（YYYY-MM-DD形式）。省略時は直近営業日
 * @returns 蓄積結果
 */
export async function collectIvData(
  date?: string,
): Promise<CollectIvDataResult> {
  const idToken = await getValidIdToken()
  const allOptions = await fetchOptionPrices(idToken, date)

  const atmOptions = filterAtmOptions(allOptions)

  if (atmOptions.length === 0) {
    return { savedCount: 0, fetchedCount: allOptions.length, filteredCount: 0 }
  }

  const records = buildIvHistoryRecords(atmOptions)

  const { error } = await supabase.from('iv_history').insert(records)

  if (error) {
    throw new Error(`Failed to save IV data: ${error.message}`)
  }

  return {
    savedCount: records.length,
    fetchedCount: allOptions.length,
    filteredCount: atmOptions.length,
  }
}
