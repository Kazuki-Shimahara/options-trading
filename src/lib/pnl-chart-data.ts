import type { Trade } from '@/types/database'
import { calculatePnl } from './trade'

export interface PnlChartDataPoint {
  date: string
  daily: number
  cumulative: number
}

export function buildPnlChartData(trades: Trade[]): PnlChartDataPoint[] {
  const closed = trades.filter(
    (t) => t.exit_date != null && t.exit_price != null
  )

  const dailyMap = new Map<string, number>()

  for (const t of closed) {
    const pnl = calculatePnl(t.exit_price, t.entry_price, t.quantity)
    if (pnl == null) continue
    const date = t.exit_date!
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + pnl)
  }

  const sortedDates = [...dailyMap.keys()].sort()

  let cumulative = 0
  return sortedDates.map((date) => {
    const daily = dailyMap.get(date)!
    cumulative += daily
    return { date, daily, cumulative }
  })
}
