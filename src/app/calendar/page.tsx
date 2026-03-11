'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getEventsForMonth, type CalendarEvent, type EventCategory } from '@/lib/events'

const categoryConfig: Record<
  EventCategory,
  { color: string; dot: string; label: string }
> = {
  sq: { color: 'text-red-400', dot: 'bg-red-400', label: 'SQ日' },
  fomc: { color: 'text-blue-400', dot: 'bg-blue-400', label: 'FOMC' },
  fomc_press: { color: 'text-blue-300', dot: 'bg-blue-300', label: 'FRB記者会見' },
  boj: { color: 'text-purple-400', dot: 'bg-purple-400', label: '日銀会合' },
  boj_press: { color: 'text-purple-300', dot: 'bg-purple-300', label: '日銀記者会見' },
  ecb_press: { color: 'text-pink-400', dot: 'bg-pink-400', label: 'ECB記者会見' },
  employment: { color: 'text-green-400', dot: 'bg-green-400', label: '米雇用統計' },
  cpi: { color: 'text-yellow-400', dot: 'bg-yellow-400', label: 'CPI' },
  gdp: { color: 'text-cyan-400', dot: 'bg-cyan-400', label: 'GDP' },
  pce: { color: 'text-amber-400', dot: 'bg-amber-400', label: 'PCE' },
  ism: { color: 'text-teal-400', dot: 'bg-teal-400', label: 'ISM' },
  tankan: { color: 'text-indigo-400', dot: 'bg-indigo-400', label: '短観' },
  earnings: { color: 'text-orange-400', dot: 'bg-orange-400', label: '決算' },
  other: { color: 'text-slate-400', dot: 'bg-slate-400', label: 'その他' },
}

const weekDays = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-based
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const events = useMemo(() => getEventsForMonth(year, month), [year, month])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: (number | null)[] = []
    // Leading blanks
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }
    // Trailing blanks to fill 6 rows
    while (days.length < 42) {
      days.push(null)
    }
    return days
  }, [year, month])

  // Events grouped by day
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    events.forEach((e) => {
      const d = e.date.getDate()
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(e)
    })
    return map
  }, [events])

  // Selected date events
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return events // Show all month events when no date selected
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
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
        >
          &larr; ホーム
        </Link>

        <h1 className="text-2xl font-bold text-slate-100 mb-6">
          イベントカレンダー
        </h1>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            &larr; 前月
          </button>
          <h2 className="text-lg font-semibold text-slate-100">
            {year}年 {month}月
          </h2>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 text-sm text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            翌月 &rarr;
          </button>
        </div>

        {/* Category legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {(['sq', 'fomc', 'fomc_press', 'boj', 'boj_press', 'ecb_press', 'employment', 'cpi', 'gdp', 'pce', 'ism', 'tankan', 'earnings'] as EventCategory[]).map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${categoryConfig[cat].dot}`}
              />
              <span className="text-xs text-slate-400">
                {categoryConfig[cat].label}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="h-14" />
              }

              const dayEvents = eventsByDay.get(day) || []
              const dayOfWeek = new Date(year, month - 1, day).getDay()
              const todayClass = isToday(day)
                ? 'ring-2 ring-blue-500'
                : ''
              const selectedClass = isSelected(day)
                ? 'bg-slate-700'
                : 'hover:bg-slate-800'

              // Unique categories for this day (for dots)
              const cats = [...new Set(dayEvents.map((e) => e.category))]

              return (
                <button
                  key={`day-${day}`}
                  onClick={() =>
                    setSelectedDate(new Date(year, month - 1, day))
                  }
                  className={`h-14 flex flex-col items-center justify-start pt-1.5 rounded-lg transition-colors ${todayClass} ${selectedClass}`}
                >
                  <span
                    className={`text-sm ${
                      dayOfWeek === 0
                        ? 'text-red-400'
                        : dayOfWeek === 6
                        ? 'text-blue-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {day}
                  </span>
                  {cats.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {cats.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className={`w-1.5 h-1.5 rounded-full ${categoryConfig[cat].dot}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Event list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
            {selectedDate
              ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} のイベント`
              : `${month}月のイベント`}
          </h2>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500">イベントはありません</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-800/50"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${categoryConfig[event.category].dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${categoryConfig[event.category].color}`}>
                      {event.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.date.getMonth() + 1}/{event.date.getDate()}（
                      {weekDays[event.date.getDay()]}）
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      event.importance === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : event.importance === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-slate-700 text-slate-400'
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
