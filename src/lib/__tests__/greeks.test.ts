import { describe, it, expect } from 'vitest'
import {
  calculateGreeks,
  calculateAllGreeks,
  aggregatePortfolioGreeks,
  calculateDeltaNeutralDeviation,
  type PositionGreeks,
} from '../greeks'
import type { BSInputs } from '../black-scholes'

const baseInputs: BSInputs = {
  spot: 38000,
  strike: 38000,
  timeToExpiry: 30 / 365,
  volatility: 0.20,
  riskFreeRate: 0.001,
  dividendYield: 0.02,
  optionType: 'call',
}

describe('calculateGreeks', () => {
  describe('edge cases', () => {
    it('returns zeros when timeToExpiry <= 0', () => {
      const greeks = calculateGreeks({ ...baseInputs, timeToExpiry: 0 })
      expect(greeks).toEqual({ delta: 0, gamma: 0, theta: 0, vega: 0 })
    })

    it('returns zeros when volatility <= 0', () => {
      const greeks = calculateGreeks({ ...baseInputs, volatility: 0 })
      expect(greeks).toEqual({ delta: 0, gamma: 0, theta: 0, vega: 0 })
    })

    it('returns zeros when timeToExpiry is negative', () => {
      const greeks = calculateGreeks({ ...baseInputs, timeToExpiry: -1 })
      expect(greeks).toEqual({ delta: 0, gamma: 0, theta: 0, vega: 0 })
    })
  })

  describe('call delta', () => {
    it('ATM call delta is approximately 0.5', () => {
      const greeks = calculateGreeks(baseInputs)
      expect(greeks.delta).toBeGreaterThan(0.4)
      expect(greeks.delta).toBeLessThan(0.6)
    })

    it('deep ITM call delta is near 1', () => {
      const greeks = calculateGreeks({
        ...baseInputs,
        spot: 42000,
        strike: 35000,
      })
      expect(greeks.delta).toBeGreaterThan(0.9)
    })

    it('deep OTM call delta is near 0', () => {
      const greeks = calculateGreeks({
        ...baseInputs,
        spot: 35000,
        strike: 42000,
      })
      expect(greeks.delta).toBeLessThan(0.1)
    })

    it('call delta is always positive', () => {
      const greeks = calculateGreeks(baseInputs)
      expect(greeks.delta).toBeGreaterThan(0)
    })
  })

  describe('put delta', () => {
    it('ATM put delta is approximately -0.5', () => {
      const greeks = calculateGreeks({ ...baseInputs, optionType: 'put' })
      expect(greeks.delta).toBeGreaterThan(-0.6)
      expect(greeks.delta).toBeLessThan(-0.4)
    })

    it('put delta is always negative', () => {
      const greeks = calculateGreeks({ ...baseInputs, optionType: 'put' })
      expect(greeks.delta).toBeLessThan(0)
    })
  })

  describe('gamma', () => {
    it('gamma is positive for both call and put', () => {
      const callGreeks = calculateGreeks(baseInputs)
      const putGreeks = calculateGreeks({ ...baseInputs, optionType: 'put' })
      expect(callGreeks.gamma).toBeGreaterThan(0)
      expect(putGreeks.gamma).toBeGreaterThan(0)
    })

    it('ATM gamma is highest (compared to OTM)', () => {
      const atm = calculateGreeks(baseInputs)
      const otm = calculateGreeks({ ...baseInputs, strike: 42000 })
      expect(atm.gamma).toBeGreaterThan(otm.gamma)
    })
  })

  describe('theta', () => {
    it('theta is negative for long options (time decay)', () => {
      const greeks = calculateGreeks(baseInputs)
      expect(greeks.theta).toBeLessThan(0)
    })

    it('theta is negative for puts as well', () => {
      const greeks = calculateGreeks({ ...baseInputs, optionType: 'put' })
      expect(greeks.theta).toBeLessThan(0)
    })

    it('theta uses intrinsic value when timeToExpiry < 1/365', () => {
      const greeks = calculateGreeks({
        ...baseInputs,
        timeToExpiry: 0.5 / 365,
        spot: 39000,
        strike: 38000,
      })
      // Should not throw and should return a number
      expect(typeof greeks.theta).toBe('number')
    })
  })

  describe('vega', () => {
    it('vega is positive', () => {
      const greeks = calculateGreeks(baseInputs)
      expect(greeks.vega).toBeGreaterThan(0)
    })

    it('call and put have same vega (ATM)', () => {
      const callVega = calculateGreeks(baseInputs).vega
      const putVega = calculateGreeks({ ...baseInputs, optionType: 'put' }).vega
      expect(callVega).toBeCloseTo(putVega, 1)
    })
  })
})

describe('calculateAllGreeks', () => {
  it('is an alias for calculateGreeks', () => {
    const g1 = calculateGreeks(baseInputs)
    const g2 = calculateAllGreeks(baseInputs)
    expect(g1).toEqual(g2)
  })
})

describe('aggregatePortfolioGreeks', () => {
  it('returns zeros for empty positions', () => {
    expect(aggregatePortfolioGreeks([])).toEqual({
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
    })
  })

  it('sums greeks weighted by quantity', () => {
    const positions: PositionGreeks[] = [
      { delta: 0.5, gamma: 0.001, theta: -10, vega: 5, quantity: 2 },
      { delta: -0.4, gamma: 0.0008, theta: -8, vega: 4, quantity: 3 },
    ]
    const result = aggregatePortfolioGreeks(positions)
    // delta: 0.5*2 + (-0.4)*3 = 1.0 - 1.2 = -0.2
    expect(result.delta).toBeCloseTo(-0.2, 4)
    // gamma: 0.001*2 + 0.0008*3 = 0.002 + 0.0024 = 0.0044
    expect(result.gamma).toBeCloseTo(0.0044, 6)
    // theta: -10*2 + -8*3 = -20 + -24 = -44
    expect(result.theta).toBeCloseTo(-44, 2)
    // vega: 5*2 + 4*3 = 10 + 12 = 22
    expect(result.vega).toBeCloseTo(22, 2)
  })

  it('handles single position', () => {
    const positions: PositionGreeks[] = [
      { delta: 0.5, gamma: 0.001, theta: -10, vega: 5, quantity: 1 },
    ]
    const result = aggregatePortfolioGreeks(positions)
    expect(result.delta).toBeCloseTo(0.5, 4)
    expect(result.gamma).toBeCloseTo(0.001, 6)
    expect(result.theta).toBeCloseTo(-10, 2)
    expect(result.vega).toBeCloseTo(5, 2)
  })
})

describe('calculateDeltaNeutralDeviation', () => {
  it('returns absolute value of delta as deviation', () => {
    const result = calculateDeltaNeutralDeviation(-0.3)
    expect(result.deviation).toBeCloseTo(0.3, 4)
  })

  it('isWarning is true when deviation exceeds threshold', () => {
    const result = calculateDeltaNeutralDeviation(0.6)
    expect(result.isWarning).toBe(true)
  })

  it('isWarning is false when deviation is within threshold', () => {
    const result = calculateDeltaNeutralDeviation(0.3)
    expect(result.isWarning).toBe(false)
  })

  it('isWarning is false when deviation equals threshold', () => {
    const result = calculateDeltaNeutralDeviation(0.5)
    expect(result.isWarning).toBe(false)
  })

  it('uses custom threshold', () => {
    const result = calculateDeltaNeutralDeviation(0.25, 0.2)
    expect(result.isWarning).toBe(true)
  })

  it('handles zero delta', () => {
    const result = calculateDeltaNeutralDeviation(0)
    expect(result.deviation).toBe(0)
    expect(result.isWarning).toBe(false)
  })
})
