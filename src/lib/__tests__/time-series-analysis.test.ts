import { describe, it, expect } from 'vitest'
import type { Trade } from '@/lib/trade-schema'
import {
  calculateDayOfWeekStats,
  calculateMonthlyPerformance,
  isSQWeekTrade,
  calculateSQWeekComparison,
  calculateEventPerformance,
} from '@/lib/time-series-analysis'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 'test-1',
    user_id: 'user-1',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    trade_date: '2025-06-02', // Monday
    trade_type: 'call',
    strike_price: 38000,
    expiry_date: '2025-06-13',
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    exit_date: '2025-06-05',
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
    entry_iv_rank: null,
    entry_iv_hv_ratio: null,
    is_mini: false,
    playbook_id: null,
    playbook_compliance: null,
    confidence_level: null,
    emotion: null,
    ...overrides,
  }
}

describe('calculateDayOfWeekStats', () => {
  it('returns stats for each day of the week (0=Sun to 6=Sat)', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-06-02', pnl: 50000 }),  // Monday
      makeTrade({ id: '2', trade_date: '2025-06-03', pnl: -30000 }), // Tuesday
      makeTrade({ id: '3', trade_date: '2025-06-09', pnl: 20000 }),  // Monday
      makeTrade({ id: '4', trade_date: '2025-06-04', pnl: 10000 }),  // Wednesday
    ]
    const result = calculateDayOfWeekStats(trades)
    expect(result).toHaveLength(7)

    // Monday (day=1): 2 trades, 2 wins
    const monday = result.find((r) => r.dayOfWeek === 1)!
    expect(monday.tradeCount).toBe(2)
    expect(monday.winCount).toBe(2)
    expect(monday.winRate).toBe(100)
    expect(monday.averagePnl).toBe(35000)

    // Tuesday (day=2): 1 trade, 0 wins
    const tuesday = result.find((r) => r.dayOfWeek === 2)!
    expect(tuesday.tradeCount).toBe(1)
    expect(tuesday.winCount).toBe(0)
    expect(tuesday.winRate).toBe(0)
    expect(tuesday.averagePnl).toBe(-30000)

    // Sunday (day=0): no trades
    const sunday = result.find((r) => r.dayOfWeek === 0)!
    expect(sunday.tradeCount).toBe(0)
    expect(sunday.winRate).toBe(0)
  })

  it('returns all zeros for empty trades', () => {
    const result = calculateDayOfWeekStats([])
    expect(result).toHaveLength(7)
    result.forEach((r) => {
      expect(r.tradeCount).toBe(0)
      expect(r.winRate).toBe(0)
      expect(r.averagePnl).toBe(0)
    })
  })
})

describe('calculateMonthlyPerformance', () => {
  it('aggregates performance by year-month', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2025-01-10', pnl: 50000 }),
      makeTrade({ id: '2', trade_date: '2025-01-20', pnl: -20000 }),
      makeTrade({ id: '3', trade_date: '2025-02-05', pnl: 30000 }),
    ]
    const result = calculateMonthlyPerformance(trades)

    const jan = result.find((r) => r.yearMonth === '2025-01')!
    expect(jan.tradeCount).toBe(2)
    expect(jan.totalPnl).toBe(30000)
    expect(jan.winRate).toBe(50)

    const feb = result.find((r) => r.yearMonth === '2025-02')!
    expect(feb.tradeCount).toBe(1)
    expect(feb.totalPnl).toBe(30000)
    expect(feb.winRate).toBe(100)
  })

  it('returns empty array for no trades', () => {
    expect(calculateMonthlyPerformance([])).toEqual([])
  })
})

describe('isSQWeekTrade', () => {
  // 2025-06 SQ日 = 第2金曜日 = 2025-06-13
  it('returns true for a trade in SQ week (3 business days before SQ)', () => {
    // 2025-06-10 (Tue) is 3 business days before SQ(06-13)
    expect(isSQWeekTrade('2025-06-10')).toBe(true)
  })

  it('returns true for SQ day itself', () => {
    expect(isSQWeekTrade('2025-06-13')).toBe(true)
  })

  it('returns false for a trade not in SQ week', () => {
    // 2025-06-02 (Mon) is well before SQ week
    expect(isSQWeekTrade('2025-06-02')).toBe(false)
  })
})

describe('calculateSQWeekComparison', () => {
  it('separates trades into SQ week and non-SQ week', () => {
    const trades = [
      // SQ week trade (2025-06-13 is SQ day)
      makeTrade({ id: '1', trade_date: '2025-06-13', pnl: 50000 }),
      // Non-SQ week trade
      makeTrade({ id: '2', trade_date: '2025-06-02', pnl: -20000 }),
      makeTrade({ id: '3', trade_date: '2025-06-03', pnl: 30000 }),
    ]
    const result = calculateSQWeekComparison(trades)

    expect(result.sqWeek.tradeCount).toBe(1)
    expect(result.sqWeek.winRate).toBe(100)
    expect(result.sqWeek.averagePnl).toBe(50000)

    expect(result.nonSQWeek.tradeCount).toBe(2)
    expect(result.nonSQWeek.winRate).toBe(50)
    expect(result.nonSQWeek.averagePnl).toBe(5000)
  })
})

describe('calculateEventPerformance', () => {
  it('calculates performance around FOMC dates', () => {
    // 2026 FOMC dates: 1/28-29, 3/18-19, etc.
    const trades = [
      // Trade on FOMC day 1/28
      makeTrade({ id: '1', trade_date: '2026-01-28', pnl: 50000 }),
      // Trade day before FOMC (1/27)
      makeTrade({ id: '2', trade_date: '2026-01-27', pnl: -10000 }),
      // Trade far from any event
      makeTrade({ id: '3', trade_date: '2026-02-15', pnl: 20000 }),
    ]
    const result = calculateEventPerformance(trades, 'fomc', 1)

    expect(result.nearEvent.tradeCount).toBe(2)
    expect(result.farFromEvent.tradeCount).toBe(1)
  })

  it('calculates performance around BOJ dates', () => {
    // 2026 BOJ dates: 1/23-24, 3/13-14, etc.
    const trades = [
      makeTrade({ id: '1', trade_date: '2026-01-23', pnl: 30000 }),
      makeTrade({ id: '2', trade_date: '2026-05-15', pnl: -10000 }),
    ]
    const result = calculateEventPerformance(trades, 'boj', 1)

    expect(result.nearEvent.tradeCount).toBe(1)
    expect(result.nearEvent.winRate).toBe(100)
    expect(result.farFromEvent.tradeCount).toBe(1)
  })

  it('returns zeros when no trades', () => {
    const result = calculateEventPerformance([], 'fomc', 1)
    expect(result.nearEvent.tradeCount).toBe(0)
    expect(result.farFromEvent.tradeCount).toBe(0)
  })
})
