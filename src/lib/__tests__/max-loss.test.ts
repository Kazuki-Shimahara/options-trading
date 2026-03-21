import { describe, it, expect } from 'vitest'
import {
  calculateMaxLoss,
  calculateTotalMaxLoss,
  type PositionSide,
} from '@/lib/max-loss'
import { MULTIPLIER_MINI, MULTIPLIER_STANDARD } from '@/lib/constants'
import type { Trade } from '@/types/database'

function makeTrade(overrides: Partial<Trade> & { position_side?: PositionSide }): Trade & { position_side?: PositionSide } {
  return {
    id: '1',
    user_id: 'test-user',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    trade_date: '2026-01-01',
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

describe('calculateMaxLoss', () => {
  describe('買いポジション (buy)', () => {
    it('最大損失 = プレミアム全額 (entry_price * quantity * 1000)', () => {
      const trade = makeTrade({ entry_price: 150, quantity: 1 })
      const result = calculateMaxLoss(trade, 'buy')
      expect(result).toBe(150 * 1 * 1000) // 150,000円
    })

    it('枚数が複数の場合', () => {
      const trade = makeTrade({ entry_price: 200, quantity: 3 })
      const result = calculateMaxLoss(trade, 'buy')
      expect(result).toBe(200 * 3 * 1000) // 600,000円
    })

    it('callでもputでも同じ計算', () => {
      const callTrade = makeTrade({ trade_type: 'call', entry_price: 100, quantity: 2 })
      const putTrade = makeTrade({ trade_type: 'put', entry_price: 100, quantity: 2 })
      expect(calculateMaxLoss(callTrade, 'buy')).toBe(calculateMaxLoss(putTrade, 'buy'))
    })
  })

  describe('売りポジション (sell)', () => {
    it('コール売り: strike_price * 10% * quantity * 1000', () => {
      const trade = makeTrade({
        trade_type: 'call',
        strike_price: 39000,
        quantity: 1,
        entry_price: 150,
      })
      const result = calculateMaxLoss(trade, 'sell')
      // strike_price の ±10% 変動時の損失
      // コール売り: 原資産が+10%上昇 → 損失 = strike_price * 0.1 * quantity * 1000 - premium
      // ただし最低0（プレミアム受取分を差し引く）
      expect(result).toBe(39000 * 0.1 * 1 * 1000 - 150 * 1 * 1000)
    })

    it('プット売り: strike_price * 10% * quantity * 1000', () => {
      const trade = makeTrade({
        trade_type: 'put',
        strike_price: 39000,
        quantity: 1,
        entry_price: 200,
      })
      const result = calculateMaxLoss(trade, 'sell')
      // プット売り: 原資産が-10%下落 → 損失 = strike_price * 0.1 * quantity * 1000 - premium
      expect(result).toBe(39000 * 0.1 * 1 * 1000 - 200 * 1 * 1000)
    })

    it('プレミアム受取で損失が相殺される場合でも最低0', () => {
      const trade = makeTrade({
        trade_type: 'call',
        strike_price: 1000,
        quantity: 1,
        entry_price: 500, // very high premium relative to strike
      })
      const result = calculateMaxLoss(trade, 'sell')
      // 1000 * 0.1 * 1 * 1000 - 500 * 1 * 1000 = 100,000 - 500,000 = negative → 0
      expect(result).toBe(0)
    })

    it('枚数が複数の場合', () => {
      const trade = makeTrade({
        trade_type: 'put',
        strike_price: 38000,
        quantity: 2,
        entry_price: 100,
      })
      const result = calculateMaxLoss(trade, 'sell')
      expect(result).toBe(38000 * 0.1 * 2 * 1000 - 100 * 2 * 1000)
    })
  })
})

describe('calculateTotalMaxLoss', () => {
  it('複数ポジションの合計最大損失を計算', () => {
    const trades = [
      makeTrade({ entry_price: 150, quantity: 1 }),
      makeTrade({ entry_price: 200, quantity: 2 }),
    ]
    // All treated as buy positions (default)
    const result = calculateTotalMaxLoss(trades)
    expect(result).toBe(150 * 1 * 1000 + 200 * 2 * 1000) // 150,000 + 400,000 = 550,000
  })

  it('空の配列は0を返す', () => {
    expect(calculateTotalMaxLoss([])).toBe(0)
  })

  it('1ポジションの場合', () => {
    const trades = [makeTrade({ entry_price: 300, quantity: 1 })]
    const result = calculateTotalMaxLoss(trades)
    expect(result).toBe(300 * 1 * 1000)
  })
})

describe('ミニオプション対応 (multiplier=100)', () => {
  it('買いポジション: ミニオプションの最大損失', () => {
    const trade = makeTrade({ entry_price: 150, quantity: 1 })
    const result = calculateMaxLoss(trade, 'buy', MULTIPLIER_MINI)
    expect(result).toBe(150 * 1 * 100) // 15,000円
  })

  it('売りポジション: ミニオプションの最大損失', () => {
    const trade = makeTrade({
      trade_type: 'call',
      strike_price: 39000,
      quantity: 1,
      entry_price: 150,
    })
    const result = calculateMaxLoss(trade, 'sell', MULTIPLIER_MINI)
    expect(result).toBe(39000 * 0.1 * 1 * 100 - 150 * 1 * 100)
  })

  it('通常オプション(1000)とミニオプション(100)で10倍の差', () => {
    const trade = makeTrade({ entry_price: 200, quantity: 1 })
    const standard = calculateMaxLoss(trade, 'buy', MULTIPLIER_STANDARD)
    const mini = calculateMaxLoss(trade, 'buy', MULTIPLIER_MINI)
    expect(standard).toBe(mini * 10)
  })

  it('合計最大損失: ミニオプション', () => {
    const trades = [
      makeTrade({ entry_price: 150, quantity: 1 }),
      makeTrade({ entry_price: 200, quantity: 2 }),
    ]
    const result = calculateTotalMaxLoss(trades, 'buy', MULTIPLIER_MINI)
    expect(result).toBe(150 * 1 * 100 + 200 * 2 * 100) // 15,000 + 40,000 = 55,000
  })
})
