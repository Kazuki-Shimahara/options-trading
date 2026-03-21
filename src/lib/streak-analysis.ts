import type { Trade } from '@/types/database'

export interface Streak {
  type: 'win' | 'loss'
  count: number
  startDate: string
  endDate: string
  trades: string[]
}

export interface RevengeTrade {
  tradeId: string
  reason: string
  previousLossTradeId: string
  timeDiffHours: number
  sizeRatio: number
}

export interface MentalScoreEntry {
  date: string
  score: number
  tradeId: string
}

export interface PositionSizeAnalysis {
  duringWinStreak: number | null
  duringLossStreak: number | null
  baselineAvg: number | null
}

function sortByTradeDate(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date))
}

function isWin(pnl: number): boolean {
  return pnl >= 0
}

export function detectStreaks(trades: Trade[]): Streak[] {
  const sorted = sortByTradeDate(trades).filter((t) => t.pnl != null)
  if (sorted.length === 0) return []

  const streaks: Streak[] = []
  let currentType: 'win' | 'loss' = isWin(sorted[0].pnl!) ? 'win' : 'loss'
  let currentTrades: Trade[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const trade = sorted[i]
    const type: 'win' | 'loss' = isWin(trade.pnl!) ? 'win' : 'loss'

    if (type === currentType) {
      currentTrades.push(trade)
    } else {
      streaks.push({
        type: currentType,
        count: currentTrades.length,
        startDate: currentTrades[0].trade_date,
        endDate: currentTrades[currentTrades.length - 1].trade_date,
        trades: currentTrades.map((t) => t.id),
      })
      currentType = type
      currentTrades = [trade]
    }
  }

  streaks.push({
    type: currentType,
    count: currentTrades.length,
    startDate: currentTrades[0].trade_date,
    endDate: currentTrades[currentTrades.length - 1].trade_date,
    trades: currentTrades.map((t) => t.id),
  })

  return streaks
}

const REVENGE_TIME_THRESHOLD_HOURS = 24
const REVENGE_SIZE_MULTIPLIER = 1.5

export function detectRevengeTrades(trades: Trade[]): RevengeTrade[] {
  const sorted = sortByTradeDate(trades)
  if (sorted.length < 2) return []

  const revengeTrades: RevengeTrade[] = []

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const previous = sorted[i - 1]

    if (previous.pnl == null || previous.pnl >= 0) continue

    const prevDate = previous.exit_date ?? previous.trade_date
    const timeDiffMs =
      new Date(current.trade_date).getTime() - new Date(prevDate).getTime()
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60)

    if (timeDiffHours > REVENGE_TIME_THRESHOLD_HOURS || timeDiffHours < 0)
      continue

    const sizeRatio = current.quantity / previous.quantity
    if (sizeRatio < REVENGE_SIZE_MULTIPLIER) continue

    revengeTrades.push({
      tradeId: current.id,
      reason: `短時間（${timeDiffHours.toFixed(1)}時間）で${sizeRatio.toFixed(1)}倍のポジション`,
      previousLossTradeId: previous.id,
      timeDiffHours,
      sizeRatio,
    })
  }

  return revengeTrades
}

const BASE_SCORE = 50
const WIN_BOOST = 8
const LOSS_PENALTY = 12
const SCORE_MIN = 0
const SCORE_MAX = 100

export function calculateMentalScore(trades: Trade[]): MentalScoreEntry[] {
  const sorted = sortByTradeDate(trades).filter((t) => t.pnl != null)
  if (sorted.length === 0) return []

  const entries: MentalScoreEntry[] = []
  let score = BASE_SCORE

  for (const trade of sorted) {
    if (isWin(trade.pnl!)) {
      score = Math.min(SCORE_MAX, score + WIN_BOOST)
    } else {
      score = Math.max(SCORE_MIN, score - LOSS_PENALTY)
    }

    entries.push({
      date: trade.trade_date,
      score,
      tradeId: trade.id,
    })
  }

  return entries
}

export function analyzePositionSizeChanges(trades: Trade[]): PositionSizeAnalysis {
  const sorted = sortByTradeDate(trades).filter((t) => t.pnl != null)

  if (sorted.length === 0) {
    return { duringWinStreak: null, duringLossStreak: null, baselineAvg: null }
  }

  const winStreakSizes: number[] = []
  const lossStreakSizes: number[] = []

  const streaks = detectStreaks(sorted)

  for (const streak of streaks) {
    const streakTrades = sorted.filter((t) => streak.trades.includes(t.id))
    const sizes = streakTrades.map((t) => t.quantity)

    if (streak.count >= 2) {
      if (streak.type === 'win') {
        winStreakSizes.push(...sizes)
      } else {
        lossStreakSizes.push(...sizes)
      }
    }
  }

  const allSizes = sorted.map((t) => t.quantity)
  const baselineAvg = allSizes.reduce((a, b) => a + b, 0) / allSizes.length

  return {
    duringWinStreak:
      winStreakSizes.length > 0
        ? winStreakSizes.reduce((a, b) => a + b, 0) / winStreakSizes.length
        : null,
    duringLossStreak:
      lossStreakSizes.length > 0
        ? lossStreakSizes.reduce((a, b) => a + b, 0) / lossStreakSizes.length
        : null,
    baselineAvg,
  }
}
