import { describe, it, expect } from 'vitest'
import { calculateMonthlyPnl } from '@/lib/monthly-pnl'
import type { Trade } from '@/types/database'

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: '1',
    user_id: 'user1',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    trade_date: '2026-03-01',
    trade_type: 'call',
    strike_price: 39000,
    expiry_date: '2026-03-14',
    quantity: 1,
    entry_price: 150,
    exit_price: null,
    exit_date: null,
    pnl: null,
    iv_at_entry: null,
    memo: null,
    status: 'open',
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
    ...overrides,
  }
}

describe('calculateMonthlyPnl', () => {
  it('取引がない場合はゼロサマリーを返す', () => {
    const result = calculateMonthlyPnl([], [], [])
    expect(result).toEqual({
      totalPnl: 0,
      tradeCount: 0,
      winRate: 0,
      winCount: 0,
      unrealizedPnl: 0,
      prevMonthPnl: 0,
      monthOverMonthDiff: 0,
    })
  })

  it('確定損益を正しく合計する（pnlフィールド使用）', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 50000, status: 'closed', exit_price: 200, exit_date: '2026-03-10' }),
      makeTrade({ id: '2', pnl: -20000, status: 'closed', exit_price: 130, exit_date: '2026-03-12' }),
    ]
    const result = calculateMonthlyPnl(trades, [], [])
    expect(result.totalPnl).toBe(30000)
    expect(result.tradeCount).toBe(2)
  })

  it('pnlがnullの場合はexit_priceから計算する', () => {
    const trades = [
      makeTrade({
        id: '1',
        entry_price: 150,
        exit_price: 200,
        quantity: 1,
        status: 'closed',
        exit_date: '2026-03-10',
        pnl: null,
      }),
    ]
    const result = calculateMonthlyPnl(trades, [], [])
    // (200 - 150) * 1 * 1000 = 50,000
    expect(result.totalPnl).toBe(50000)
  })

  it('勝率を正しく計算する', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 50000, status: 'closed' }),
      makeTrade({ id: '2', pnl: -20000, status: 'closed' }),
      makeTrade({ id: '3', pnl: 10000, status: 'closed' }),
    ]
    const result = calculateMonthlyPnl(trades, [], [])
    expect(result.winCount).toBe(2)
    expect(result.winRate).toBeCloseTo(2 / 3)
  })

  it('pnl=0は勝ちに含まない', () => {
    const trades = [
      makeTrade({ id: '1', pnl: 0, status: 'closed' }),
    ]
    const result = calculateMonthlyPnl(trades, [], [])
    expect(result.winCount).toBe(0)
    expect(result.winRate).toBe(0)
  })

  it('前月比を正しく計算する', () => {
    const thisMonth = [
      makeTrade({ id: '1', pnl: 80000, status: 'closed' }),
    ]
    const prevMonth = [
      makeTrade({ id: '2', pnl: 50000, status: 'closed' }),
    ]
    const result = calculateMonthlyPnl(thisMonth, prevMonth, [])
    expect(result.prevMonthPnl).toBe(50000)
    expect(result.monthOverMonthDiff).toBe(30000)
  })

  it('含み損益を計算する（currentPrices指定時）', () => {
    const openTrades = [
      makeTrade({ id: 'a', entry_price: 150, quantity: 2 }),
      makeTrade({ id: 'b', entry_price: 100, quantity: 1 }),
    ]
    const currentPrices = new Map([
      ['a', 200], // (200-150)*2*1000 = 100,000
      ['b', 80],  // (80-100)*1*1000 = -20,000
    ])
    const result = calculateMonthlyPnl([], [], openTrades, currentPrices)
    expect(result.unrealizedPnl).toBe(80000)
  })

  it('currentPricesがない場合は含み損益0', () => {
    const openTrades = [
      makeTrade({ id: 'a', entry_price: 150, quantity: 2 }),
    ]
    const result = calculateMonthlyPnl([], [], openTrades)
    expect(result.unrealizedPnl).toBe(0)
  })
})
