export type EventCategory =
  | 'sq'
  | 'fomc'
  | 'fomc_press'
  | 'boj'
  | 'boj_press'
  | 'ecb_press'
  | 'employment'
  | 'cpi'
  | 'gdp'
  | 'pce'
  | 'ism'
  | 'tankan'
  | 'earnings'
  | 'other'

export interface CalendarEvent {
  id: string
  date: Date
  title: string
  category: EventCategory
  importance: 'high' | 'medium' | 'low'
}

/** SQ日計算（毎月第2金曜日） */
export function getSQDate(year: number, month: number): Date {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1)
  const dayOfWeek = firstDay.getDay() // 0=Sun, 5=Fri
  // First Friday
  const firstFriday = 1 + ((5 - dayOfWeek + 7) % 7)
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

    // FRB定例記者会見（FOMC 2日目の後）
    const fomcPressDates = [
      [1, 29], [3, 19], [5, 7], [6, 18], [7, 30], [9, 17], [11, 5], [12, 17],
    ]
    fomcPressDates.forEach(([m, d], i) => {
      events.push({
        id: `fomc-press-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: 'FRB議長記者会見',
        category: 'fomc_press',
        importance: 'high',
      })
    })

    // 日銀総裁定例記者会見（日銀会合2日目の後）
    const bojPressDates = [
      [1, 24], [3, 14], [5, 1], [6, 13], [7, 31], [9, 19], [10, 30], [12, 19],
    ]
    bojPressDates.forEach(([m, d], i) => {
      events.push({
        id: `boj-press-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '日銀総裁記者会見',
        category: 'boj_press',
        importance: 'high',
      })
    })

    // ECB総裁定例記者会見（ECB理事会後）
    const ecbPressDates = [
      [1, 30], [3, 6], [4, 17], [6, 5], [7, 17], [9, 11], [10, 30], [12, 11],
    ]
    ecbPressDates.forEach(([m, d], i) => {
      events.push({
        id: `ecb-press-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: 'ECB総裁記者会見',
        category: 'ecb_press',
        importance: 'high',
      })
    })

    // 米CPI（消費者物価指数）- 毎月中旬発表
    const usCpiDates = [
      [1, 14], [2, 12], [3, 11], [4, 10], [5, 13], [6, 10],
      [7, 15], [8, 12], [9, 10], [10, 14], [11, 12], [12, 10],
    ]
    usCpiDates.forEach(([m, d], i) => {
      events.push({
        id: `us-cpi-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '米CPI（消費者物価指数）',
        category: 'cpi',
        importance: 'high',
      })
    })

    // 日本CPI（消費者物価指数）- 毎月中下旬発表
    const jpCpiDates = [
      [1, 24], [2, 21], [3, 20], [4, 18], [5, 23], [6, 20],
      [7, 18], [8, 22], [9, 19], [10, 24], [11, 21], [12, 19],
    ]
    jpCpiDates.forEach(([m, d], i) => {
      events.push({
        id: `jp-cpi-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '日本CPI（消費者物価指数）',
        category: 'cpi',
        importance: 'medium',
      })
    })

    // 欧州HICP（消費者物価指数）- 毎月末速報
    const euCpiDates = [
      [1, 7], [2, 3], [3, 3], [4, 1], [5, 5], [6, 3],
      [7, 1], [8, 1], [9, 1], [10, 1], [11, 3], [12, 1],
    ]
    euCpiDates.forEach(([m, d], i) => {
      events.push({
        id: `eu-cpi-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '欧州HICP（消費者物価指数）',
        category: 'cpi',
        importance: 'medium',
      })
    })

    // 米GDP（国内総生産）- 四半期ごと速報
    const usGdpDates = [
      [1, 30], [4, 29], [7, 30], [10, 29],
    ]
    usGdpDates.forEach(([m, d], i) => {
      events.push({
        id: `us-gdp-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '米GDP速報',
        category: 'gdp',
        importance: 'high',
      })
    })

    // 日本GDP - 四半期ごと速報
    const jpGdpDates = [
      [2, 17], [5, 16], [8, 17], [11, 17],
    ]
    jpGdpDates.forEach(([m, d], i) => {
      events.push({
        id: `jp-gdp-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '日本GDP速報',
        category: 'gdp',
        importance: 'medium',
      })
    })

    // 欧州GDP - 四半期ごと速報
    const euGdpDates = [
      [1, 30], [4, 30], [7, 31], [10, 30],
    ]
    euGdpDates.forEach(([m, d], i) => {
      events.push({
        id: `eu-gdp-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '欧州GDP速報',
        category: 'gdp',
        importance: 'medium',
      })
    })

    // 米PCE（個人消費支出）- 毎月下旬発表（FRBが重視するインフレ指標）
    const usPceDates = [
      [1, 31], [2, 28], [3, 28], [4, 30], [5, 30], [6, 27],
      [7, 31], [8, 29], [9, 26], [10, 31], [11, 28], [12, 23],
    ]
    usPceDates.forEach(([m, d], i) => {
      events.push({
        id: `us-pce-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '米PCE（個人消費支出）',
        category: 'pce',
        importance: 'high',
      })
    })

    // 日本家計調査（個人消費支出相当）
    const jpPceDates = [
      [2, 7], [3, 7], [4, 7], [5, 9], [6, 6], [7, 7],
      [8, 7], [9, 5], [10, 7], [11, 7], [12, 5],
    ]
    jpPceDates.forEach(([m, d], i) => {
      events.push({
        id: `jp-pce-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '日本家計調査（個人消費支出）',
        category: 'pce',
        importance: 'low',
      })
    })

    // ISM製造業景況指数（毎月第1営業日）- ボラティリティに影響大
    const ismDates = [
      [1, 5], [2, 2], [3, 2], [4, 1], [5, 1], [6, 1],
      [7, 1], [8, 3], [9, 1], [10, 1], [11, 2], [12, 1],
    ]
    ismDates.forEach(([m, d], i) => {
      events.push({
        id: `ism-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: 'ISM製造業景況指数',
        category: 'ism',
        importance: 'medium',
      })
    })

    // 日銀短観（四半期ごと）
    const tankanDates = [
      [4, 1], [7, 1], [10, 1], [12, 15],
    ]
    tankanDates.forEach(([m, d], i) => {
      events.push({
        id: `tankan-${year}-${i}`,
        date: new Date(year, m - 1, d),
        title: '日銀短観',
        category: 'tankan',
        importance: 'medium',
      })
    })

    // 決算シーズン
    events.push(
      { id: `earnings-${year}-spring`, date: new Date(year, 3, 13), title: '決算シーズン開始（春）', category: 'earnings', importance: 'medium' },
      { id: `earnings-${year}-fall`, date: new Date(year, 9, 13), title: '決算シーズン開始（秋）', category: 'earnings', importance: 'medium' },
    )
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
