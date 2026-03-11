import { describe, it, expect } from 'vitest'
import {
  getSQDate,
  isMajorSQ,
  getBusinessDaysToSQ,
  isSQWeek,
  getSQWeekSensitivity,
} from '../sq-helper'

describe('getSQDate', () => {
  it('2026年3月の第2金曜日を正しく計算する', () => {
    const sq = getSQDate(2026, 3)
    expect(sq.getFullYear()).toBe(2026)
    expect(sq.getMonth()).toBe(2) // 0-based
    expect(sq.getDate()).toBe(13)
    expect(sq.getDay()).toBe(5) // Friday
  })

  it('2026年1月の第2金曜日を正しく計算する', () => {
    const sq = getSQDate(2026, 1)
    expect(sq.getDate()).toBe(9)
    expect(sq.getDay()).toBe(5)
  })

  it('2026年6月の第2金曜日を正しく計算する', () => {
    const sq = getSQDate(2026, 6)
    expect(sq.getDate()).toBe(12)
    expect(sq.getDay()).toBe(5)
  })

  it('2026年12月の第2金曜日を正しく計算する', () => {
    const sq = getSQDate(2026, 12)
    expect(sq.getDate()).toBe(11)
    expect(sq.getDay()).toBe(5)
  })
})

describe('isMajorSQ', () => {
  it('3月をメジャーSQと判定する', () => {
    expect(isMajorSQ(3)).toBe(true)
  })

  it('6月をメジャーSQと判定する', () => {
    expect(isMajorSQ(6)).toBe(true)
  })

  it('9月をメジャーSQと判定する', () => {
    expect(isMajorSQ(9)).toBe(true)
  })

  it('12月をメジャーSQと判定する', () => {
    expect(isMajorSQ(12)).toBe(true)
  })

  it('2月をメジャーSQでないと判定する', () => {
    expect(isMajorSQ(2)).toBe(false)
  })

  it('7月をメジャーSQでないと判定する', () => {
    expect(isMajorSQ(7)).toBe(false)
  })
})

describe('getBusinessDaysToSQ', () => {
  it('SQ当日は0を返す', () => {
    // 2026年3月13日(金) = SQ日
    const sqDay = new Date(2026, 2, 13)
    expect(getBusinessDaysToSQ(sqDay)).toBe(0)
  })

  it('SQ前日（木曜）は1を返す', () => {
    const thu = new Date(2026, 2, 12)
    expect(getBusinessDaysToSQ(thu)).toBe(1)
  })

  it('SQ前の月曜は4を返す', () => {
    // 2026年3月9日(月) → 3月13日(金)SQ = 4営業日
    const mon = new Date(2026, 2, 9)
    expect(getBusinessDaysToSQ(mon)).toBe(4)
  })

  it('SQ後の日付は次月のSQまでの営業日を返す', () => {
    // 2026年3月16日(月) → 次のSQは4月10日(金)
    const afterSQ = new Date(2026, 2, 16)
    const result = getBusinessDaysToSQ(afterSQ)
    expect(result).toBeGreaterThan(0)
  })
})

describe('isSQWeek', () => {
  it('SQ前3営業日以内をSQ週と判定する', () => {
    // 2026年3月11日(水) → SQ 3月13日(金) = 2営業日前
    expect(isSQWeek(new Date(2026, 2, 11))).toBe(true)
  })

  it('SQ前1営業日をSQ週と判定する', () => {
    // 2026年3月12日(木) → SQ 3月13日(金) = 1営業日前
    expect(isSQWeek(new Date(2026, 2, 12))).toBe(true)
  })

  it('SQ当日をSQ週と判定する', () => {
    expect(isSQWeek(new Date(2026, 2, 13))).toBe(true)
  })

  it('SQ前4営業日以上をSQ週でないと判定する', () => {
    // 2026年3月9日(月) → SQ 3月13日(金) = 4営業日前
    expect(isSQWeek(new Date(2026, 2, 9))).toBe(false)
  })

  it('SQ後をSQ週でないと判定する', () => {
    expect(isSQWeek(new Date(2026, 2, 16))).toBe(false)
  })
})

describe('getSQWeekSensitivity', () => {
  it('SQ週でない場合は感度1.0を返す', () => {
    // 2026年3月2日(月) → SQ 3月13日(金) = 遠い
    const result = getSQWeekSensitivity(new Date(2026, 2, 2))
    expect(result.multiplier).toBe(1.0)
    expect(result.isSQWeek).toBe(false)
  })

  it('SQ前3営業日は感度を下げる', () => {
    // 2026年3月11日(水) → SQ 3月13日(金) = 2営業日前
    const result = getSQWeekSensitivity(new Date(2026, 2, 11))
    expect(result.multiplier).toBeGreaterThan(1.0)
    expect(result.isSQWeek).toBe(true)
  })

  it('メジャーSQ月はさらに感度を下げる', () => {
    // 3月はメジャーSQ月
    const majorResult = getSQWeekSensitivity(new Date(2026, 2, 11))
    // 4月は非メジャーSQ月 - 2026年4月10日(金)がSQ、4月8日(水)がSQ前2営業日
    const minorResult = getSQWeekSensitivity(new Date(2026, 3, 8))
    expect(majorResult.multiplier).toBeGreaterThan(minorResult.multiplier)
  })

  it('SQ当日は最大の感度低下を適用する', () => {
    const result = getSQWeekSensitivity(new Date(2026, 2, 13))
    expect(result.multiplier).toBeGreaterThan(1.0)
    expect(result.daysToSQ).toBe(0)
  })
})
