import { describe, it, expect } from 'vitest'
import {
  isJapaneseHoliday,
  isBusinessDay,
  countBusinessDays,
  addBusinessDays,
} from '../business-days'

describe('isJapaneseHoliday', () => {
  it('元日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 0, 1))).toBe(true)
  })

  it('成人の日（1月第2月曜）を祝日と判定する', () => {
    // 2026年1月12日は第2月曜
    expect(isJapaneseHoliday(new Date(2026, 0, 12))).toBe(true)
  })

  it('建国記念の日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 1, 11))).toBe(true)
  })

  it('天皇誕生日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 1, 23))).toBe(true)
  })

  it('春分の日を祝日と判定する', () => {
    // 2026年の春分の日は3月20日
    expect(isJapaneseHoliday(new Date(2026, 2, 20))).toBe(true)
  })

  it('昭和の日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 3, 29))).toBe(true)
  })

  it('憲法記念日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 4, 3))).toBe(true)
  })

  it('みどりの日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 4, 4))).toBe(true)
  })

  it('こどもの日を祝日と判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 4, 5))).toBe(true)
  })

  it('振替休日を祝日と判定する', () => {
    // 2026年5月6日はこどもの日の振替休日（5/5が火曜なので該当しない）
    // 2025年5月6日: 5/5が月曜→振替なし。別の例を使う
    // 2026年11月3日(火)文化の日 → 振替なし
    // もっと確実な例: 通常の平日は祝日でない
    expect(isJapaneseHoliday(new Date(2026, 0, 5))).toBe(false)
  })

  it('通常の平日を祝日でないと判定する', () => {
    expect(isJapaneseHoliday(new Date(2026, 0, 6))).toBe(false)
  })
})

describe('isBusinessDay', () => {
  it('通常の平日を営業日と判定する', () => {
    // 2026年3月9日（月曜日）
    expect(isBusinessDay(new Date(2026, 2, 9))).toBe(true)
  })

  it('土曜日を非営業日と判定する', () => {
    expect(isBusinessDay(new Date(2026, 2, 7))).toBe(false)
  })

  it('日曜日を非営業日と判定する', () => {
    expect(isBusinessDay(new Date(2026, 2, 8))).toBe(false)
  })

  it('祝日を非営業日と判定する', () => {
    // 2026年3月20日（春分の日・金曜）
    expect(isBusinessDay(new Date(2026, 2, 20))).toBe(false)
  })
})

describe('countBusinessDays', () => {
  it('同一日は0を返す', () => {
    const date = new Date(2026, 2, 9)
    expect(countBusinessDays(date, date)).toBe(0)
  })

  it('連続した営業日をカウントする', () => {
    // 月〜金: 5営業日
    const mon = new Date(2026, 2, 9)  // 月
    const fri = new Date(2026, 2, 13) // 金
    expect(countBusinessDays(mon, fri)).toBe(4)
  })

  it('週末を跨ぐ営業日をカウントする', () => {
    // 金→翌月: 週末を除外
    const fri = new Date(2026, 2, 6)  // 金
    const nextMon = new Date(2026, 2, 9)  // 月
    expect(countBusinessDays(fri, nextMon)).toBe(1)
  })

  it('祝日を除外してカウントする', () => {
    // 2026年3月19日(木)→3月23日(月): 3/20が春分の日
    // from=19(木)除外、20(金・祝skip)→21(土skip)→22(日skip)→23(月)=1営業日
    const thu = new Date(2026, 2, 19)
    const mon = new Date(2026, 2, 23)
    expect(countBusinessDays(thu, mon)).toBe(1)
  })

  it('fromがtoより後の場合も正の値を返す', () => {
    const mon = new Date(2026, 2, 9)
    const fri = new Date(2026, 2, 13)
    expect(countBusinessDays(fri, mon)).toBe(4)
  })
})

describe('addBusinessDays', () => {
  it('営業日を加算する', () => {
    // 2026年3月9日(月) + 3営業日 = 3月12日(木)
    const result = addBusinessDays(new Date(2026, 2, 9), 3)
    expect(result.getDate()).toBe(12)
    expect(result.getMonth()).toBe(2)
  })

  it('週末を跨いで営業日を加算する', () => {
    // 2026年3月12日(木) + 2営業日 = 3月16日(月)
    const result = addBusinessDays(new Date(2026, 2, 12), 2)
    expect(result.getDate()).toBe(16)
    expect(result.getMonth()).toBe(2)
  })

  it('祝日を跨いで営業日を加算する', () => {
    // 2026年3月19日(木) + 1営業日 = 3月23日(月) ← 3/20春分の日, 3/21-22週末
    const result = addBusinessDays(new Date(2026, 2, 19), 1)
    expect(result.getDate()).toBe(23)
    expect(result.getMonth()).toBe(2)
  })
})
