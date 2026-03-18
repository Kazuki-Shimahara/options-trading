'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getEventsForMonth, type CalendarEvent, type EventCategory } from '@/lib/events'

const categoryConfig: Record<
  EventCategory,
  { color: string; dot: string; label: string }
> = {
  sq: { color: 'text-[#ff6b6b]', dot: 'bg-[#ff6b6b]', label: 'SQ日' },
  fomc: { color: 'text-[#4da6ff]', dot: 'bg-[#4da6ff]', label: 'FOMC' },
  fomc_press: { color: 'text-[#6db8ff]', dot: 'bg-[#6db8ff]', label: 'FRB記者会見' },
  boj: { color: 'text-[#b48cff]', dot: 'bg-[#b48cff]', label: '日銀会合' },
  boj_press: { color: 'text-[#c9a5ff]', dot: 'bg-[#c9a5ff]', label: '日銀記者会見' },
  ecb_press: { color: 'text-[#ff7eb3]', dot: 'bg-[#ff7eb3]', label: 'ECB記者会見' },
  employment: { color: 'text-[#00d4aa]', dot: 'bg-[#00d4aa]', label: '米雇用統計' },
  cpi: { color: 'text-[#f0b429]', dot: 'bg-[#f0b429]', label: 'CPI' },
  gdp: { color: 'text-[#00c4d4]', dot: 'bg-[#00c4d4]', label: 'GDP' },
  pce: { color: 'text-[#e0a030]', dot: 'bg-[#e0a030]', label: 'PCE' },
  ism: { color: 'text-[#20b2aa]', dot: 'bg-[#20b2aa]', label: 'ISM' },
  tankan: { color: 'text-[#7b68ee]', dot: 'bg-[#7b68ee]', label: '短観' },
  earnings: { color: 'text-[#ff8c42]', dot: 'bg-[#ff8c42]', label: '決算' },
  other: { color: 'text-[#666]', dot: 'bg-[#666]', label: 'その他' },
}

const weekDays = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const events = useMemo(() => getEventsForMonth(year, month), [year, month])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: (number | null)[] = []
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }
    while (days.length < 42) {
      days.push(null)
    }
    return days
  }, [year, month])

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    events.forEach((e) => {
      const d = e.date.getDate()
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(e)
    })
    return map
  }, [events])

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return events
    return events.filter(
      (e) => e.date.getDate() === selectedDate.getDate()
    )
  }, [selectedDate, events])

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
    setSelectedDate(null)
  }

  function isToday(day: number): boolean {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month - 1 &&
      today.getDate() === day
    )
  }

  function isSelected(day: number): boolean {
    return (
      selectedDate !== null &&
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month - 1 &&
      selectedDate.getDate() === day
    )
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="text-[#666] hover:text-[#888] text-sm transition-colors"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">イベントカレンダー</h1>
          <div className="w-10" />
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            ← 前月
          </button>
          <h2 className="text-base font-semibold text-white">
            {year}年 {month}月
          </h2>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            翌月 →
          </button>
        </div>

        {/* Category legend */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(['sq', 'fomc', 'fomc_press', 'boj', 'boj_press', 'ecb_press', 'employment', 'cpi', 'gdp', 'pce', 'ism', 'tankan', 'earnings'] as EventCategory[]).map((cat) => (
            <div key={cat} className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${categoryConfig[cat].dot}`}
              />
              <span className="text-[10px] text-[#666]">
                {categoryConfig[cat].label}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 mb-4">
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[10px] font-medium py-1 ${
                  i === 0 ? 'text-[#ff6b6b]' : i === 6 ? 'text-[#4da6ff]' : 'text-[#555]'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="h-12" />
              }

              const dayEvents = eventsByDay.get(day) || []
              const dayOfWeek = new Date(year, month - 1, day).getDay()
              const todayClass = isToday(day)
                ? 'ring-1 ring-[#00d4aa]'
                : ''
              const selectedClass = isSelected(day)
                ? 'bg-[#1a1a1a]'
                : 'hover:bg-[#0a0a0a]'

              const cats = [...new Set(dayEvents.map((e) => e.category))]

              return (
                <button
                  key={`day-${day}`}
                  onClick={() =>
                    setSelectedDate(new Date(year, month - 1, day))
                  }
                  className={`h-12 flex flex-col items-center justify-start pt-1 rounded-lg transition-colors ${todayClass} ${selectedClass}`}
                >
                  <span
                    className={`text-xs ${
                      dayOfWeek === 0
                        ? 'text-[#ff6b6b]'
                        : dayOfWeek === 6
                        ? 'text-[#4da6ff]'
                        : 'text-[#ccc]'
                    }`}
                  >
                    {day}
                  </span>
                  {cats.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {cats.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className={`w-1 h-1 rounded-full ${categoryConfig[cat].dot}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* IV Crush analysis link */}
        <Link
          href="/calendar/iv-crush"
          className="block mb-4 bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:border-[#00d4aa]/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">IV Crush分析</h3>
              <p className="text-[10px] text-[#555] mt-0.5">
                SQ・FOMC・日銀会合前後のIV変動パターンを可視化
              </p>
            </div>
            <span className="text-[#00d4aa] text-sm">→</span>
          </div>
        </Link>

        {/* Event list */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h2 className="text-[10px] font-medium text-[#00d4aa]/70 uppercase tracking-wider mb-3">
            {selectedDate
              ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} のイベント`
              : `${month}月のイベント`}
          </h2>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[#555]">イベントはありません</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-[#0a0a0a] border border-[#1e1e1e]"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${categoryConfig[event.category].dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${categoryConfig[event.category].color}`}>
                      {event.title}
                    </p>
                    <p className="text-[10px] text-[#555]">
                      {event.date.getMonth() + 1}/{event.date.getDate()}（
                      {weekDays[event.date.getDay()]}）
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      event.importance === 'high'
                        ? 'bg-[#ff6b6b]/15 text-[#ff6b6b]'
                        : event.importance === 'medium'
                        ? 'bg-[#f0b429]/15 text-[#f0b429]'
                        : 'bg-[#1a1a1a] text-[#555]'
                    }`}
                  >
                    {event.importance === 'high'
                      ? '重要'
                      : event.importance === 'medium'
                      ? '中'
                      : '低'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
