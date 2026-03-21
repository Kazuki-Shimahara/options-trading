/**
 * 時系列パターン分析
 *
 * 曜日別勝率・平均損益、月別パフォーマンス推移、
 * SQ週 vs 非SQ週の比較、FOMC/日銀会合前後のパフォーマンスを分析する。
 */

import type { Trade } from '@/lib/trade-schema'
import { isSQWeek } from '@/lib/sq-helper'
import { getEventsForYear, type EventCategory } from '@/lib/events'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export interface DayOfWeekStats {
  dayOfWeek: number // 0=Sun, 6=Sat
  dayLabel: string
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number // percentage 0-100
  averagePnl: number
  totalPnl: number
}

export interface MonthlyPerformance {
  yearMonth: string // 'YYYY-MM'
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number // percentage 0-100
  totalPnl: number
  averagePnl: number
}

export interface GroupStats {
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number
  averagePnl: number
  totalPnl: number
}

export interface SQWeekComparison {
  sqWeek: GroupStats
  nonSQWeek: GroupStats
}

export interface EventPerformance {
  nearEvent: GroupStats
  farFromEvent: GroupStats
}

function buildGroupStats(trades: Trade[]): GroupStats {
  const tradeCount = trades.length
  if (tradeCount === 0) {
    return { tradeCount: 0, winCount: 0, lossCount: 0, winRate: 0, averagePnl: 0, totalPnl: 0 }
  }
  const winCount = trades.filter((t) => t.pnl != null && t.pnl > 0).length
  const lossCount = trades.filter((t) => t.pnl != null && t.pnl < 0).length
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  return {
    tradeCount,
    winCount,
    lossCount,
    winRate: (winCount / tradeCount) * 100,
    averagePnl: totalPnl / tradeCount,
    totalPnl,
  }
}

/**
 * 曜日別の勝率・平均損益を計算
 */
export function calculateDayOfWeekStats(trades: Trade[]): DayOfWeekStats[] {
  const grouped: Map<number, Trade[]> = new Map()
  for (let d = 0; d <= 6; d++) grouped.set(d, [])

  for (const trade of trades) {
    const date = new Date(trade.trade_date + 'T00:00:00')
    const day = date.getDay()
    grouped.get(day)!.push(trade)
  }

  return Array.from(grouped.entries()).map(([dayOfWeek, dayTrades]) => {
    const stats = buildGroupStats(dayTrades)
    return {
      dayOfWeek,
      dayLabel: DAY_LABELS[dayOfWeek],
      ...stats,
    }
  })
}

/**
 * 月別パフォーマンス推移を計算
 */
export function calculateMonthlyPerformance(trades: Trade[]): MonthlyPerformance[] {
  if (trades.length === 0) return []

  const grouped = new Map<string, Trade[]>()

  for (const trade of trades) {
    const ym = trade.trade_date.slice(0, 7) // 'YYYY-MM'
    if (!grouped.has(ym)) grouped.set(ym, [])
    grouped.get(ym)!.push(trade)
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, monthTrades]) => {
      const stats = buildGroupStats(monthTrades)
      return { yearMonth, ...stats }
    })
}

/**
 * 指定日がSQ週かどうかを判定
 */
export function isSQWeekTrade(tradeDate: string): boolean {
  const date = new Date(tradeDate + 'T00:00:00')
  return isSQWeek(date)
}

/**
 * SQ週 vs 非SQ週の比較
 */
export function calculateSQWeekComparison(trades: Trade[]): SQWeekComparison {
  const sqTrades: Trade[] = []
  const nonSqTrades: Trade[] = []

  for (const trade of trades) {
    if (isSQWeekTrade(trade.trade_date)) {
      sqTrades.push(trade)
    } else {
      nonSqTrades.push(trade)
    }
  }

  return {
    sqWeek: buildGroupStats(sqTrades),
    nonSQWeek: buildGroupStats(nonSqTrades),
  }
}

/**
 * イベント前後のパフォーマンス分析
 *
 * @param trades 対象取引
 * @param eventCategory イベントカテゴリ ('fomc' | 'boj' など)
 * @param dayRange イベント前後何日以内を「近い」とするか
 */
export function calculateEventPerformance(
  trades: Trade[],
  eventCategory: EventCategory,
  dayRange: number = 1,
): EventPerformance {
  if (trades.length === 0) {
    return {
      nearEvent: buildGroupStats([]),
      farFromEvent: buildGroupStats([]),
    }
  }

  // Collect event dates from all years present in trades
  const years = new Set<number>()
  for (const t of trades) {
    years.add(new Date(t.trade_date + 'T00:00:00').getFullYear())
  }

  const eventDates: number[] = []
  for (const year of years) {
    const events = getEventsForYear(year)
    for (const ev of events) {
      if (ev.category === eventCategory) {
        // Normalize to date-only timestamp
        const d = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate())
        eventDates.push(d.getTime())
      }
    }
  }

  const MS_PER_DAY = 86400000
  const nearTrades: Trade[] = []
  const farTrades: Trade[] = []

  for (const trade of trades) {
    const tradeTime = new Date(trade.trade_date + 'T00:00:00').getTime()
    const isNear = eventDates.some(
      (evTime) => Math.abs(tradeTime - evTime) <= dayRange * MS_PER_DAY,
    )
    if (isNear) {
      nearTrades.push(trade)
    } else {
      farTrades.push(trade)
    }
  }

  return {
    nearEvent: buildGroupStats(nearTrades),
    farFromEvent: buildGroupStats(farTrades),
  }
}

/**
 * ヒートマップ用: 曜日 x 月のPnLマトリクスを生成
 */
export interface HeatmapCell {
  dayOfWeek: number
  month: number
  dayLabel: string
  monthLabel: string
  totalPnl: number
  tradeCount: number
  averagePnl: number
  winRate: number
}

export function buildHeatmapData(trades: Trade[]): HeatmapCell[] {
  const matrix = new Map<string, Trade[]>()

  for (const trade of trades) {
    const date = new Date(trade.trade_date + 'T00:00:00')
    const key = `${date.getDay()}-${date.getMonth() + 1}`
    if (!matrix.has(key)) matrix.set(key, [])
    matrix.get(key)!.push(trade)
  }

  const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const cells: HeatmapCell[] = []

  for (let day = 0; day <= 6; day++) {
    for (let month = 1; month <= 12; month++) {
      const key = `${day}-${month}`
      const cellTrades = matrix.get(key) ?? []
      const stats = buildGroupStats(cellTrades)
      cells.push({
        dayOfWeek: day,
        month,
        dayLabel: DAY_LABELS[day],
        monthLabel: MONTH_LABELS[month - 1],
        totalPnl: stats.totalPnl,
        tradeCount: stats.tradeCount,
        averagePnl: stats.averagePnl,
        winRate: stats.winRate,
      })
    }
  }

  return cells
}
