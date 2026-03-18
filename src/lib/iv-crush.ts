/**
 * IV Crush分析ユーティリティ
 *
 * SQ週・FOMC前後のIV変動パターンを分析し、
 * イベント前後のIV Crush（急低下）パターンを抽出する。
 */

import type { CalendarEvent } from './events'

export interface IvDataPoint {
  date: string // YYYY-MM-DD
  iv: number
}

export interface IvAroundEvent {
  before: IvDataPoint[]
  eventDay: IvDataPoint | null
  after: IvDataPoint[]
}

export interface IvCrushPattern {
  event: CalendarEvent
  peakIv: number
  postIv: number
  crushAmount: number
  crushPercent: number
}

export interface IvCrushStats {
  count: number
  avgCrushAmount: number
  medianCrushAmount: number
  maxCrushAmount: number
  avgCrushPercent: number
}

export interface IvComparison {
  percentile: number
  historicalAvg: number
  isAboveAvg: boolean
}

/**
 * イベント前後N日のIVデータを抽出する
 */
export function extractIvAroundEvent(
  ivData: IvDataPoint[],
  eventDate: Date,
  daysAround: number
): IvAroundEvent {
  const eventDateStr = formatDate(eventDate)

  const eventDay = ivData.find((d) => d.date === eventDateStr) ?? null

  const before: IvDataPoint[] = []
  const after: IvDataPoint[] = []

  for (const point of ivData) {
    const diff = daysDiff(point.date, eventDateStr)
    if (diff < 0 && diff >= -daysAround) {
      before.push(point)
    } else if (diff > 0 && diff <= daysAround) {
      after.push(point)
    }
  }

  // Sort before ascending (oldest first), after ascending
  before.sort((a, b) => a.date.localeCompare(b.date))
  after.sort((a, b) => a.date.localeCompare(b.date))

  return { before, eventDay, after }
}

/**
 * IV Crushパターンの統計を計算する
 */
export function calculateIvCrushStats(patterns: IvCrushPattern[]): IvCrushStats {
  if (patterns.length === 0) {
    return {
      count: 0,
      avgCrushAmount: 0,
      medianCrushAmount: 0,
      maxCrushAmount: 0,
      avgCrushPercent: 0,
    }
  }

  const crushAmounts = patterns.map((p) => p.crushAmount)
  const crushPercents = patterns.map((p) => p.crushPercent)

  const sorted = [...crushAmounts].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]

  return {
    count: patterns.length,
    avgCrushAmount: crushAmounts.reduce((a, b) => a + b, 0) / patterns.length,
    medianCrushAmount: median,
    maxCrushAmount: Math.max(...crushAmounts),
    avgCrushPercent: crushPercents.reduce((a, b) => a + b, 0) / patterns.length,
  }
}

/**
 * イベントリストとIV履歴からIV Crushパターンを分析する
 *
 * peakIv: イベント前N日+当日の中で最大のIV
 * postIv: イベント後の最初のIVデータポイント
 * crushAmount: peakIv - postIv
 */
export function analyzeIvCrushPatterns(
  events: CalendarEvent[],
  ivData: IvDataPoint[],
  daysAround: number
): IvCrushPattern[] {
  const patterns: IvCrushPattern[] = []

  for (const event of events) {
    const { before, eventDay, after } = extractIvAroundEvent(
      ivData,
      event.date,
      daysAround
    )

    // Need at least some before/event data and after data
    const preEventPoints = [...before]
    if (eventDay) preEventPoints.push(eventDay)

    if (preEventPoints.length === 0 || after.length === 0) continue

    const peakIv = Math.max(...preEventPoints.map((p) => p.iv))
    const postIv = after[0].iv // first day after event

    const crushAmount = peakIv - postIv
    const crushPercent = (crushAmount / peakIv) * 100

    patterns.push({
      event,
      peakIv,
      postIv,
      crushAmount,
      crushPercent,
    })
  }

  return patterns
}

/**
 * 現在のIV水準を過去のイベント前ピークIVと比較する
 */
export function compareCurrentIvToHistory(
  currentIv: number,
  historicalPeaks: number[]
): IvComparison | null {
  if (historicalPeaks.length === 0) return null

  const below = historicalPeaks.filter((p) => p < currentIv).length
  const percentile = (below / historicalPeaks.length) * 100
  const avg =
    historicalPeaks.reduce((a, b) => a + b, 0) / historicalPeaks.length

  return {
    percentile,
    historicalAvg: avg,
    isAboveAvg: currentIv > avg,
  }
}

// --- helpers ---

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysDiff(dateStrA: string, dateStrB: string): number {
  const a = new Date(dateStrA + 'T00:00:00')
  const b = new Date(dateStrB + 'T00:00:00')
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}
