import { describe, it, expect } from 'vitest'
import {
  calculatePositionPayoff,
  calculateCombinedPayoff,
  findBreakevenPoints,
  findMaxProfit,
  findMaxLoss,
  generatePriceRange,
  tradesToPayoffPositions,
  type PayoffPosition,
} from '../payoff'
import type { Trade } from '../trade-schema'

describe('calculatePositionPayoff', () => {
  it('calculates long call payoff correctly', () => {
    const position: PayoffPosition = {
      trade_type: 'call',
      strike_price: 30000,
      entry_price: 500,
      quantity: 1,
      side: 'buy',
      is_mini: false,
    }

    // Below strike: lose premium
    expect(calculatePositionPayoff(position, 29000)).toBe(-500 * 1000)
    // At strike: lose premium
    expect(calculatePositionPayoff(position, 30000)).toBe(-500 * 1000)
    // At breakeven (strike + premium): zero
    expect(calculatePositionPayoff(position, 30500)).toBe(0)
    // Above breakeven: profit
    expect(calculatePositionPayoff(position, 31000)).toBe(500 * 1000)
  })

  it('calculates short call payoff correctly', () => {
    const position: PayoffPosition = {
      trade_type: 'call',
      strike_price: 30000,
      entry_price: 500,
      quantity: 1,
      side: 'sell',
      is_mini: false,
    }

    // Below strike: keep premium
    expect(calculatePositionPayoff(position, 29000)).toBe(500 * 1000)
    // At strike: keep premium
    expect(calculatePositionPayoff(position, 30000)).toBe(500 * 1000)
    // At breakeven: zero
    expect(calculatePositionPayoff(position, 30500)).toBe(0)
    // Above breakeven: loss
    expect(calculatePositionPayoff(position, 31000)).toBe(-500 * 1000)
  })

  it('calculates long put payoff correctly', () => {
    const position: PayoffPosition = {
      trade_type: 'put',
      strike_price: 30000,
      entry_price: 400,
      quantity: 1,
      side: 'buy',
      is_mini: false,
    }

    // Above strike: lose premium
    expect(calculatePositionPayoff(position, 31000)).toBe(-400 * 1000)
    // At strike: lose premium
    expect(calculatePositionPayoff(position, 30000)).toBe(-400 * 1000)
    // At breakeven (strike - premium): zero
    expect(calculatePositionPayoff(position, 29600)).toBe(0)
    // Below breakeven: profit
    expect(calculatePositionPayoff(position, 29000)).toBe(600 * 1000)
  })

  it('calculates short put payoff correctly', () => {
    const position: PayoffPosition = {
      trade_type: 'put',
      strike_price: 30000,
      entry_price: 400,
      quantity: 1,
      side: 'sell',
      is_mini: false,
    }

    // Above strike: keep premium
    expect(calculatePositionPayoff(position, 31000)).toBe(400 * 1000)
    // At strike: keep premium
    expect(calculatePositionPayoff(position, 30000)).toBe(400 * 1000)
    // At breakeven: zero
    expect(calculatePositionPayoff(position, 29600)).toBe(0)
    // Below breakeven: loss
    expect(calculatePositionPayoff(position, 29000)).toBe(-600 * 1000)
  })

  it('handles quantity > 1', () => {
    const position: PayoffPosition = {
      trade_type: 'call',
      strike_price: 30000,
      entry_price: 500,
      quantity: 3,
      side: 'buy',
      is_mini: false,
    }

    expect(calculatePositionPayoff(position, 29000)).toBe(-500 * 3 * 1000)
    expect(calculatePositionPayoff(position, 31000)).toBe(500 * 3 * 1000)
  })

  it('uses mini multiplier when is_mini is true', () => {
    const position: PayoffPosition = {
      trade_type: 'call',
      strike_price: 30000,
      entry_price: 500,
      quantity: 1,
      side: 'buy',
      is_mini: true,
    }

    // Mini uses 100 multiplier instead of 1000
    expect(calculatePositionPayoff(position, 29000)).toBe(-500 * 100)
    expect(calculatePositionPayoff(position, 31000)).toBe(500 * 100)
  })
})

describe('calculateCombinedPayoff', () => {
  it('combines multiple positions (bull call spread)', () => {
    const positions: PayoffPosition[] = [
      // Long call at 30000
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
      // Short call at 31000
      { trade_type: 'call', strike_price: 31000, entry_price: 200, quantity: 1, side: 'sell', is_mini: false },
    ]

    const prices = [29000, 30000, 30500, 31000, 32000]
    const result = calculateCombinedPayoff(positions, prices)

    // Net debit = 500 - 200 = 300
    // Below both strikes: lose net debit
    expect(result[0].payoff).toBe(-300 * 1000)
    // At lower strike: lose net debit
    expect(result[1].payoff).toBe(-300 * 1000)
    // Between strikes: partial profit
    expect(result[2].payoff).toBe(200 * 1000)
    // At upper strike: max profit = spread width - net debit = 1000 - 300 = 700
    expect(result[3].payoff).toBe(700 * 1000)
    // Above both strikes: max profit capped
    expect(result[4].payoff).toBe(700 * 1000)
  })

  it('combines straddle positions', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
      { trade_type: 'put', strike_price: 30000, entry_price: 400, quantity: 1, side: 'buy', is_mini: false },
    ]

    const prices = [28000, 29100, 30000, 30900, 32000]
    const result = calculateCombinedPayoff(positions, prices)

    // Total premium = 900
    // At strike: max loss = -900 * 1000
    expect(result[2].payoff).toBe(-900 * 1000)
    // Far below: put profit exceeds total premium
    expect(result[0].payoff).toBe((2000 - 900) * 1000)
    // Far above: call profit exceeds total premium
    expect(result[4].payoff).toBe((2000 - 900) * 1000)
  })

  it('includes individual position payoffs in result', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
      { trade_type: 'put', strike_price: 30000, entry_price: 400, quantity: 1, side: 'buy', is_mini: false },
    ]

    const result = calculateCombinedPayoff(positions, [29000])
    expect(result[0].positions).toHaveLength(2)
    expect(result[0].positions[0]).toBe(-500 * 1000)  // call OTM
    expect(result[0].positions[1]).toBe(600 * 1000)    // put ITM
  })
})

describe('findBreakevenPoints', () => {
  it('finds breakeven for a single long call', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
    ]

    const prices = Array.from({ length: 201 }, (_, i) => 29000 + i * 20)
    const data = calculateCombinedPayoff(positions, prices)
    const breakevens = findBreakevenPoints(data)

    expect(breakevens.length).toBe(1)
    expect(breakevens[0]).toBeCloseTo(30500, -1)
  })

  it('finds two breakeven points for a straddle', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
      { trade_type: 'put', strike_price: 30000, entry_price: 400, quantity: 1, side: 'buy', is_mini: false },
    ]

    const prices = Array.from({ length: 401 }, (_, i) => 28000 + i * 10)
    const data = calculateCombinedPayoff(positions, prices)
    const breakevens = findBreakevenPoints(data)

    expect(breakevens.length).toBe(2)
    // Lower breakeven: strike - total premium = 30000 - 900 = 29100
    expect(breakevens[0]).toBeCloseTo(29100, -1)
    // Upper breakeven: strike + total premium = 30000 + 900 = 30900
    expect(breakevens[1]).toBeCloseTo(30900, -1)
  })
})

describe('findMaxProfit / findMaxLoss', () => {
  it('finds max profit and max loss for long call', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
    ]

    const prices = Array.from({ length: 201 }, (_, i) => 28000 + i * 20)
    const data = calculateCombinedPayoff(positions, prices)

    const maxLoss = findMaxLoss(data)
    expect(maxLoss.value).toBe(-500 * 1000)

    const maxProfit = findMaxProfit(data)
    // Max profit is at the highest price in range
    expect(maxProfit.value).toBeGreaterThan(0)
  })

  it('finds bounded max profit for bull call spread', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
      { trade_type: 'call', strike_price: 31000, entry_price: 200, quantity: 1, side: 'sell', is_mini: false },
    ]

    const prices = Array.from({ length: 401 }, (_, i) => 28000 + i * 10)
    const data = calculateCombinedPayoff(positions, prices)

    const maxProfit = findMaxProfit(data)
    expect(maxProfit.value).toBe(700 * 1000)

    const maxLoss = findMaxLoss(data)
    expect(maxLoss.value).toBe(-300 * 1000)
  })
})

describe('generatePriceRange', () => {
  it('generates a range centered around strike prices', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
    ]

    const range = generatePriceRange(positions)
    expect(range.length).toBeGreaterThan(0)
    // Range should include the strike price
    expect(range.some((p) => p >= 30000)).toBe(true)
    // Range should extend below and above strike
    expect(range[0]).toBeLessThan(30000)
    expect(range[range.length - 1]).toBeGreaterThan(30000)
  })

  it('generates range covering all strikes for spread', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 28000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
      { trade_type: 'call', strike_price: 32000, entry_price: 200, quantity: 1, side: 'sell', is_mini: false },
    ]

    const range = generatePriceRange(positions)
    expect(range[0]).toBeLessThan(28000)
    expect(range[range.length - 1]).toBeGreaterThan(32000)
  })

  it('uses underlyingPrice when provided', () => {
    const positions: PayoffPosition[] = [
      { trade_type: 'call', strike_price: 30000, entry_price: 500, quantity: 1, side: 'buy', is_mini: false },
    ]

    const range = generatePriceRange(positions, 29500)
    // Should include underlying price area
    expect(range.some((p) => Math.abs(p - 29500) < 100)).toBe(true)
  })
})

describe('tradesToPayoffPositions', () => {
  const baseTrade: Trade = {
    id: '1',
    user_id: 'user1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    trade_date: '2025-01-01',
    trade_type: 'call',
    strike_price: 30000,
    expiry_date: '2025-02-14',
    quantity: 2,
    entry_price: 500,
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
  }

  it('converts trades to payoff positions with default buy side', () => {
    const result = tradesToPayoffPositions([baseTrade])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      trade_type: 'call',
      strike_price: 30000,
      entry_price: 500,
      quantity: 2,
      side: 'buy',
      is_mini: false,
    })
  })

  it('respects is_mini flag', () => {
    const miniTrade = { ...baseTrade, is_mini: true }
    const result = tradesToPayoffPositions([miniTrade])
    expect(result[0].is_mini).toBe(true)
  })

  it('allows overriding default side', () => {
    const result = tradesToPayoffPositions([baseTrade], 'sell')
    expect(result[0].side).toBe('sell')
  })
})
