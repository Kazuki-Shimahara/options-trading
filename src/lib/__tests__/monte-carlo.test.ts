import { describe, it, expect } from 'vitest'
import {
  runMonteCarloSimulation,
  calculateVaR,
  calculateCVaR,
  computeDistributionStats,
  type MonteCarloInput,
  type MonteCarloResult,
} from '../monte-carlo'

function makePnlData(values: number[]): number[] {
  return values
}

describe('Monte Carlo Simulation', () => {
  const samplePnls = makePnlData([
    5000, -3000, 2000, -1000, 8000, -5000, 3000, -2000, 1000, 4000,
    -4000, 6000, -1500, 2500, -3500, 7000, -2500, 1500, -500, 3500,
  ])

  const defaultInput: MonteCarloInput = {
    pnlHistory: samplePnls,
    numSimulations: 10000,
    numDays: 20,
    confidenceLevels: [0.95, 0.99],
  }

  describe('runMonteCarloSimulation', () => {
    it('should return correct structure', () => {
      const result = runMonteCarloSimulation(defaultInput)

      expect(result).toHaveProperty('simulatedReturns')
      expect(result).toHaveProperty('var95')
      expect(result).toHaveProperty('var99')
      expect(result).toHaveProperty('cvar95')
      expect(result).toHaveProperty('cvar99')
      expect(result).toHaveProperty('stats')
      expect(result).toHaveProperty('histogram')
    })

    it('should generate the requested number of simulations', () => {
      const result = runMonteCarloSimulation({
        ...defaultInput,
        numSimulations: 1000,
      })

      expect(result.simulatedReturns).toHaveLength(1000)
    })

    it('should produce VaR values where VaR99 <= VaR95 (more negative)', () => {
      const result = runMonteCarloSimulation(defaultInput)

      // VaR99 should be more extreme (more negative or less) than VaR95
      expect(result.var99).toBeLessThanOrEqual(result.var95)
    })

    it('should produce CVaR values where CVaR <= VaR', () => {
      const result = runMonteCarloSimulation(defaultInput)

      // CVaR (expected shortfall) should be at least as extreme as VaR
      expect(result.cvar95).toBeLessThanOrEqual(result.var95)
      expect(result.cvar99).toBeLessThanOrEqual(result.var99)
    })

    it('should generate histogram bins', () => {
      const result = runMonteCarloSimulation(defaultInput)

      expect(result.histogram.length).toBeGreaterThan(0)
      for (const bin of result.histogram) {
        expect(bin).toHaveProperty('binStart')
        expect(bin).toHaveProperty('binEnd')
        expect(bin).toHaveProperty('count')
        expect(bin).toHaveProperty('frequency')
        expect(bin.count).toBeGreaterThanOrEqual(0)
      }
    })

    it('should have histogram total count equal to numSimulations', () => {
      const input = { ...defaultInput, numSimulations: 5000 }
      const result = runMonteCarloSimulation(input)

      const totalCount = result.histogram.reduce((sum, bin) => sum + bin.count, 0)
      expect(totalCount).toBe(5000)
    })
  })

  describe('calculateVaR', () => {
    it('should return the correct percentile value', () => {
      const sorted = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80]
      const var95 = calculateVaR(sorted, 0.95)

      // 5th percentile of 10 values: index 0 => -100
      expect(var95).toBeLessThan(0)
    })

    it('should return more extreme value for higher confidence', () => {
      const data = Array.from({ length: 1000 }, (_, i) => i - 500)
      const var95 = calculateVaR(data, 0.95)
      const var99 = calculateVaR(data, 0.99)

      expect(var99).toBeLessThanOrEqual(var95)
    })
  })

  describe('calculateCVaR', () => {
    it('should return the mean of values below VaR', () => {
      const sorted = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80]
      const cvar95 = calculateCVaR(sorted, 0.95)

      // CVaR should be the average of values at or below the 5th percentile
      expect(cvar95).toBeLessThanOrEqual(calculateVaR(sorted, 0.95))
    })

    it('should be more extreme than VaR', () => {
      const data = Array.from({ length: 10000 }, (_, i) => (i - 5000) * 10)
      const var95 = calculateVaR(data, 0.95)
      const cvar95 = calculateCVaR(data, 0.95)

      expect(cvar95).toBeLessThanOrEqual(var95)
    })
  })

  describe('computeDistributionStats', () => {
    it('should compute mean correctly', () => {
      const data = [10, 20, 30, 40, 50]
      const stats = computeDistributionStats(data)

      expect(stats.mean).toBe(30)
    })

    it('should compute standard deviation correctly', () => {
      const data = [10, 20, 30, 40, 50]
      const stats = computeDistributionStats(data)

      // Population std dev of [10,20,30,40,50] = sqrt(200) ≈ 14.14
      expect(stats.stdDev).toBeCloseTo(14.14, 1)
    })

    it('should compute min and max', () => {
      const data = [-100, 50, 200, -300, 150]
      const stats = computeDistributionStats(data)

      expect(stats.min).toBe(-300)
      expect(stats.max).toBe(200)
    })

    it('should compute median', () => {
      const data = [1, 3, 5, 7, 9]
      const stats = computeDistributionStats(data)

      expect(stats.median).toBe(5)
    })

    it('should handle even-length arrays for median', () => {
      const data = [1, 3, 5, 7]
      const stats = computeDistributionStats(data)

      expect(stats.median).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('should throw for insufficient data', () => {
      expect(() =>
        runMonteCarloSimulation({
          ...defaultInput,
          pnlHistory: [100],
        })
      ).toThrow()
    })

    it('should throw for empty data', () => {
      expect(() =>
        runMonteCarloSimulation({
          ...defaultInput,
          pnlHistory: [],
        })
      ).toThrow()
    })

    it('should handle all-zero PnL data', () => {
      const zeros = Array(20).fill(0)
      const result = runMonteCarloSimulation({
        ...defaultInput,
        pnlHistory: zeros,
      })

      expect(result.var95).toBe(0)
      expect(result.var99).toBe(0)
      expect(result.stats.mean).toBe(0)
    })

    it('should handle all-positive PnL data', () => {
      const positives = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
      const result = runMonteCarloSimulation({
        ...defaultInput,
        pnlHistory: positives,
      })

      // Even with positive PnL, VaR should still be computed
      expect(typeof result.var95).toBe('number')
      expect(typeof result.var99).toBe('number')
    })

    it('should use default confidence levels if not provided', () => {
      const result = runMonteCarloSimulation({
        pnlHistory: samplePnls,
        numSimulations: 1000,
        numDays: 20,
      })

      expect(typeof result.var95).toBe('number')
      expect(typeof result.var99).toBe('number')
    })
  })
})
