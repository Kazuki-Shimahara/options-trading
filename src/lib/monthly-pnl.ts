import { DEFAULT_MULTIPLIER } from '@/lib/constants'
import type { Trade } from '@/types/database'

export interface MonthlyPnlSummary {
  /** 今月の確定損益合計 */
  totalPnl: number
  /** 今月の取引数（決済済み） */
  tradeCount: number
  /** 勝率（0〜1） */
  winRate: number
  /** 勝ち取引数 */
  winCount: number
  /** 含み損益合計（未決済ポジション） */
  unrealizedPnl: number
  /** 前月の確定損益合計 */
  prevMonthPnl: number
  /** 前月比（増減額） */
  monthOverMonthDiff: number
}

/**
 * 決済済み取引から月次サマリーを計算
 */
export function calculateMonthlyPnl(
  closedTrades: Trade[],
  prevMonthClosedTrades: Trade[],
  openTrades: Trade[],
  currentPrices?: Map<string, number>,
): MonthlyPnlSummary {
  // 今月の確定損益
  const totalPnl = closedTrades.reduce((sum, t) => {
    if (t.pnl !== null) return sum + t.pnl
    if (t.exit_price !== null) {
      return sum + (t.exit_price - t.entry_price) * t.quantity * DEFAULT_MULTIPLIER
    }
    return sum
  }, 0)

  const tradeCount = closedTrades.length
  const winCount = closedTrades.filter((t) => {
    if (t.pnl !== null) return t.pnl > 0
    if (t.exit_price !== null) {
      return (t.exit_price - t.entry_price) * t.quantity * DEFAULT_MULTIPLIER > 0
    }
    return false
  }).length
  const winRate = tradeCount > 0 ? winCount / tradeCount : 0

  // 含み損益（currentPricesがない場合は0）
  const unrealizedPnl = openTrades.reduce((sum, t) => {
    const currentPrice = currentPrices?.get(t.id)
    if (currentPrice !== undefined) {
      return sum + (currentPrice - t.entry_price) * t.quantity * DEFAULT_MULTIPLIER
    }
    return sum
  }, 0)

  // 前月の確定損益
  const prevMonthPnl = prevMonthClosedTrades.reduce((sum, t) => {
    if (t.pnl !== null) return sum + t.pnl
    if (t.exit_price !== null) {
      return sum + (t.exit_price - t.entry_price) * t.quantity * DEFAULT_MULTIPLIER
    }
    return sum
  }, 0)

  const monthOverMonthDiff = totalPnl - prevMonthPnl

  return {
    totalPnl,
    tradeCount,
    winRate,
    winCount,
    unrealizedPnl,
    prevMonthPnl,
    monthOverMonthDiff,
  }
}
