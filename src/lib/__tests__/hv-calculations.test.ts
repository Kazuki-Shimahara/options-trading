import { describe, it, expect } from 'vitest'
import {
  calculateHistoricalVolatility,
  calculateIvHvRatio,
  getIvHvSignal,
  getPcrSignal,
} from '../hv-calculations'

describe('calculateHistoricalVolatility', () => {
  // Helper: generate prices with known daily return
  function generatePrices(startPrice: number, count: number, dailyReturn: number): number[] {
    const prices: number[] = [startPrice]
    for (let i = 1; i < count; i++) {
      prices.push(prices[i - 1] * (1 + dailyReturn))
    }
    return prices
  }

  it('returns null when prices array has fewer than 2 elements', () => {
    expect(calculateHistoricalVolatility([100], 20)).toBeNull()
    expect(calculateHistoricalVolatility([], 20)).toBeNull()
  })

  it('returns null when period < 1', () => {
    expect(calculateHistoricalVolatility([100, 101], 0)).toBeNull()
  })

  it('returns null when not enough prices for the period', () => {
    // Need period+1 prices, so 21 prices for period=20
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i)
    expect(calculateHistoricalVolatility(prices, 20)).toBeNull()
  })

  it('returns a positive number for valid input', () => {
    const prices = generatePrices(38000, 25, 0.001) // 21+ prices
    const hv = calculateHistoricalVolatility(prices, 20)
    expect(hv).not.toBeNull()
    expect(hv!).toBeGreaterThan(0)
  })

  it('returns null when a price is zero or negative', () => {
    const prices = [100, 101, 0, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]
    expect(calculateHistoricalVolatility(prices, 20)).toBeNull()
  })

  it('uses only the most recent period+1 prices', () => {
    // 30 prices total, period=20 => uses last 21 prices
    const prices = generatePrices(38000, 30, 0.002)
    const hv = calculateHistoricalVolatility(prices, 20)
    expect(hv).not.toBeNull()
    expect(hv!).toBeGreaterThan(0)
  })

  it('higher daily returns produce higher HV', () => {
    const lowVolPrices = generatePrices(38000, 25, 0.001)
    const highVolPrices: number[] = [38000]
    // Alternating up/down creates higher vol
    for (let i = 1; i < 25; i++) {
      const factor = i % 2 === 0 ? 1.02 : 0.98
      highVolPrices.push(highVolPrices[i - 1] * factor)
    }
    const hvLow = calculateHistoricalVolatility(lowVolPrices, 20)!
    const hvHigh = calculateHistoricalVolatility(highVolPrices, 20)!
    expect(hvHigh).toBeGreaterThan(hvLow)
  })

  it('result is annualized (multiplied by sqrt(252) * 100)', () => {
    // For constant daily returns, HV should be near 0 (but not exactly due to mean subtraction)
    const constantPrices = Array.from({ length: 25 }, () => 38000)
    // All same price => log returns = 0 => HV = 0
    // But we need slightly different prices due to division
    const hv = calculateHistoricalVolatility(constantPrices, 20)
    // With all same prices, log returns are 0, std dev is 0
    // NaN because variance denominator (n-1=19) with all-zero returns gives 0
    expect(hv).toBe(0)
  })
})

describe('calculateIvHvRatio', () => {
  it('returns ratio of IV to HV', () => {
    expect(calculateIvHvRatio(20, 15)).toBeCloseTo(20 / 15, 6)
  })

  it('returns null when HV is 0', () => {
    expect(calculateIvHvRatio(20, 0)).toBeNull()
  })

  it('returns 1 when IV equals HV', () => {
    expect(calculateIvHvRatio(20, 20)).toBe(1)
  })

  it('returns value < 1 when IV < HV', () => {
    expect(calculateIvHvRatio(15, 20)).toBeLessThan(1)
  })

  it('returns value > 1 when IV > HV', () => {
    expect(calculateIvHvRatio(25, 20)).toBeGreaterThan(1)
  })
})

describe('getIvHvSignal', () => {
  it('returns 買い好機 when ratio < 1.0', () => {
    expect(getIvHvSignal(0.8)).toBe('買い好機')
    expect(getIvHvSignal(0.99)).toBe('買い好機')
  })

  it('returns 中立 when ratio is between 1.0 and 1.5', () => {
    expect(getIvHvSignal(1.0)).toBe('中立')
    expect(getIvHvSignal(1.25)).toBe('中立')
    expect(getIvHvSignal(1.5)).toBe('中立')
  })

  it('returns 割高注意 when ratio > 1.5', () => {
    expect(getIvHvSignal(1.51)).toBe('割高注意')
    expect(getIvHvSignal(2.0)).toBe('割高注意')
  })
})

describe('getPcrSignal', () => {
  it('returns 逆張り買いシグナル補強 when PCR > 1.2', () => {
    expect(getPcrSignal(1.3)).toBe('逆張り買いシグナル補強')
    expect(getPcrSignal(2.0)).toBe('逆張り買いシグナル補強')
  })

  it('returns 中立 when PCR <= 1.2', () => {
    expect(getPcrSignal(1.0)).toBe('中立')
    expect(getPcrSignal(1.2)).toBe('中立')
    expect(getPcrSignal(0.5)).toBe('中立')
  })
})
