import { describe, it, expect } from 'vitest'
import {
  extractIvAroundEvent,
  calculateIvCrushStats,
  analyzeIvCrushPatterns,
  compareCurrentIvToHistory,
  type IvCrushPattern,
  type IvDataPoint,
} from '../iv-crush'
import type { CalendarEvent } from '../events'

function makeIvDataPoint(date: string, iv: number): IvDataPoint {
  return { date, iv }
}

function makeEvent(id: string, date: Date, category: 'sq' | 'fomc' | 'boj'): CalendarEvent {
  return {
    id,
    date,
    title: `Test ${category}`,
    category,
    importance: 'high',
  }
}

describe('extractIvAroundEvent', () => {
  it('extracts IV data points within N days before and after event', () => {
    const ivData: IvDataPoint[] = [
      makeIvDataPoint('2026-03-07', 22.5),
      makeIvDataPoint('2026-03-08', 23.0),
      makeIvDataPoint('2026-03-09', 24.0),
      makeIvDataPoint('2026-03-10', 25.5), // event day
      makeIvDataPoint('2026-03-11', 20.0),
      makeIvDataPoint('2026-03-12', 19.5),
      makeIvDataPoint('2026-03-13', 19.0),
    ]
    const eventDate = new Date(2026, 2, 10) // March 10
    const result = extractIvAroundEvent(ivData, eventDate, 3)

    expect(result.before).toHaveLength(3)
    expect(result.after).toHaveLength(3)
    expect(result.eventDay).toEqual(makeIvDataPoint('2026-03-10', 25.5))
  })

  it('returns null eventDay if no data on event date', () => {
    const ivData: IvDataPoint[] = [
      makeIvDataPoint('2026-03-09', 24.0),
      makeIvDataPoint('2026-03-11', 20.0),
    ]
    const eventDate = new Date(2026, 2, 10)
    const result = extractIvAroundEvent(ivData, eventDate, 3)

    expect(result.eventDay).toBeNull()
  })

  it('handles partial data (fewer days than N)', () => {
    const ivData: IvDataPoint[] = [
      makeIvDataPoint('2026-03-09', 24.0),
      makeIvDataPoint('2026-03-10', 25.5),
      makeIvDataPoint('2026-03-11', 20.0),
    ]
    const eventDate = new Date(2026, 2, 10)
    const result = extractIvAroundEvent(ivData, eventDate, 5)

    expect(result.before).toHaveLength(1)
    expect(result.after).toHaveLength(1)
  })
})

describe('calculateIvCrushStats', () => {
  it('calculates mean, median, max IV crush from patterns', () => {
    const patterns: IvCrushPattern[] = [
      { event: makeEvent('1', new Date(2025, 2, 10), 'sq'), peakIv: 30, postIv: 20, crushAmount: 10, crushPercent: 33.33 },
      { event: makeEvent('2', new Date(2025, 5, 10), 'sq'), peakIv: 28, postIv: 22, crushAmount: 6, crushPercent: 21.43 },
      { event: makeEvent('3', new Date(2025, 8, 10), 'sq'), peakIv: 35, postIv: 23, crushAmount: 12, crushPercent: 34.29 },
    ]
    const stats = calculateIvCrushStats(patterns)

    expect(stats.count).toBe(3)
    expect(stats.avgCrushAmount).toBeCloseTo(9.33, 1)
    expect(stats.medianCrushAmount).toBeCloseTo(10, 1)
    expect(stats.maxCrushAmount).toBeCloseTo(12, 1)
    expect(stats.avgCrushPercent).toBeCloseTo(29.68, 1)
  })

  it('returns zero stats for empty patterns', () => {
    const stats = calculateIvCrushStats([])

    expect(stats.count).toBe(0)
    expect(stats.avgCrushAmount).toBe(0)
    expect(stats.medianCrushAmount).toBe(0)
    expect(stats.maxCrushAmount).toBe(0)
  })
})

describe('analyzeIvCrushPatterns', () => {
  it('identifies IV crush patterns around events', () => {
    const events: CalendarEvent[] = [
      makeEvent('sq-2026-3', new Date(2026, 2, 13), 'sq'),
    ]
    // IV rises before event, drops after
    const ivData: IvDataPoint[] = [
      makeIvDataPoint('2026-03-08', 20.0),
      makeIvDataPoint('2026-03-09', 21.0),
      makeIvDataPoint('2026-03-10', 23.0),
      makeIvDataPoint('2026-03-11', 25.0),
      makeIvDataPoint('2026-03-12', 27.0),
      makeIvDataPoint('2026-03-13', 28.0), // event day (peak)
      makeIvDataPoint('2026-03-14', 22.0),
      makeIvDataPoint('2026-03-15', 21.0),
      makeIvDataPoint('2026-03-16', 20.5),
    ]

    const patterns = analyzeIvCrushPatterns(events, ivData, 5)

    expect(patterns).toHaveLength(1)
    expect(patterns[0].peakIv).toBe(28.0)
    expect(patterns[0].postIv).toBe(22.0)
    expect(patterns[0].crushAmount).toBeCloseTo(6.0)
    expect(patterns[0].crushPercent).toBeCloseTo(21.43, 1)
  })

  it('uses highest IV in before+eventDay window as peak', () => {
    const events: CalendarEvent[] = [
      makeEvent('fomc-1', new Date(2026, 0, 29), 'fomc'),
    ]
    const ivData: IvDataPoint[] = [
      makeIvDataPoint('2026-01-26', 18.0),
      makeIvDataPoint('2026-01-27', 22.0),
      makeIvDataPoint('2026-01-28', 30.0), // peak is before event day
      makeIvDataPoint('2026-01-29', 27.0), // event day
      makeIvDataPoint('2026-01-30', 21.0),
      makeIvDataPoint('2026-01-31', 20.0),
    ]

    const patterns = analyzeIvCrushPatterns(events, ivData, 3)

    expect(patterns[0].peakIv).toBe(30.0)
    expect(patterns[0].postIv).toBe(21.0) // first day after
  })

  it('skips events with insufficient data', () => {
    const events: CalendarEvent[] = [
      makeEvent('sq-1', new Date(2026, 2, 13), 'sq'),
    ]
    const ivData: IvDataPoint[] = [] // no data

    const patterns = analyzeIvCrushPatterns(events, ivData, 5)
    expect(patterns).toHaveLength(0)
  })
})

describe('compareCurrentIvToHistory', () => {
  it('compares current IV level to historical pre-event IV levels', () => {
    const historicalPeaks = [25, 28, 30, 22, 27]
    const currentIv = 26

    const result = compareCurrentIvToHistory(currentIv, historicalPeaks)

    expect(result).not.toBeNull()
    expect(result!.percentile).toBeCloseTo(40, 0) // 2 out of 5 are below 26 (22, 25)
    expect(result!.historicalAvg).toBeCloseTo(26.4, 1)
    expect(result!.isAboveAvg).toBe(false)
  })

  it('returns null for empty history', () => {
    const result = compareCurrentIvToHistory(26, [])
    expect(result).toBeNull()
  })

  it('handles current IV higher than all historical', () => {
    const result = compareCurrentIvToHistory(35, [20, 22, 25])

    expect(result).not.toBeNull()
    expect(result!.percentile).toBe(100)
    expect(result!.isAboveAvg).toBe(true)
  })
})
