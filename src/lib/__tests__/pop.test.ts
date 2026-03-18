import { describe, it, expect } from 'vitest'
import { calculatePOP, calculateSpreadPOP, type POPInput, type SpreadPOPInput } from '../pop'

describe('calculatePOP', () => {
  const baseInput: POPInput = {
    spot: 38500,
    strike: 39000,
    entryPrice: 150,
    timeToExpiry: 30 / 365, // 30 days
    volatility: 0.20,
    riskFreeRate: 0.001,
    dividendYield: 0.02,
    optionType: 'call',
    side: 'buy',
  }

  it('should return POP between 0 and 100 for long call', () => {
    const pop = calculatePOP(baseInput)
    expect(pop).toBeGreaterThan(0)
    expect(pop).toBeLessThan(100)
  })

  it('should return POP between 0 and 100 for long put', () => {
    const pop = calculatePOP({
      ...baseInput,
      optionType: 'put',
      strike: 38000,
    })
    expect(pop).toBeGreaterThan(0)
    expect(pop).toBeLessThan(100)
  })

  it('should return higher POP for ITM long call than OTM long call', () => {
    const itmPop = calculatePOP({
      ...baseInput,
      strike: 37000, // deep ITM
    })
    const otmPop = calculatePOP({
      ...baseInput,
      strike: 41000, // deep OTM
    })
    expect(itmPop).toBeGreaterThan(otmPop)
  })

  it('should return higher POP for short options than long options (same params)', () => {
    const longPop = calculatePOP({
      ...baseInput,
      side: 'buy',
    })
    const shortPop = calculatePOP({
      ...baseInput,
      side: 'sell',
    })
    // Short option sellers profit when buyers lose
    expect(shortPop).toBeGreaterThan(longPop)
    expect(shortPop + longPop).toBeCloseTo(100, 0)
  })

  it('should return POP close to 0 for extremely OTM long call', () => {
    const pop = calculatePOP({
      ...baseInput,
      strike: 50000,
      entryPrice: 1,
    })
    expect(pop).toBeLessThan(5)
  })

  it('should return POP close to 100 for deep ITM long call', () => {
    // strike=30000, spot=38500, premium=8600 -> breakeven=38600 (near ATM)
    // Use a small premium so breakeven stays deep ITM
    const pop = calculatePOP({
      ...baseInput,
      strike: 30000,
      entryPrice: 100,
    })
    expect(pop).toBeGreaterThan(90)
  })

  it('should handle zero time to expiry', () => {
    const pop = calculatePOP({
      ...baseInput,
      timeToExpiry: 0,
    })
    expect(pop).toBeGreaterThanOrEqual(0)
    expect(pop).toBeLessThanOrEqual(100)
  })

  it('should handle very short time to expiry', () => {
    const pop = calculatePOP({
      ...baseInput,
      timeToExpiry: 1 / 365, // 1 day
    })
    expect(pop).toBeGreaterThanOrEqual(0)
    expect(pop).toBeLessThanOrEqual(100)
  })

  it('should return result rounded to 1 decimal place', () => {
    const pop = calculatePOP(baseInput)
    const decimalPlaces = (pop.toString().split('.')[1] || '').length
    expect(decimalPlaces).toBeLessThanOrEqual(1)
  })
})

describe('calculateSpreadPOP', () => {
  it('should calculate POP for a bull call spread', () => {
    const input: SpreadPOPInput = {
      spot: 38500,
      timeToExpiry: 30 / 365,
      volatility: 0.20,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      legs: [
        { strike: 38500, optionType: 'call', side: 'buy', premium: 500 },
        { strike: 39500, optionType: 'call', side: 'sell', premium: 200 },
      ],
    }
    const pop = calculateSpreadPOP(input)
    expect(pop).toBeGreaterThan(0)
    expect(pop).toBeLessThan(100)
  })

  it('should calculate POP for a bear put spread', () => {
    const input: SpreadPOPInput = {
      spot: 38500,
      timeToExpiry: 30 / 365,
      volatility: 0.20,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      legs: [
        { strike: 38500, optionType: 'put', side: 'buy', premium: 500 },
        { strike: 37500, optionType: 'put', side: 'sell', premium: 200 },
      ],
    }
    const pop = calculateSpreadPOP(input)
    expect(pop).toBeGreaterThan(0)
    expect(pop).toBeLessThan(100)
  })

  it('should return POP for a single leg matching calculatePOP', () => {
    const input: SpreadPOPInput = {
      spot: 38500,
      timeToExpiry: 30 / 365,
      volatility: 0.20,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      legs: [
        { strike: 39000, optionType: 'call', side: 'buy', premium: 150 },
      ],
    }
    const spreadPop = calculateSpreadPOP(input)

    const singlePop = calculatePOP({
      spot: 38500,
      strike: 39000,
      entryPrice: 150,
      timeToExpiry: 30 / 365,
      volatility: 0.20,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      optionType: 'call',
      side: 'buy',
    })
    expect(spreadPop).toBeCloseTo(singlePop, 0)
  })

  it('should handle credit spread (net credit)', () => {
    // Iron condor-like: sell ATM, buy OTM
    const input: SpreadPOPInput = {
      spot: 38500,
      timeToExpiry: 30 / 365,
      volatility: 0.20,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      legs: [
        { strike: 39000, optionType: 'call', side: 'sell', premium: 300 },
        { strike: 40000, optionType: 'call', side: 'buy', premium: 100 },
      ],
    }
    const pop = calculateSpreadPOP(input)
    expect(pop).toBeGreaterThan(0)
    expect(pop).toBeLessThan(100)
  })

  it('should return result between 0 and 100', () => {
    const input: SpreadPOPInput = {
      spot: 38500,
      timeToExpiry: 30 / 365,
      volatility: 0.20,
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      legs: [
        { strike: 38500, optionType: 'call', side: 'buy', premium: 500 },
        { strike: 39500, optionType: 'call', side: 'sell', premium: 200 },
      ],
    }
    const pop = calculateSpreadPOP(input)
    expect(pop).toBeGreaterThanOrEqual(0)
    expect(pop).toBeLessThanOrEqual(100)
  })
})
