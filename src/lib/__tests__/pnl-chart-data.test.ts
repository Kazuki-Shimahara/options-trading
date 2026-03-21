import { describe, it, expect } from 'vitest'
import { buildPnlChartData } from '../pnl-chart-data'
import type { Trade } from '@/types/database'

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: '1',
    user_id: 'test-user',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    trade_date: '2025-01-01',
    trade_type: 'call',
    strike_price: 30000,
    expiry_date: '2025-02-01',
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    exit_date: '2025-01-15',
    pnl: null,
    iv_at_entry: null,
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
    market_env_tags: null,
    playbook_id: null,
    playbook_compliance: null,
    ...overrides,
  }
}

describe('buildPnlChartData', () => {
  it('取引0件で空配列を返す', () => {
    const result = buildPnlChartData([])
    expect(result).toEqual([])
  })

  it('1件の決済済み取引で正しい損益を計算する', () => {
    const trades = [
      makeTrade({ exit_date: '2025-01-15', entry_price: 100, exit_price: 150, quantity: 1 }),
    ]
    const result = buildPnlChartData(trades)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2025-01-15')
    expect(result[0].daily).toBe(50000) // (150-100)*1*1000
    expect(result[0].cumulative).toBe(50000)
  })

  it('複数取引で累計損益が正しく積み上がる', () => {
    const trades = [
      makeTrade({ id: '1', exit_date: '2025-01-10', entry_price: 100, exit_price: 150, quantity: 1 }),
      makeTrade({ id: '2', exit_date: '2025-01-20', entry_price: 200, exit_price: 180, quantity: 2 }),
    ]
    const result = buildPnlChartData(trades)
    expect(result).toHaveLength(2)
    // First: (150-100)*1*1000 = 50000
    expect(result[0].daily).toBe(50000)
    expect(result[0].cumulative).toBe(50000)
    // Second: (180-200)*2*1000 = -40000
    expect(result[1].daily).toBe(-40000)
    expect(result[1].cumulative).toBe(10000)
  })

  it('同日に複数取引がある場合は日次でまとめる', () => {
    const trades = [
      makeTrade({ id: '1', exit_date: '2025-01-15', entry_price: 100, exit_price: 150, quantity: 1 }),
      makeTrade({ id: '2', exit_date: '2025-01-15', entry_price: 200, exit_price: 250, quantity: 1 }),
    ]
    const result = buildPnlChartData(trades)
    expect(result).toHaveLength(1)
    expect(result[0].daily).toBe(100000) // 50000 + 50000
    expect(result[0].cumulative).toBe(100000)
  })

  it('exit_dateがnullの取引は無視する', () => {
    const trades = [
      makeTrade({ exit_date: null, exit_price: null }),
      makeTrade({ id: '2', exit_date: '2025-01-15', entry_price: 100, exit_price: 120, quantity: 1 }),
    ]
    const result = buildPnlChartData(trades)
    expect(result).toHaveLength(1)
    expect(result[0].daily).toBe(20000)
  })

  it('日付順にソートされる', () => {
    const trades = [
      makeTrade({ id: '1', exit_date: '2025-01-20', entry_price: 100, exit_price: 110, quantity: 1 }),
      makeTrade({ id: '2', exit_date: '2025-01-10', entry_price: 100, exit_price: 130, quantity: 1 }),
    ]
    const result = buildPnlChartData(trades)
    expect(result[0].date).toBe('2025-01-10')
    expect(result[1].date).toBe('2025-01-20')
  })
})
