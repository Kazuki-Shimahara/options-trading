import type { Trade } from '@/types/database'
import { DEFAULT_MULTIPLIER } from './constants'

export type PositionSide = 'buy' | 'sell'

const SHOCK_RATE = 0.1 // ±10%

/**
 * 単一ポジションの最大損失額を計算する
 *
 * 買いポジション: プレミアム全額 = entry_price * quantity * multiplier
 * 売りポジション: strike_price * 10% * quantity * multiplier - プレミアム受取額（最低0）
 *
 * @param multiplier - 取引乗数（通常: 1000, ミニ: 100）
 */
export function calculateMaxLoss(
  trade: Trade,
  side: PositionSide = 'buy',
  multiplier: number = DEFAULT_MULTIPLIER
): number {
  if (side === 'buy') {
    return trade.entry_price * trade.quantity * multiplier
  }

  // 売りポジション: ±10%変動時の損失からプレミアム受取分を差し引く
  const shockLoss = trade.strike_price * SHOCK_RATE * trade.quantity * multiplier
  const premiumReceived = trade.entry_price * trade.quantity * multiplier
  return Math.max(0, shockLoss - premiumReceived)
}

/**
 * 複数ポジションの合計最大損失を計算する
 * 現在のスキーマにはbuy/sell区別がないため、全て買いポジションとして計算
 *
 * @param multiplier - 取引乗数（通常: 1000, ミニ: 100）
 */
export function calculateTotalMaxLoss(
  trades: Trade[],
  side: PositionSide = 'buy',
  multiplier: number = DEFAULT_MULTIPLIER
): number {
  return trades.reduce((sum, trade) => sum + calculateMaxLoss(trade, side, multiplier), 0)
}
