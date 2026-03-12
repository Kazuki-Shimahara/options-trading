import type { Trade } from '@/types/database'

export interface IvRankBand {
  label: string
  min: number
  max: number
  totalTrades: number
  wins: number
  winRate: number | null
  averagePnl: number | null
}

const BANDS: { label: string; min: number; max: number }[] = [
  { label: '0-25', min: 0, max: 25 },
  { label: '25-50', min: 25, max: 50 },
  { label: '50-75', min: 50, max: 75 },
  { label: '75-100', min: 75, max: 101 },
]

function getBandIndex(ivRank: number): number {
  if (ivRank < 25) return 0
  if (ivRank < 50) return 1
  if (ivRank < 75) return 2
  return 3
}

export function calculateIvRankWinRates(trades: Trade[]): IvRankBand[] {
  const bands: IvRankBand[] = BANDS.map((b) => ({
    ...b,
    totalTrades: 0,
    wins: 0,
    winRate: null,
    averagePnl: null,
  }))

  const pnlSums: number[] = [0, 0, 0, 0]

  for (const trade of trades) {
    if (trade.entry_iv_rank == null || trade.pnl == null) continue

    const idx = getBandIndex(trade.entry_iv_rank)
    bands[idx].totalTrades++
    pnlSums[idx] += trade.pnl

    if (trade.pnl >= 0) {
      bands[idx].wins++
    }
  }

  for (let i = 0; i < bands.length; i++) {
    if (bands[i].totalTrades > 0) {
      bands[i].winRate = (bands[i].wins / bands[i].totalTrades) * 100
      bands[i].averagePnl = pnlSums[i] / bands[i].totalTrades
    }
  }

  return bands
}
