import { describe, it, expect } from 'vitest'
import {
  TradingStyle,
  type IvSignal,
  shouldNotify,
  getFilterDescription,
} from '../signal-filters'

describe('shouldNotify', () => {
  const makeSignal = (ivRank: number): IvSignal => ({
    ivRank,
    currentIv: 20,
    timestamp: '2026-03-11T00:00:00Z',
  })

  describe('買い中心スタイル', () => {
    it('IVランク25以下のシグナルを通知する', () => {
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(25))).toBe(true)
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(10))).toBe(true)
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(0))).toBe(true)
    })

    it('IVランク25超のシグナルを通知しない', () => {
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(26))).toBe(false)
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(50))).toBe(false)
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(100))).toBe(false)
    })
  })

  describe('売り中心スタイル', () => {
    it('IVランク50以上のシグナルを通知する', () => {
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(50))).toBe(true)
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(75))).toBe(true)
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(100))).toBe(true)
    })

    it('IVランク50未満のシグナルを通知しない', () => {
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(49))).toBe(false)
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(25))).toBe(false)
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(0))).toBe(false)
    })
  })

  describe('全表示スタイル', () => {
    it('全てのシグナルを通知する', () => {
      expect(shouldNotify(TradingStyle.All, makeSignal(0))).toBe(true)
      expect(shouldNotify(TradingStyle.All, makeSignal(25))).toBe(true)
      expect(shouldNotify(TradingStyle.All, makeSignal(50))).toBe(true)
      expect(shouldNotify(TradingStyle.All, makeSignal(100))).toBe(true)
    })
  })

  describe('境界値テスト', () => {
    it('IVランク25はちょうど買い中心の閾値に含まれる', () => {
      expect(shouldNotify(TradingStyle.BuyFocused, makeSignal(25))).toBe(true)
    })

    it('IVランク50はちょうど売り中心の閾値に含まれる', () => {
      expect(shouldNotify(TradingStyle.SellFocused, makeSignal(50))).toBe(true)
    })
  })
})

describe('getFilterDescription', () => {
  it('買い中心の説明を返す', () => {
    const desc = getFilterDescription(TradingStyle.BuyFocused)
    expect(desc).toContain('25')
  })

  it('売り中心の説明を返す', () => {
    const desc = getFilterDescription(TradingStyle.SellFocused)
    expect(desc).toContain('50')
  })

  it('全表示の説明を返す', () => {
    const desc = getFilterDescription(TradingStyle.All)
    expect(desc).toBeTruthy()
  })
})
