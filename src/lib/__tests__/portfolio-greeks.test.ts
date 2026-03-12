import { describe, it, expect } from 'vitest'
import {
  aggregatePortfolioGreeks,
  calculateDeltaNeutralDeviation,
  type PositionGreeks,
} from '../greeks'

describe('aggregatePortfolioGreeks', () => {
  it('0件の場合は全て0を返す', () => {
    const result = aggregatePortfolioGreeks([])
    expect(result).toEqual({ delta: 0, gamma: 0, theta: 0, vega: 0 })
  })

  it('単一ポジションのGreeksをそのまま返す', () => {
    const positions: PositionGreeks[] = [
      { delta: 0.5, gamma: 0.001, theta: -5.0, vega: 12.0, quantity: 1 },
    ]
    const result = aggregatePortfolioGreeks(positions)
    expect(result.delta).toBeCloseTo(0.5, 4)
    expect(result.gamma).toBeCloseTo(0.001, 6)
    expect(result.theta).toBeCloseTo(-5.0, 2)
    expect(result.vega).toBeCloseTo(12.0, 2)
  })

  it('複数ポジションのGreeksを数量加重で合算する', () => {
    const positions: PositionGreeks[] = [
      { delta: 0.5, gamma: 0.001, theta: -5.0, vega: 12.0, quantity: 2 },
      { delta: -0.3, gamma: 0.0008, theta: -3.0, vega: 8.0, quantity: 3 },
    ]
    const result = aggregatePortfolioGreeks(positions)
    // delta: 0.5*2 + (-0.3)*3 = 1.0 - 0.9 = 0.1
    expect(result.delta).toBeCloseTo(0.1, 4)
    // gamma: 0.001*2 + 0.0008*3 = 0.002 + 0.0024 = 0.0044
    expect(result.gamma).toBeCloseTo(0.0044, 6)
    // theta: -5.0*2 + (-3.0)*3 = -10 + (-9) = -19
    expect(result.theta).toBeCloseTo(-19.0, 2)
    // vega: 12.0*2 + 8.0*3 = 24 + 24 = 48
    expect(result.vega).toBeCloseTo(48.0, 2)
  })

  it('コールとプットの混合ポジションで正しく合算する', () => {
    const positions: PositionGreeks[] = [
      // コール買い（デルタ正）
      { delta: 0.6, gamma: 0.002, theta: -8.0, vega: 15.0, quantity: 1 },
      // プット買い（デルタ負）
      { delta: -0.4, gamma: 0.0015, theta: -6.0, vega: 10.0, quantity: 1 },
    ]
    const result = aggregatePortfolioGreeks(positions)
    // delta: 0.6 + (-0.4) = 0.2
    expect(result.delta).toBeCloseTo(0.2, 4)
    // gamma: 0.002 + 0.0015 = 0.0035
    expect(result.gamma).toBeCloseTo(0.0035, 6)
    // theta: -8.0 + (-6.0) = -14.0
    expect(result.theta).toBeCloseTo(-14.0, 2)
    // vega: 15.0 + 10.0 = 25.0
    expect(result.vega).toBeCloseTo(25.0, 2)
  })
})

describe('calculateDeltaNeutralDeviation', () => {
  it('デルタが0の場合、乖離度は0', () => {
    const result = calculateDeltaNeutralDeviation(0)
    expect(result.deviation).toBe(0)
    expect(result.isWarning).toBe(false)
  })

  it('デルタが閾値以下の場合、警告なし', () => {
    const result = calculateDeltaNeutralDeviation(0.3, 0.5)
    expect(result.deviation).toBeCloseTo(0.3, 4)
    expect(result.isWarning).toBe(false)
  })

  it('負のデルタでも絶対値で乖離度を計算する', () => {
    const result = calculateDeltaNeutralDeviation(-0.3, 0.5)
    expect(result.deviation).toBeCloseTo(0.3, 4)
    expect(result.isWarning).toBe(false)
  })

  it('デルタが閾値を超えた場合、警告あり', () => {
    const result = calculateDeltaNeutralDeviation(0.6, 0.5)
    expect(result.deviation).toBeCloseTo(0.6, 4)
    expect(result.isWarning).toBe(true)
  })

  it('負のデルタが閾値を超えた場合も警告あり', () => {
    const result = calculateDeltaNeutralDeviation(-0.8, 0.5)
    expect(result.deviation).toBeCloseTo(0.8, 4)
    expect(result.isWarning).toBe(true)
  })

  it('デフォルト閾値は0.5', () => {
    // 0.4 < 0.5 → 警告なし
    expect(calculateDeltaNeutralDeviation(0.4).isWarning).toBe(false)
    // 0.6 > 0.5 → 警告あり
    expect(calculateDeltaNeutralDeviation(0.6).isWarning).toBe(true)
  })

  it('カスタム閾値で判定する', () => {
    expect(calculateDeltaNeutralDeviation(0.2, 0.1).isWarning).toBe(true)
    expect(calculateDeltaNeutralDeviation(0.05, 0.1).isWarning).toBe(false)
  })
})
