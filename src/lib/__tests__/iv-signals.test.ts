import { describe, it, expect } from 'vitest'
import { detectSignal, calculateIVAverage, type IVSignalType } from '../iv-signals'

describe('calculateIVAverage', () => {
  it('IV配列の平均を正しく算出する', () => {
    expect(calculateIVAverage([20, 22, 24, 26, 28])).toBe(24)
  })

  it('単一要素の場合はその値を返す', () => {
    expect(calculateIVAverage([15])).toBe(15)
  })

  it('空配列の場合はnullを返す', () => {
    expect(calculateIVAverage([])).toBeNull()
  })

  it('小数点のIV値でも正しく計算する', () => {
    const result = calculateIVAverage([20.5, 21.5])
    expect(result).toBe(21)
  })
})

describe('detectSignal', () => {
  describe('通常買いシグナル', () => {
    it('現在IVが20日平均より15%以上低い場合に「通常買い」を返す', () => {
      // iv20Avg = 100, 15%低い = 85, iv60Avg = 100 → 85 <= 80? NO → 強買いにはならない
      const result = detectSignal(85, 100, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('normal_buy' satisfies IVSignalType)
      expect(result!.message).toBe('IV低下：買い検討タイミング')
    })

    it('ちょうど15%低い場合もシグナルを返す（境界値）', () => {
      // iv20Avg = 100, ちょうど15%低い = 85
      const result = detectSignal(85, 100, 80)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('normal_buy' satisfies IVSignalType)
    })

    it('14.9%低い場合はシグナルを返さない（境界値）', () => {
      // iv20Avg = 100, 14.9%低い = 85.1
      const result = detectSignal(85.1, 100, 80)
      expect(result).toBeNull()
    })
  })

  describe('強買いシグナル', () => {
    it('現在IVが60日平均より20%以上低く、かつ20日平均も下回る場合に「強買い」を返す', () => {
      // iv60Avg = 100, 20%低い = 80, iv20Avg = 90, currentIV = 75 (< 80 かつ < 90)
      const result = detectSignal(75, 90, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('strong_buy' satisfies IVSignalType)
      expect(result!.message).toBe('強IVシグナル：買い好機')
    })

    it('60日平均よりちょうど20%低く20日平均も下回る場合もシグナルを返す（境界値）', () => {
      // iv60Avg = 100, ちょうど20%低い = 80, iv20Avg = 90, currentIV = 80 (= 80 かつ < 90)
      const result = detectSignal(80, 90, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('strong_buy' satisfies IVSignalType)
    })

    it('60日平均より20%以上低いが20日平均を上回る場合は強買いにならない', () => {
      // iv60Avg = 100, currentIV = 79 (< 80) だが iv20Avg = 75 → currentIV > iv20Avg
      const result = detectSignal(79, 75, 100)
      // 20日平均より上 → 通常買いではない、強買い条件の20日平均下回りも不成立
      // ただし60日比は20%超低い... 20日平均を下回る必要あり
      expect(result).toBeNull()
    })

    it('強買い条件と通常買い条件の両方を満たす場合は強買いが優先される', () => {
      // iv20Avg = 100, iv60Avg = 100
      // currentIV = 75 → 20日平均比25%低い(>15%) かつ 60日平均比25%低い(>20%) かつ 20日平均下回る
      const result = detectSignal(75, 100, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('strong_buy' satisfies IVSignalType)
    })
  })

  describe('売りシグナル', () => {
    it('現在IVが20日平均より20%以上高い場合に「売り」を返す', () => {
      // iv20Avg = 100, 20%高い = 120 → currentIV >= 120 でシグナル
      const result = detectSignal(120, 100, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sell' satisfies IVSignalType)
      expect(result!.message).toBe('IV上昇：売り/ヘッジ検討')
    })

    it('ちょうど20%高い場合もシグナルを返す（境界値）', () => {
      const result = detectSignal(120, 100, 100)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sell' satisfies IVSignalType)
    })

    it('19.9%高い場合はシグナルを返さない（境界値）', () => {
      // iv20Avg = 100, 19.9%高い = 119.9
      const result = detectSignal(119.9, 100, 100)
      expect(result).toBeNull()
    })
  })

  describe('シグナルなし', () => {
    it('どの条件も満たさない場合はnullを返す', () => {
      // iv20Avg = 100, currentIV = 95 → 5%低い（15%未満）
      const result = detectSignal(95, 100, 100)
      expect(result).toBeNull()
    })

    it('IV値が平均とほぼ同じ場合はnullを返す', () => {
      const result = detectSignal(100, 100, 100)
      expect(result).toBeNull()
    })
  })
})
