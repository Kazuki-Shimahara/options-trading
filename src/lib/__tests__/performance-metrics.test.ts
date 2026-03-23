import { describe, it, expect } from 'vitest'
import type { Trade } from '@/types/database'
import {
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateProfitFactor,
  calculateKellyCriterion,
  filterTradesByPeriod,
  calculatePerformanceSummary,
} from '@/lib/performance-metrics'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: '1',
    user_id: 'u1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    trade_date: '2025-01-01',
    trade_type: 'call',
    strike_price: 30000,
    expiry_date: '2025-01-31',
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    exit_date: '2025-01-15',
    pnl: 50000,
    iv_at_entry: null,
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

describe('calculateSharpeRatio', () => {
  it('returns 0 for empty trades', () => {
    expect(calculateSharpeRatio([])).toBe(0)
  })

  it('returns 0 for single trade (no std dev)', () => {
    const trades = [makeTrade({ pnl: 50000 })]
    expect(calculateSharpeRatio(trades)).toBe(0)
  })

  it('calculates Sharpe ratio for multiple trades', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 50000 }),
      makeTrade({ id: '2', pnl: -20000 }),
      makeTrade({ id: '3', pnl: 30000 }),
      makeTrade({ id: '4', pnl: 10000 }),
    ]
    const result = calculateSharpeRatio(trades)
    // mean = 17500, stddev should be > 0, so sharpe should be positive
    expect(result).toBeGreaterThan(0)
    expect(typeof result).toBe('number')
    expect(Number.isFinite(result)).toBe(true)
  })

  it('handles all-zero PnL trades', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 0 }),
      makeTrade({ id: '2', pnl: 0 }),
    ]
    expect(calculateSharpeRatio(trades)).toBe(0)
  })

  it('skips trades with null pnl', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 50000 }),
      makeTrade({ id: '2', pnl: null }),
      makeTrade({ id: '3', pnl: -20000 }),
    ]
    const result = calculateSharpeRatio(trades)
    expect(typeof result).toBe('number')
  })
})

describe('calculateMaxDrawdown', () => {
  it('returns 0 for empty trades', () => {
    expect(calculateMaxDrawdown([])).toBe(0)
  })

  it('returns 0 when all trades are profitable', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 10000 }),
      makeTrade({ id: '2', pnl: 20000 }),
      makeTrade({ id: '3', pnl: 30000 }),
    ]
    expect(calculateMaxDrawdown(trades)).toBe(0)
  })

  it('calculates max drawdown correctly', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 50000 }),
      makeTrade({ id: '2', pnl: -20000 }),
      makeTrade({ id: '3', pnl: -30000 }),
      makeTrade({ id: '4', pnl: 10000 }),
    ]
    // cumulative: 50000, 30000, 0, 10000
    // peak: 50000, drawdown from peak: 0, -20000, -50000, -40000
    // max drawdown = 50000
    expect(calculateMaxDrawdown(trades)).toBe(50000)
  })

  it('handles single losing trade', () => {
    const trades = [makeTrade({ id: '1', pnl: -10000 })]
    expect(calculateMaxDrawdown(trades)).toBe(10000)
  })
})

describe('calculateProfitFactor', () => {
  it('returns 0 for empty trades', () => {
    expect(calculateProfitFactor([])).toBe(0)
  })

  it('returns Infinity when no losses', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 10000 }),
      makeTrade({ id: '2', pnl: 20000 }),
    ]
    expect(calculateProfitFactor(trades)).toBe(Infinity)
  })

  it('returns 0 when no wins', () => {
    const trades = [
      makeTrade({ id: '1', pnl: -10000 }),
      makeTrade({ id: '2', pnl: -20000 }),
    ]
    expect(calculateProfitFactor(trades)).toBe(0)
  })

  it('calculates profit factor correctly', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 30000 }),
      makeTrade({ id: '2', pnl: -10000 }),
      makeTrade({ id: '3', pnl: 20000 }),
      makeTrade({ id: '4', pnl: -5000 }),
    ]
    // total profit = 50000, total loss = 15000
    // profit factor = 50000 / 15000 ≈ 3.333
    expect(calculateProfitFactor(trades)).toBeCloseTo(3.333, 2)
  })
})

describe('calculateKellyCriterion', () => {
  it('returns 0 for empty trades', () => {
    expect(calculateKellyCriterion([])).toBe(0)
  })

  it('returns 0 when no wins', () => {
    const trades = [
      makeTrade({ id: '1', pnl: -10000 }),
      makeTrade({ id: '2', pnl: -20000 }),
    ]
    expect(calculateKellyCriterion(trades)).toBe(0)
  })

  it('calculates Kelly criterion correctly', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 30000 }),
      makeTrade({ id: '2', pnl: -10000 }),
      makeTrade({ id: '3', pnl: 20000 }),
      makeTrade({ id: '4', pnl: -10000 }),
    ]
    // winRate = 0.5, avgWin = 25000, avgLoss = 10000
    // W/L ratio = 2.5
    // Kelly = winRate - (1 - winRate) / (W/L ratio) = 0.5 - 0.5/2.5 = 0.5 - 0.2 = 0.3
    expect(calculateKellyCriterion(trades)).toBeCloseTo(0.3, 4)
  })

  it('clamps negative Kelly to 0', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 5000 }),
      makeTrade({ id: '2', pnl: -20000 }),
      makeTrade({ id: '3', pnl: -30000 }),
      makeTrade({ id: '4', pnl: -15000 }),
    ]
    // winRate = 0.25, avgWin = 5000, avgLoss ~21667
    // W/L = ~0.231, Kelly = 0.25 - 0.75/0.231 ≈ 0.25 - 3.25 < 0
    expect(calculateKellyCriterion(trades)).toBe(0)
  })
})

describe('filterTradesByPeriod', () => {
  const trades = [
    makeTrade({ id: '1', exit_date: '2025-01-15' }),
    makeTrade({ id: '2', exit_date: '2025-02-10' }),
    makeTrade({ id: '3', exit_date: '2025-03-20' }),
    makeTrade({ id: '4', exit_date: '2025-04-05' }),
    makeTrade({ id: '5', exit_date: '2025-07-15' }),
    makeTrade({ id: '6', exit_date: '2026-01-10' }),
  ]

  it('filters by monthly period', () => {
    const result = filterTradesByPeriod(trades, 'monthly', 2025, 1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('filters by quarterly period', () => {
    const result = filterTradesByPeriod(trades, 'quarterly', 2025, 1)
    expect(result).toHaveLength(3)
  })

  it('filters by yearly period', () => {
    const result = filterTradesByPeriod(trades, 'yearly', 2025)
    expect(result).toHaveLength(5)
  })

  it('returns empty for no matching trades', () => {
    const result = filterTradesByPeriod(trades, 'monthly', 2024, 12)
    expect(result).toHaveLength(0)
  })
})

describe('calculatePerformanceSummary', () => {
  it('returns all metrics for a set of trades', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 50000 }),
      makeTrade({ id: '2', pnl: -20000 }),
      makeTrade({ id: '3', pnl: 30000 }),
      makeTrade({ id: '4', pnl: -10000 }),
    ]
    const summary = calculatePerformanceSummary(trades)
    expect(summary).toHaveProperty('sharpeRatio')
    expect(summary).toHaveProperty('maxDrawdown')
    expect(summary).toHaveProperty('profitFactor')
    expect(summary).toHaveProperty('kellyCriterion')
    expect(summary).toHaveProperty('totalPnl')
    expect(summary).toHaveProperty('tradeCount')
    expect(summary).toHaveProperty('winRate')
    expect(summary.totalPnl).toBe(50000)
    expect(summary.tradeCount).toBe(4)
    expect(summary.winRate).toBeCloseTo(0.5, 4)
  })

  it('handles empty trades', () => {
    const summary = calculatePerformanceSummary([])
    expect(summary.sharpeRatio).toBe(0)
    expect(summary.maxDrawdown).toBe(0)
    expect(summary.profitFactor).toBe(0)
    expect(summary.kellyCriterion).toBe(0)
    expect(summary.totalPnl).toBe(0)
    expect(summary.tradeCount).toBe(0)
    expect(summary.winRate).toBe(0)
  })
})
