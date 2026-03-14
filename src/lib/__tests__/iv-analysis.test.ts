import { describe, it, expect } from 'vitest'
import { calculateIvRankWinRates, type IvRankBand } from '../iv-analysis'
import type { Trade } from '@/types/database'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'test-id',
    user_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    trade_date: '2025-01-01',
    trade_type: 'call',
    strike_price: 38000,
    expiry_date: '2025-01-31',
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    exit_date: '2025-01-15',
    pnl: 50000,
    iv_at_entry: 20,
    memo: null,
    status: 'closed',
    defeat_tags: null,
    entry_delta: null,
    entry_gamma: null,
    entry_theta: null,
    entry_vega: null,
    entry_iv_rank: null,
    entry_iv_hv_ratio: null,
    is_mini: false,
    ...overrides,
  }
}

describe('calculateIvRankWinRates', () => {
  it('should return empty bands when no trades provided', () => {
    const result = calculateIvRankWinRates([])
    expect(result).toHaveLength(4)
    result.forEach((band) => {
      expect(band.totalTrades).toBe(0)
      expect(band.winRate).toBeNull()
    })
  })

  it('should categorize trades into correct IV rank bands', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 10, pnl: 50000 }),   // 0-25
      makeTrade({ id: '2', entry_iv_rank: 30, pnl: -10000 }),  // 25-50
      makeTrade({ id: '3', entry_iv_rank: 60, pnl: 30000 }),   // 50-75
      makeTrade({ id: '4', entry_iv_rank: 80, pnl: -20000 }),  // 75-100
    ]
    const result = calculateIvRankWinRates(trades)

    expect(result[0].label).toBe('0-25')
    expect(result[0].totalTrades).toBe(1)
    expect(result[0].winRate).toBe(100)

    expect(result[1].label).toBe('25-50')
    expect(result[1].totalTrades).toBe(1)
    expect(result[1].winRate).toBe(0)

    expect(result[2].label).toBe('50-75')
    expect(result[2].totalTrades).toBe(1)
    expect(result[2].winRate).toBe(100)

    expect(result[3].label).toBe('75-100')
    expect(result[3].totalTrades).toBe(1)
    expect(result[3].winRate).toBe(0)
  })

  it('should calculate correct win rate with multiple trades in a band', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 10, pnl: 50000 }),
      makeTrade({ id: '2', entry_iv_rank: 15, pnl: -10000 }),
      makeTrade({ id: '3', entry_iv_rank: 20, pnl: 30000 }),
    ]
    const result = calculateIvRankWinRates(trades)

    // All in 0-25 band: 2 wins, 1 loss => 66.67%
    expect(result[0].totalTrades).toBe(3)
    expect(result[0].wins).toBe(2)
    expect(result[0].winRate).toBeCloseTo(66.67, 1)
  })

  it('should skip trades without entry_iv_rank', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: null, pnl: 50000 }),
      makeTrade({ id: '2', entry_iv_rank: 10, pnl: 30000 }),
    ]
    const result = calculateIvRankWinRates(trades)
    const total = result.reduce((sum, b) => sum + b.totalTrades, 0)
    expect(total).toBe(1)
  })

  it('should skip open trades (no pnl)', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 10, pnl: null, status: 'open' }),
      makeTrade({ id: '2', entry_iv_rank: 10, pnl: 30000, status: 'closed' }),
    ]
    const result = calculateIvRankWinRates(trades)
    expect(result[0].totalTrades).toBe(1)
  })

  it('should treat pnl === 0 as a win', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 50, pnl: 0 }),
    ]
    const result = calculateIvRankWinRates(trades)
    expect(result[2].wins).toBe(1)
    expect(result[2].winRate).toBe(100)
  })

  it('should handle boundary values correctly', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 0, pnl: 10000 }),    // 0-25
      makeTrade({ id: '2', entry_iv_rank: 25, pnl: 10000 }),   // 25-50
      makeTrade({ id: '3', entry_iv_rank: 50, pnl: 10000 }),   // 50-75
      makeTrade({ id: '4', entry_iv_rank: 75, pnl: 10000 }),   // 75-100
      makeTrade({ id: '5', entry_iv_rank: 100, pnl: 10000 }),  // 75-100
    ]
    const result = calculateIvRankWinRates(trades)

    expect(result[0].totalTrades).toBe(1) // 0
    expect(result[1].totalTrades).toBe(1) // 25
    expect(result[2].totalTrades).toBe(1) // 50
    expect(result[3].totalTrades).toBe(2) // 75, 100
  })

  it('should include average pnl per band', () => {
    const trades: Trade[] = [
      makeTrade({ id: '1', entry_iv_rank: 10, pnl: 100000 }),
      makeTrade({ id: '2', entry_iv_rank: 15, pnl: -50000 }),
    ]
    const result = calculateIvRankWinRates(trades)
    expect(result[0].averagePnl).toBe(25000)
  })
})
