export interface CalendarEvent {
  id: string
  date: Date
  title: string
  category: 'sq' | 'fomc' | 'boj' | 'employment' | 'cpi' | 'earnings' | 'other'
  importance: 'high' | 'medium' | 'low'
}

/** SQ日計算（毎月第2金曜日） */
export function getSQDate(year: number, month: number): Date {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1)
  const dayOfWeek = firstDay.getDay() // 0=Sun, 5=Fri
  // First Friday
  let firstFriday = 1 + ((5 - dayOfWeek + 7) % 7)
  // Second Friday
  const secondFriday = firstFriday + 7
  return new Date(year, month - 1, secondFriday)
}

/** メジャーSQ判定（3/6/9/12月） */
export function isMajorSQ(month: number): boolean {
  return [3, 6, 9, 12].includes(month)
}

/** 米雇用統計日（毎月第1金曜日） */
function getEmploymentDate(year: number, month: number): Date {
  const firstDay = new Date(year, month - 1, 1)
  const dayOfWeek = firstDay.getDay()
  const firstFriday = 1 + ((5 - dayOfWeek + 7) % 7)
  return new Date(year, month - 1, firstFriday)
}

/** 年間イベント生成 */
export function getEventsForYear(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = []

  // SQ日（毎月）
  for (let m = 1; m <= 12; m++) {
    const sqDate = getSQDate(year, m)
    const major = isMajorSQ(m)
    events.push({
      id: `sq-${year}-${m}`,
      date: sqDate,
      title: major ? `メジャーSQ（${m}月）` : `SQ日（${m}月）`,
      category: 'sq',
      importance: major ? 'high' : 'medium',
    })
  }

  // 米雇用統計（毎月第1金曜日）
  for (let m = 1; m <= 12; m++) {
    const empDate = getEmploymentDate(year, m)
    events.push({
      id: `emp-${year}-${m}`,
      date: empDate,
      title: `米雇用統計（${m}月）`,
      category: 'employment',
      importance: 'medium',
    })
  }

  // 2026年固有イベント
  if (year === 2026) {
    // FOMC
    const fomcDates: [number, number, number, number][] = [
      [1, 28, 1, 29],
      [3, 18, 3, 19],
      [5, 6, 5, 7],
      [6, 17, 6, 18],
      [7, 29, 7, 30],
      [9, 16, 9, 17],
      [11, 4, 11, 5],
      [12, 16, 12, 17],
    ]
    fomcDates.forEach(([m1, d1, m2, d2], i) => {
      events.push({
        id: `fomc-${year}-${i}-1`,
        date: new Date(year, m1 - 1, d1),
        title: 'FOMC（1日目）',
        category: 'fomc',
        importance: 'high',
      })
      events.push({
        id: `fomc-${year}-${i}-2`,
        date: new Date(year, m2 - 1, d2),
        title: 'FOMC（2日目）',
        category: 'fomc',
        importance: 'high',
      })
    })

    // 日銀金融政策決定会合
    const bojDates: [number, number, number, number][] = [
      [1, 23, 1, 24],
      [3, 13, 3, 14],
      [4, 30, 5, 1],
      [6, 12, 6, 13],
      [7, 30, 7, 31],
      [9, 18, 9, 19],
      [10, 29, 10, 30],
      [12, 18, 12, 19],
    ]
    bojDates.forEach(([m1, d1, m2, d2], i) => {
      events.push({
        id: `boj-${year}-${i}-1`,
        date: new Date(year, m1 - 1, d1),
        title: '日銀会合（1日目）',
        category: 'boj',
        importance: 'high',
      })
      events.push({
        id: `boj-${year}-${i}-2`,
        date: new Date(year, m2 - 1, d2),
        title: '日銀会合（2日目）',
        category: 'boj',
        importance: 'high',
      })
    })
  }

  // 日付順にソート
  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  return events
}

/** 指定月のイベント取得 */
export function getEventsForMonth(year: number, month: number): CalendarEvent[] {
  return getEventsForYear(year).filter(
    (e) => e.date.getFullYear() === year && e.date.getMonth() === month - 1
  )
}

/** 指定日のイベント取得 */
export function getEventsForDate(date: Date): CalendarEvent[] {
  const year = date.getFullYear()
  return getEventsForYear(year).filter(
    (e) =>
      e.date.getFullYear() === date.getFullYear() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getDate() === date.getDate()
  )
}

/** 指定期間内のイベント取得（取引入力時のサジェスト用） */
export function getEventsInRange(start: Date, end: Date): CalendarEvent[] {
  const startTime = start.getTime()
  const endTime = end.getTime()

  // 期間にまたがる年のイベントを収集
  const years = new Set<number>()
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y)
  }

  const allEvents: CalendarEvent[] = []
  years.forEach((y) => {
    allEvents.push(...getEventsForYear(y))
  })

  return allEvents.filter((e) => {
    const t = e.date.getTime()
    return t >= startTime && t <= endTime
  })
}
