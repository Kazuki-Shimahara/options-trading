import { describe, it, expect } from 'vitest'
import {
  calculateEntryQualityScore,
  aggregateScoreBands,
  type EntryFeatures,
} from '../entry-quality-scoring'
import type { Trade } from '@/types/database'

function makeFeatures(overrides: Partial<EntryFeatures> = {}): EntryFeatures {
  return {
    ivRank: 50,
    ivPercentile: 50,
    pcr: 1.0,
    skew: 0,
    dayOfWeek: 2, // Tuesday
    isPreEvent: false,
    isPostEvent: false,
    ...overrides,
  }
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: '1',
    user_id: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    trade_date: '2026-01-01',
    trade_type: 'put',
    strike_price: 38000,
    expiry_date: '2026-01-10',
    quantity: 1,
    entry_price: 100,
    exit_price: 50,
    exit_date: '2026-01-08',
    pnl: 50000,
    iv_at_entry: 20,
    memo: null,
    status: 'closed',
    defeat_tags: null,
    market_env_tags: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    entry_iv_rank: 70,
    entry_iv_hv_ratio: null,
    is_mini: false,
    playbook_id: null,
    playbook_compliance: null,
    confidence_level: null,
    emotion: null,
    ...overrides,
  }
}

describe('calculateEntryQualityScore', () => {
  it('returns a score between 0 and 100', () => {
    const score = calculateEntryQualityScore(makeFeatures())
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 0-100 even with extreme feature values', () => {
    const highScore = calculateEntryQualityScore(
      makeFeatures({ ivRank: 100, ivPercentile: 100, pcr: 3.0, skew: -10 })
    )
    expect(highScore).toBeGreaterThanOrEqual(0)
    expect(highScore).toBeLessThanOrEqual(100)

    const lowScore = calculateEntryQualityScore(
      makeFeatures({ ivRank: 0, ivPercentile: 0, pcr: 0.1, skew: 10 })
    )
    expect(lowScore).toBeGreaterThanOrEqual(0)
    expect(lowScore).toBeLessThanOrEqual(100)
  })

  it('gives higher score for high IV rank (sell premium opportunity)', () => {
    const highIvScore = calculateEntryQualityScore(makeFeatures({ ivRank: 90 }))
    const lowIvScore = calculateEntryQualityScore(makeFeatures({ ivRank: 10 }))
    expect(highIvScore).toBeGreaterThan(lowIvScore)
  })

  it('gives higher score for high IV percentile', () => {
    const highScore = calculateEntryQualityScore(makeFeatures({ ivPercentile: 90 }))
    const lowScore = calculateEntryQualityScore(makeFeatures({ ivPercentile: 10 }))
    expect(highScore).toBeGreaterThan(lowScore)
  })

  it('gives higher score for high PCR (more puts = fear = sell premium opportunity)', () => {
    const highPcrScore = calculateEntryQualityScore(makeFeatures({ pcr: 1.5 }))
    const lowPcrScore = calculateEntryQualityScore(makeFeatures({ pcr: 0.5 }))
    expect(highPcrScore).toBeGreaterThan(lowPcrScore)
  })

  it('gives higher score for negative skew (steeper skew = premium selling opportunity)', () => {
    const negSkew = calculateEntryQualityScore(makeFeatures({ skew: -5 }))
    const posSkew = calculateEntryQualityScore(makeFeatures({ skew: 5 }))
    expect(negSkew).toBeGreaterThan(posSkew)
  })

  it('penalizes pre-event entries', () => {
    const preEvent = calculateEntryQualityScore(makeFeatures({ isPreEvent: true }))
    const noEvent = calculateEntryQualityScore(makeFeatures({ isPreEvent: false }))
    expect(preEvent).toBeLessThan(noEvent)
  })

  it('gives slight bonus for post-event entries', () => {
    const postEvent = calculateEntryQualityScore(makeFeatures({ isPostEvent: true }))
    const noEvent = calculateEntryQualityScore(makeFeatures({ isPostEvent: false }))
    expect(postEvent).toBeGreaterThan(noEvent)
  })

  it('gives higher score on midweek days (Tue-Thu)', () => {
    const tuesday = calculateEntryQualityScore(makeFeatures({ dayOfWeek: 2 }))
    const monday = calculateEntryQualityScore(makeFeatures({ dayOfWeek: 1 }))
    expect(tuesday).toBeGreaterThanOrEqual(monday)
  })

  it('returns integer score', () => {
    const score = calculateEntryQualityScore(makeFeatures({ ivRank: 73, pcr: 1.23 }))
    expect(Number.isInteger(score)).toBe(true)
  })
})

describe('aggregateScoreBands', () => {
  it('returns all 5 bands', () => {
    const bands = aggregateScoreBands([])
    expect(bands).toHaveLength(5)
    expect(bands.map((b) => b.label)).toEqual([
      '0-20',
      '21-40',
      '41-60',
      '61-80',
      '81-100',
    ])
  })

  it('counts trades in correct bands based on entry_iv_rank', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 10, pnl: 10000 }),
      makeTrade({ id: '2', entry_iv_rank: 30, pnl: -5000 }),
      makeTrade({ id: '3', entry_iv_rank: 55, pnl: 20000 }),
      makeTrade({ id: '4', entry_iv_rank: 75, pnl: 30000 }),
      makeTrade({ id: '5', entry_iv_rank: 95, pnl: 40000 }),
    ]
    const bands = aggregateScoreBands(trades)

    expect(bands[0].totalTrades).toBe(1) // 0-20: ivRank 10
    expect(bands[1].totalTrades).toBe(1) // 21-40: ivRank 30
    expect(bands[2].totalTrades).toBe(1) // 41-60: ivRank 55
    expect(bands[3].totalTrades).toBe(1) // 61-80: ivRank 75
    expect(bands[4].totalTrades).toBe(1) // 81-100: ivRank 95
  })

  it('calculates win rate correctly', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 75, pnl: 10000 }),
      makeTrade({ id: '2', entry_iv_rank: 72, pnl: 20000 }),
      makeTrade({ id: '3', entry_iv_rank: 78, pnl: -5000 }),
    ]
    const bands = aggregateScoreBands(trades)
    const band = bands[3] // 61-80

    expect(band.totalTrades).toBe(3)
    expect(band.wins).toBe(2)
    expect(band.winRate).toBeCloseTo(66.67, 1)
  })

  it('calculates average PnL correctly', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 85, pnl: 30000 }),
      makeTrade({ id: '2', entry_iv_rank: 90, pnl: -10000 }),
    ]
    const bands = aggregateScoreBands(trades)
    const band = bands[4] // 81-100

    expect(band.averagePnl).toBe(10000)
  })

  it('returns null for winRate and averagePnl when no trades in band', () => {
    const bands = aggregateScoreBands([])
    for (const band of bands) {
      expect(band.winRate).toBeNull()
      expect(band.averagePnl).toBeNull()
    }
  })

  it('skips trades without entry_iv_rank or pnl', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: null, pnl: 10000 }),
      makeTrade({ id: '2', entry_iv_rank: 50, pnl: null }),
      makeTrade({ id: '3', entry_iv_rank: 50, pnl: 10000 }),
    ]
    const bands = aggregateScoreBands(trades)
    const band = bands[2] // 41-60
    expect(band.totalTrades).toBe(1)
  })
})
