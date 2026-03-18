import { MULTIPLIER_STANDARD, MULTIPLIER_MINI } from './constants'
import type { Trade } from './trade-schema'

export interface PayoffPosition {
  trade_type: 'call' | 'put'
  strike_price: number
  entry_price: number
  quantity: number
  side: 'buy' | 'sell'
  is_mini: boolean
}

export interface PayoffDataPoint {
  price: number
  payoff: number
  positions: number[]
}

function getMultiplier(isMini: boolean): number {
  return isMini ? MULTIPLIER_MINI : MULTIPLIER_STANDARD
}

/**
 * 単一ポジションの満期ペイオフを計算する
 */
export function calculatePositionPayoff(
  position: PayoffPosition,
  underlyingPrice: number,
): number {
  const multiplier = getMultiplier(position.is_mini)
  const { trade_type, strike_price, entry_price, quantity, side } = position
  const direction = side === 'buy' ? 1 : -1

  let intrinsicValue: number
  if (trade_type === 'call') {
    intrinsicValue = Math.max(0, underlyingPrice - strike_price)
  } else {
    intrinsicValue = Math.max(0, strike_price - underlyingPrice)
  }

  const payoff = (intrinsicValue - entry_price) * direction * quantity * multiplier
  return payoff || 0 // Normalize -0 to 0
}

/**
 * 複合ポジションの合成ペイオフを計算する
 */
export function calculateCombinedPayoff(
  positions: PayoffPosition[],
  prices: number[],
): PayoffDataPoint[] {
  return prices.map((price) => {
    const positionPayoffs = positions.map((pos) =>
      calculatePositionPayoff(pos, price),
    )
    const totalPayoff = positionPayoffs.reduce((sum, p) => sum + p, 0)
    return {
      price,
      payoff: totalPayoff,
      positions: positionPayoffs,
    }
  })
}

/**
 * ブレークイーブンポイント（損益分岐点）を探す
 * payoffが符号を変える地点を線形補間で求める
 */
export function findBreakevenPoints(data: PayoffDataPoint[]): number[] {
  const breakevens: number[] = []
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1]
    const curr = data[i]
    // Detect sign change (strict on one side to avoid duplicate detection)
    if (
      (prev.payoff < 0 && curr.payoff >= 0) ||
      (prev.payoff > 0 && curr.payoff <= 0)
    ) {
      if (curr.payoff === 0) {
        breakevens.push(curr.price)
      } else if (prev.payoff === 0) {
        breakevens.push(prev.price)
      } else {
        // Linear interpolation
        const ratio = Math.abs(prev.payoff) / (Math.abs(prev.payoff) + Math.abs(curr.payoff))
        const breakevenPrice = prev.price + ratio * (curr.price - prev.price)
        breakevens.push(breakevenPrice)
      }
    }
  }
  return breakevens
}

/**
 * 最大利益を見つける
 */
export function findMaxProfit(data: PayoffDataPoint[]): { price: number; value: number } {
  let max = data[0]
  for (const point of data) {
    if (point.payoff > max.payoff) {
      max = point
    }
  }
  return { price: max.price, value: max.payoff }
}

/**
 * 最大損失を見つける
 */
export function findMaxLoss(data: PayoffDataPoint[]): { price: number; value: number } {
  let min = data[0]
  for (const point of data) {
    if (point.payoff < min.payoff) {
      min = point
    }
  }
  return { price: min.price, value: min.payoff }
}

/**
 * 原資産価格のレンジを自動生成する
 * ストライク価格を中心に±20%の範囲を200ステップで生成
 */
export function generatePriceRange(
  positions: PayoffPosition[],
  underlyingPrice?: number,
): number[] {
  const strikes = positions.map((p) => p.strike_price)
  const minStrike = Math.min(...strikes)
  const maxStrike = Math.max(...strikes)
  const center = underlyingPrice ?? (minStrike + maxStrike) / 2
  const spread = maxStrike - minStrike
  const margin = Math.max(spread * 0.5, center * 0.2)

  const rangeMin = Math.max(0, Math.min(minStrike, center) - margin)
  const rangeMax = Math.max(maxStrike, center) + margin
  const step = (rangeMax - rangeMin) / 200

  const prices: number[] = []
  for (let p = rangeMin; p <= rangeMax; p += step) {
    prices.push(Math.round(p))
  }
  return prices
}

/**
 * Trade配列からPayoffPosition配列に変換する
 * 現在のスキーマにはbuy/sell区別がないため、デフォルトで買いポジションとして扱う
 */
export function tradesToPayoffPositions(
  trades: Trade[],
  defaultSide: 'buy' | 'sell' = 'buy',
): PayoffPosition[] {
  return trades.map((trade) => ({
    trade_type: trade.trade_type,
    strike_price: trade.strike_price,
    entry_price: trade.entry_price,
    quantity: trade.quantity,
    side: defaultSide,
    is_mini: trade.is_mini,
  }))
}
