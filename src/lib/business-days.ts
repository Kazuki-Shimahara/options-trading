/**
 * 営業日計算ユーティリティ
 *
 * 土日・日本の祝日を除外した営業日カウントを提供する。
 */

/**
 * 春分の日を計算する（簡易式）
 * 2000-2099年に対応
 */
function getVernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/**
 * 秋分の日を計算する（簡易式）
 * 2000-2099年に対応
 */
function getAutumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/**
 * ハッピーマンデー：指定月の第N月曜日を取得
 */
function getNthMonday(year: number, month: number, n: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay()
  // 最初の月曜日
  const firstMonday = firstDay <= 1 ? (1 - firstDay + 1) : (8 - firstDay + 1)
  return firstMonday + (n - 1) * 7
}

/**
 * 指定日が日本の祝日かどうかを判定する
 */
export function isJapaneseHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-based
  const day = date.getDate()
  const dayOfWeek = date.getDay()

  // 固定祝日
  const fixedHolidays: [number, number][] = [
    [1, 1],   // 元日
    [2, 11],  // 建国記念の日
    [2, 23],  // 天皇誕生日
    [4, 29],  // 昭和の日
    [5, 3],   // 憲法記念日
    [5, 4],   // みどりの日
    [5, 5],   // こどもの日
    [8, 11],  // 山の日
    [11, 3],  // 文化の日
    [11, 23], // 勤労感謝の日
  ]

  for (const [m, d] of fixedHolidays) {
    if (month === m && day === d) return true
  }

  // ハッピーマンデー
  if (month === 1 && day === getNthMonday(year, 1, 2)) return true  // 成人の日
  if (month === 7 && day === getNthMonday(year, 7, 3)) return true  // 海の日
  if (month === 9 && day === getNthMonday(year, 9, 3)) return true  // 敬老の日
  if (month === 10 && day === getNthMonday(year, 10, 2)) return true // スポーツの日

  // 春分の日・秋分の日
  if (month === 3 && day === getVernalEquinoxDay(year)) return true
  if (month === 9 && day === getAutumnalEquinoxDay(year)) return true

  // 振替休日: 祝日が日曜の場合、翌月曜が休日
  if (dayOfWeek === 1) { // 月曜日
    const yesterday = new Date(year, month - 1, day - 1)
    if (yesterday.getDay() === 0) { // 前日が日曜
      // 前日が祝日かチェック（再帰回避のため直接チェック）
      const yMonth = yesterday.getMonth() + 1
      const yDay = yesterday.getDate()
      for (const [m, d] of fixedHolidays) {
        if (yMonth === m && yDay === d) return true
      }
      if (yMonth === 3 && yDay === getVernalEquinoxDay(year)) return true
      if (yMonth === 9 && yDay === getAutumnalEquinoxDay(year)) return true
    }
  }

  // 国民の休日: 祝日と祝日に挟まれた平日
  // 9月の敬老の日と秋分の日の間（まれに発生）
  if (month === 9) {
    const keirouDay = getNthMonday(year, 9, 3)
    const equinoxDay = getAutumnalEquinoxDay(year)
    if (day === keirouDay + 1 && day === equinoxDay - 1) return true
  }

  return false
}

/**
 * 指定日が営業日（土日・祝日でない）かどうかを判定する
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return false
  return !isJapaneseHoliday(date)
}

/**
 * 2つの日付間の営業日数をカウントする
 * fromの翌日からtoまで（to含む）の営業日数を返す。
 * fromとtoのどちらが先でも正の値を返す。
 */
export function countBusinessDays(from: Date, to: Date): number {
  const start = new Date(Math.min(from.getTime(), to.getTime()))
  const end = new Date(Math.max(from.getTime(), to.getTime()))

  let count = 0
  const current = new Date(start)
  current.setDate(current.getDate() + 1)

  while (current <= end) {
    if (isBusinessDay(current)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * 指定日から営業日を加算した日付を返す
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = days

  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result)) {
      remaining--
    }
  }

  return result
}
