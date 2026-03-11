/**
 * SQ週シグナル感度調整ヘルパー
 *
 * SQ前3営業日はガンマ・ベガが急変するため、シグナル感度を下げるフィルタを提供する。
 * - SQ日: 毎月第2金曜日
 * - メジャーSQ: 3/6/9/12月
 */

import { countBusinessDays, isBusinessDay } from './business-days'

/**
 * 指定年月のSQ日（第2金曜日）を返す
 * @param year 年
 * @param month 月（1-based）
 */
export function getSQDate(year: number, month: number): Date {
  const firstDay = new Date(year, month - 1, 1)
  const dayOfWeek = firstDay.getDay() // 0=Sun, 5=Fri
  const firstFriday = 1 + ((5 - dayOfWeek + 7) % 7)
  const secondFriday = firstFriday + 7
  return new Date(year, month - 1, secondFriday)
}

/**
 * メジャーSQ月（3/6/9/12月）かどうかを判定する
 */
export function isMajorSQ(month: number): boolean {
  return [3, 6, 9, 12].includes(month)
}

/**
 * 指定日から直近の（未来の）SQ日までの営業日数を返す
 * SQ当日は0を返す
 */
export function getBusinessDaysToSQ(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  // 今月のSQ日をチェック
  let sqDate = getSQDate(year, month)

  // 日付の比較（時刻を除外）
  const dateOnly = new Date(year, date.getMonth(), date.getDate())
  const sqOnly = new Date(sqDate.getFullYear(), sqDate.getMonth(), sqDate.getDate())

  if (dateOnly.getTime() === sqOnly.getTime()) {
    return 0
  }

  // 今月のSQがまだ来ていない場合
  if (dateOnly < sqOnly) {
    return countBusinessDays(dateOnly, sqOnly)
  }

  // 今月のSQが過ぎている場合、来月のSQを使う
  let nextMonth = month + 1
  let nextYear = year
  if (nextMonth > 12) {
    nextMonth = 1
    nextYear++
  }
  sqDate = getSQDate(nextYear, nextMonth)
  return countBusinessDays(dateOnly, sqDate)
}

/**
 * 指定日がSQ前3営業日以内かどうかを判定する
 */
export function isSQWeek(date: Date): boolean {
  const daysToSQ = getBusinessDaysToSQ(date)
  return daysToSQ >= 0 && daysToSQ <= 3
}

export interface SQWeekSensitivity {
  /** 閾値に適用する乗数（1.0 = 通常、>1.0 = 感度低下） */
  multiplier: number
  /** SQ週かどうか */
  isSQWeek: boolean
  /** SQまでの営業日数 */
  daysToSQ: number
  /** メジャーSQ月かどうか */
  isMajorSQ: boolean
}

/**
 * SQ週のシグナル感度調整パラメータを返す
 *
 * SQ前3営業日以内は閾値を緩和する（multiplierを上げる）。
 * - 通常: multiplier = 1.0（閾値そのまま）
 * - SQ前3営業日: multiplier = 1.3（閾値30%緩和）
 * - SQ前2営業日: multiplier = 1.5（閾値50%緩和）
 * - SQ前1営業日/当日: multiplier = 1.7（閾値70%緩和）
 * - メジャーSQ月はさらに+0.2
 */
export function getSQWeekSensitivity(date: Date): SQWeekSensitivity {
  const daysToSQ = getBusinessDaysToSQ(date)
  const sqWeek = daysToSQ >= 0 && daysToSQ <= 3

  if (!sqWeek) {
    return {
      multiplier: 1.0,
      isSQWeek: false,
      daysToSQ,
      isMajorSQ: false,
    }
  }

  // SQまでの距離に応じて感度を下げる
  let multiplier: number
  if (daysToSQ <= 1) {
    multiplier = 1.7
  } else if (daysToSQ === 2) {
    multiplier = 1.5
  } else {
    multiplier = 1.3
  }

  // 直近SQの月を取得
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const sqDate = getSQDate(year, month)
  const dateOnly = new Date(year, date.getMonth(), date.getDate())
  const sqOnly = new Date(sqDate.getFullYear(), sqDate.getMonth(), sqDate.getDate())

  let sqMonth: number
  if (dateOnly <= sqOnly) {
    sqMonth = month
  } else {
    sqMonth = month === 12 ? 1 : month + 1
  }

  const major = isMajorSQ(sqMonth)
  if (major) {
    multiplier += 0.2
  }

  return {
    multiplier,
    isSQWeek: true,
    daysToSQ,
    isMajorSQ: major,
  }
}
