import type { Trade } from '@/types/database'

export interface PerformanceSummary {
  sharpeRatio: number
  maxDrawdown: number
  profitFactor: number
  kellyCriterion: number
  totalPnl: number
  tradeCount: number
  winRate: number
}

function getPnlValues(trades: Trade[]): number[] {
  return trades.filter((t) => t.pnl !== null).map((t) => t.pnl as number)
}

/**
 * Sharpe比（リスク調整後リターン）
 * = 平均リターン / リターンの標準偏差
 */
export function calculateSharpeRatio(trades: Trade[]): number {
  const pnls = getPnlValues(trades)
  if (pnls.length < 2) return 0

  const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length
  const variance =
    pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return 0
  return mean / stdDev
}

/**
 * 最大ドローダウン（MDD）
 * 累積損益のピークからの最大下落額
 */
export function calculateMaxDrawdown(trades: Trade[]): number {
  const pnls = getPnlValues(trades)
  if (pnls.length === 0) return 0

  let cumulative = 0
  let peak = 0
  let maxDD = 0

  for (const pnl of pnls) {
    cumulative += pnl
    if (cumulative > peak) peak = cumulative
    const drawdown = peak - cumulative
    if (drawdown > maxDD) maxDD = drawdown
  }

  return maxDD
}

/**
 * Profit Factor（総利益 ÷ 総損失の絶対値）
 */
export function calculateProfitFactor(trades: Trade[]): number {
  const pnls = getPnlValues(trades)
  if (pnls.length === 0) return 0

  const totalProfit = pnls.filter((p) => p > 0).reduce((s, v) => s + v, 0)
  const totalLoss = Math.abs(
    pnls.filter((p) => p < 0).reduce((s, v) => s + v, 0),
  )

  if (totalProfit === 0) return 0
  if (totalLoss === 0) return Infinity
  return totalProfit / totalLoss
}

/**
 * Kelly基準（最適ポジションサイズ比率）
 * Kelly% = W - (1 - W) / R
 * W = 勝率, R = 平均勝ち / 平均負け
 */
export function calculateKellyCriterion(trades: Trade[]): number {
  const pnls = getPnlValues(trades)
  if (pnls.length === 0) return 0

  const wins = pnls.filter((p) => p > 0)
  const losses = pnls.filter((p) => p < 0)

  if (wins.length === 0) return 0
  if (losses.length === 0) return 1

  const winRate = wins.length / pnls.length
  const avgWin = wins.reduce((s, v) => s + v, 0) / wins.length
  const avgLoss = Math.abs(losses.reduce((s, v) => s + v, 0) / losses.length)

  if (avgLoss === 0) return 1
  const wlRatio = avgWin / avgLoss
  const kelly = winRate - (1 - winRate) / wlRatio

  return Math.max(0, kelly)
}

export type PeriodType = 'monthly' | 'quarterly' | 'yearly'

/**
 * 期間別にトレードをフィルタ
 * period=monthly: year+periodValue(1-12)
 * period=quarterly: year+periodValue(1-4)
 * period=yearly: yearのみ
 */
export function filterTradesByPeriod(
  trades: Trade[],
  period: PeriodType,
  year: number,
  periodValue?: number,
): Trade[] {
  return trades.filter((t) => {
    const exitDate = t.exit_date
    if (!exitDate) return false

    const date = new Date(exitDate)
    const tradeYear = date.getFullYear()
    const tradeMonth = date.getMonth() + 1 // 1-based

    if (tradeYear !== year) return false

    if (period === 'monthly') {
      return tradeMonth === periodValue
    }
    if (period === 'quarterly') {
      const quarter = Math.ceil(tradeMonth / 3)
      return quarter === periodValue
    }
    // yearly
    return true
  })
}

/**
 * パフォーマンスサマリーを一括計算
 */
export function calculatePerformanceSummary(
  trades: Trade[],
): PerformanceSummary {
  const pnls = getPnlValues(trades)
  const totalPnl = pnls.reduce((s, v) => s + v, 0)
  const wins = pnls.filter((p) => p > 0).length
  const winRate = pnls.length > 0 ? wins / pnls.length : 0

  return {
    sharpeRatio: calculateSharpeRatio(trades),
    maxDrawdown: calculateMaxDrawdown(trades),
    profitFactor: calculateProfitFactor(trades),
    kellyCriterion: calculateKellyCriterion(trades),
    totalPnl,
    tradeCount: pnls.length,
    winRate,
  }
}
