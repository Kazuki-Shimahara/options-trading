import { describe, it, expect } from 'vitest'
import { calculatePnl } from '../trade'
import { MULTIPLIER_MINI } from '../constants'

describe('calculatePnl', () => {
  it('決済価格がある場合にPnLを計算する', () => {
    // (exit_price - entry_price) * quantity * 1000
    expect(calculatePnl(200, 150, 2)).toBe(100000) // (200-150)*2*1000
  })

  it('損失ケースでも正しく計算する', () => {
    expect(calculatePnl(100, 150, 1)).toBe(-50000) // (100-150)*1*1000
  })

  it('複数枚数で計算する', () => {
    expect(calculatePnl(300, 200, 5)).toBe(500000) // (300-200)*5*1000
  })

  it('小数点のプレミアムでも正しく計算する', () => {
    expect(calculatePnl(150.5, 100.25, 1)).toBe(50250) // (150.5-100.25)*1*1000
  })

  it('決済価格がnullの場合はnullを返す', () => {
    expect(calculatePnl(null, 150, 1)).toBeNull()
  })

  it('決済価格がundefinedの場合はnullを返す', () => {
    expect(calculatePnl(undefined, 150, 1)).toBeNull()
  })

  it('ミニオプション (multiplier=100) で計算する', () => {
    expect(calculatePnl(200, 150, 2, MULTIPLIER_MINI)).toBe(10000) // (200-150)*2*100
  })
})
