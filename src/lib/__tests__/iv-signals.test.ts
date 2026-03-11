import { describe, it, expect } from 'vitest'
import {
  evaluateIVSignal,
  type IVSignalInput,
  type IVSignalResult,
} from '../iv-signals'

describe('evaluateIVSignal', () => {
  const baseInput: IVSignalInput = {
    currentIV: 20,
    avg20dIV: 25,
    avg60dIV: 23, // 20/23 = 13%低い（強買い閾値20%未満）
    strikePrice: 38000,
    spotPrice: 38000,
    remainingBusinessDays: 20,
    evaluationDate: new Date(2026, 2, 2), // SQ週でない日
  }

  describe('通常買いシグナル', () => {
    it('現在IVが20日平均より15%以上低い場合に買いシグナルを出す', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 24, // 20/24 = 0.833... → 16.7%低い
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('buy')
      expect(result.message).toContain('IV低下')
    })

    it('現在IVが20日平均より14%低い場合はシグナルなし', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 21.5,
        avg20dIV: 25, // 21.5/25 = 0.86 → 14%低い
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('none')
    })
  })

  describe('強買いシグナル', () => {
    it('現在IVが60日平均より20%以上低く、20日平均も下回る場合に強買いシグナルを出す', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 22,
        avg60dIV: 26, // 20/26 = 0.769... → 23%低い
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('strong_buy')
      expect(result.message).toContain('強IVシグナル')
    })

    it('60日平均より20%低いが20日平均を上回る場合は強買いにならない', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 22,
        avg20dIV: 21, // 20日平均を上回っている
        avg60dIV: 28, // 22/28 = 0.786 → 21.4%低い
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).not.toBe('strong_buy')
    })
  })

  describe('売りシグナル', () => {
    it('現在IVが20日平均より20%以上高い場合に売りシグナルを出す', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 30,
        avg20dIV: 24, // 30/24 = 1.25 → 25%高い
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('sell')
      expect(result.message).toContain('IV上昇')
    })
  })

  describe('SQ週フィルタ', () => {
    it('SQ前3営業日以内はシグナル閾値が緩和される', () => {
      // 通常なら買いシグナルが出るケース
      const normalInput: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 24, // 16.7%低い → 通常なら買いシグナル
        evaluationDate: new Date(2026, 2, 2), // SQ週でない
      }
      const normalResult = evaluateIVSignal(normalInput)
      expect(normalResult.signal).toBe('buy')

      // SQ週では同じ条件でシグナルが出ない
      const sqWeekInput: IVSignalInput = {
        ...normalInput,
        evaluationDate: new Date(2026, 2, 11), // SQ前2営業日
      }
      const sqResult = evaluateIVSignal(sqWeekInput)
      expect(sqResult.signal).toBe('none')
      expect(sqResult.sqWeekFilter).toBe(true)
    })

    it('SQ週でも十分に強いシグナルは出す', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 15,
        avg20dIV: 25, // 40%低い → 非常に強いシグナル
        avg60dIV: 28,
        evaluationDate: new Date(2026, 2, 11), // SQ前2営業日
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).not.toBe('none')
    })
  })

  describe('残存日数フィルタ', () => {
    it('残存5営業日未満のオプションを除外する', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 24,
        remainingBusinessDays: 4,
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('none')
      expect(result.filtered).toBe(true)
      expect(result.filterReason).toContain('残存')
    })

    it('残存5営業日以上のオプションは除外しない', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 24,
        remainingBusinessDays: 5,
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('buy')
    })
  })

  describe('ATMフィルタ', () => {
    it('ATMから±2000円以内のオプションはシグナルを出す', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 24,
        strikePrice: 40000,
        spotPrice: 38500, // 差: 1500円
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('buy')
    })

    it('ATMから±2000円超のオプションを除外する', () => {
      const input: IVSignalInput = {
        ...baseInput,
        currentIV: 20,
        avg20dIV: 24,
        strikePrice: 41000,
        spotPrice: 38000, // 差: 3000円
      }
      const result = evaluateIVSignal(input)
      expect(result.signal).toBe('none')
      expect(result.filtered).toBe(true)
      expect(result.filterReason).toContain('ATM')
    })
  })
})
