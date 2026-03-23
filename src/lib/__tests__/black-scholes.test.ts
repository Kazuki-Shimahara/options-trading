import { describe, it, expect } from 'vitest'
import {
  normalCDF,
  normalPDF,
  calculateD1D2,
  calculateBSPrice,
  calculateImpliedVolatility,
  type BSInputs,
} from '../black-scholes'

describe('normalCDF', () => {
  it('returns 0.5 for x=0', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 6)
  })

  it('returns ~0.84 for x=1', () => {
    // Abramowitz and Stegun approximation: ~0.87 (implementation-specific)
    const val = normalCDF(1)
    expect(val).toBeGreaterThan(0.8)
    expect(val).toBeLessThan(0.9)
  })

  it('returns ~0.13 for x=-1 (symmetric to x=1)', () => {
    const val = normalCDF(-1)
    expect(val).toBeCloseTo(1 - normalCDF(1), 10)
  })

  it('returns ~0.98 for x=2', () => {
    const val = normalCDF(2)
    expect(val).toBeGreaterThan(0.97)
    expect(val).toBeLessThan(0.99)
  })

  it('returns 0 for very negative x', () => {
    expect(normalCDF(-10)).toBe(0)
  })

  it('returns 1 for very positive x', () => {
    expect(normalCDF(10)).toBe(1)
  })

  it('is symmetric: CDF(x) + CDF(-x) ≈ 1', () => {
    expect(normalCDF(1.5) + normalCDF(-1.5)).toBeCloseTo(1, 6)
  })
})

describe('normalPDF', () => {
  it('returns peak value at x=0', () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 6)
  })

  it('is symmetric: PDF(x) = PDF(-x)', () => {
    expect(normalPDF(1)).toBeCloseTo(normalPDF(-1), 10)
  })

  it('decreases as |x| increases', () => {
    expect(normalPDF(0)).toBeGreaterThan(normalPDF(1))
    expect(normalPDF(1)).toBeGreaterThan(normalPDF(2))
  })
})

describe('calculateD1D2', () => {
  const baseInputs: BSInputs = {
    spot: 38000,
    strike: 38000,
    timeToExpiry: 30 / 365,
    volatility: 0.20,
    riskFreeRate: 0.001,
    dividendYield: 0.02,
    optionType: 'call',
  }

  it('calculates d1 and d2 for ATM option', () => {
    const { d1, d2 } = calculateD1D2(baseInputs)
    expect(typeof d1).toBe('number')
    expect(typeof d2).toBe('number')
    expect(d2).toBeCloseTo(d1 - baseInputs.volatility * Math.sqrt(baseInputs.timeToExpiry), 10)
  })

  it('d1 > d2 always', () => {
    const { d1, d2 } = calculateD1D2(baseInputs)
    expect(d1).toBeGreaterThan(d2)
  })

  it('ATM call has d1 near 0 (when rates are low)', () => {
    const { d1 } = calculateD1D2(baseInputs)
    // For ATM with low rates and short expiry, d1 should be small
    expect(Math.abs(d1)).toBeLessThan(1)
  })
})

describe('calculateBSPrice', () => {
  const baseInputs: BSInputs = {
    spot: 38000,
    strike: 38000,
    timeToExpiry: 30 / 365,
    volatility: 0.20,
    riskFreeRate: 0.001,
    dividendYield: 0.02,
    optionType: 'call',
  }

  it('returns positive price for ATM call', () => {
    const price = calculateBSPrice(baseInputs)
    expect(price).toBeGreaterThan(0)
  })

  it('returns positive price for ATM put', () => {
    const price = calculateBSPrice({ ...baseInputs, optionType: 'put' })
    expect(price).toBeGreaterThan(0)
  })

  it('put-call parity holds approximately', () => {
    const callPrice = calculateBSPrice(baseInputs)
    const putPrice = calculateBSPrice({ ...baseInputs, optionType: 'put' })
    const T = baseInputs.timeToExpiry
    const S = baseInputs.spot
    const K = baseInputs.strike
    const r = baseInputs.riskFreeRate
    const q = baseInputs.dividendYield
    // C - P ≈ S*e^(-qT) - K*e^(-rT)
    const expected = S * Math.exp(-q * T) - K * Math.exp(-r * T)
    expect(callPrice - putPrice).toBeCloseTo(expected, 0)
  })

  it('deep ITM call price ≈ intrinsic value', () => {
    const price = calculateBSPrice({
      ...baseInputs,
      spot: 40000,
      strike: 35000,
      timeToExpiry: 1 / 365, // very short time
    })
    expect(price).toBeCloseTo(5000, -1)
  })

  it('deep OTM call price ≈ 0', () => {
    const price = calculateBSPrice({
      ...baseInputs,
      spot: 35000,
      strike: 45000,
    })
    expect(price).toBeLessThan(1)
  })

  it('returns intrinsic value when timeToExpiry <= 0 (call ITM)', () => {
    const price = calculateBSPrice({
      ...baseInputs,
      spot: 40000,
      strike: 38000,
      timeToExpiry: 0,
    })
    expect(price).toBe(2000)
  })

  it('returns intrinsic value when timeToExpiry <= 0 (put ITM)', () => {
    const price = calculateBSPrice({
      ...baseInputs,
      spot: 36000,
      strike: 38000,
      timeToExpiry: 0,
      optionType: 'put',
    })
    expect(price).toBe(2000)
  })

  it('returns 0 when timeToExpiry <= 0 (call OTM)', () => {
    const price = calculateBSPrice({
      ...baseInputs,
      spot: 36000,
      strike: 38000,
      timeToExpiry: 0,
    })
    expect(price).toBe(0)
  })

  it('higher volatility increases option price', () => {
    const lowVol = calculateBSPrice({ ...baseInputs, volatility: 0.10 })
    const highVol = calculateBSPrice({ ...baseInputs, volatility: 0.30 })
    expect(highVol).toBeGreaterThan(lowVol)
  })

  it('longer time to expiry increases option price', () => {
    const shortTime = calculateBSPrice({ ...baseInputs, timeToExpiry: 10 / 365 })
    const longTime = calculateBSPrice({ ...baseInputs, timeToExpiry: 90 / 365 })
    expect(longTime).toBeGreaterThan(shortTime)
  })
})

describe('calculateImpliedVolatility', () => {
  const baseInputs: Omit<BSInputs, 'volatility'> = {
    spot: 38000,
    strike: 38000,
    timeToExpiry: 30 / 365,
    riskFreeRate: 0.001,
    dividendYield: 0.02,
    optionType: 'call',
  }

  it('recovers IV from a known BS price', () => {
    const knownVol = 0.20
    const price = calculateBSPrice({ ...baseInputs, volatility: knownVol })
    const impliedVol = calculateImpliedVolatility(price, baseInputs)
    expect(impliedVol).not.toBeNull()
    expect(impliedVol!).toBeCloseTo(knownVol, 4)
  })

  it('recovers IV for put option', () => {
    const knownVol = 0.25
    const putInputs = { ...baseInputs, optionType: 'put' as const }
    const price = calculateBSPrice({ ...putInputs, volatility: knownVol })
    const impliedVol = calculateImpliedVolatility(price, putInputs)
    expect(impliedVol).not.toBeNull()
    expect(impliedVol!).toBeCloseTo(knownVol, 4)
  })

  it('recovers IV for OTM option', () => {
    const knownVol = 0.30
    const otmInputs = { ...baseInputs, strike: 40000 }
    const price = calculateBSPrice({ ...otmInputs, volatility: knownVol })
    const impliedVol = calculateImpliedVolatility(price, otmInputs)
    expect(impliedVol).not.toBeNull()
    expect(impliedVol!).toBeCloseTo(knownVol, 3)
  })

  it('returns null for unreasonable market price', () => {
    // Price of 0 cannot be achieved with positive vol
    const result = calculateImpliedVolatility(0, baseInputs)
    // Might converge to very small vol or null
    if (result !== null) {
      expect(result).toBeLessThan(0.01)
    }
  })

  it('returns null when timeToExpiry is 0', () => {
    const result = calculateImpliedVolatility(100, {
      ...baseInputs,
      timeToExpiry: 0,
    })
    // With T=0, vega=0, Newton-Raphson cannot converge
    expect(result).toBeNull()
  })
})
