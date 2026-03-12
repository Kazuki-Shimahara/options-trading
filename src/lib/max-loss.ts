import type { Trade } from '@/types/database'

export type PositionSide = 'buy' | 'sell'

const MULTIPLIER = 1000
const SHOCK_RATE = 0.1 // ±10%

/**
 * 単一ポジションの最大損失額を計算する
 *
 * 買いポジション: プレミアム全額 = entry_price * quantity * 1000
 * 売りポジション: strike_price * 10% * quantity * 1000 - プレミアム受取額（最低0）
 */
export function calculateMaxLoss(trade: Trade, side: PositionSide = 'buy'): number {
  if (side === 'buy') {
    return trade.entry_price * trade.quantity * MULTIPLIER
  }

  // 売りポジション: ±10%変動時の損失からプレミアム受取分を差し引く
  const shockLoss = trade.strike_price * SHOCK_RATE * trade.quantity * MULTIPLIER
  const premiumReceived = trade.entry_price * trade.quantity * MULTIPLIER
  return Math.max(0, shockLoss - premiumReceived)
}

/**
 * 複数ポジションの合計最大損失を計算する
 * 現在のスキーマにはbuy/sell区別がないため、全て買いポジションとして計算
 */
export function calculateTotalMaxLoss(trades: Trade[], side: PositionSide = 'buy'): number {
  return trades.reduce((sum, trade) => sum + calculateMaxLoss(trade, side), 0)
}
