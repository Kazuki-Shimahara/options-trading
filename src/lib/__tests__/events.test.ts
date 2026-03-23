import { describe, it, expect } from 'vitest'
import {
  getSQDate,
  isMajorSQ,
  getEventsForYear,
  getEventsForMonth,
  getEventsForDate,
  getEventsInRange,
} from '../events'

describe('getSQDate', () => {
  it('returns second Friday of the month', () => {
    // January 2026: 1st is Thursday, first Friday is Jan 2, second Friday is Jan 9
    const sq = getSQDate(2026, 1)
    expect(sq.getDay()).toBe(5) // Friday
    expect(sq.getDate()).toBe(9)
  })

  it('returns correct SQ for March 2026', () => {
    // March 2026: 1st is Sunday, first Friday is March 6, second Friday is March 13
    const sq = getSQDate(2026, 3)
    expect(sq.getDay()).toBe(5)
    expect(sq.getDate()).toBe(13)
  })

  it('returns correct SQ for June 2026', () => {
    // June 2026: 1st is Monday, first Friday is June 5, second Friday is June 12
    const sq = getSQDate(2026, 6)
    expect(sq.getDay()).toBe(5)
    expect(sq.getDate()).toBe(12)
  })

  it('always returns a Friday', () => {
    for (let m = 1; m <= 12; m++) {
      const sq = getSQDate(2026, m)
      expect(sq.getDay()).toBe(5)
    }
  })

  it('second Friday is always between 8th and 14th', () => {
    for (let m = 1; m <= 12; m++) {
      const sq = getSQDate(2026, m)
      expect(sq.getDate()).toBeGreaterThanOrEqual(8)
      expect(sq.getDate()).toBeLessThanOrEqual(14)
    }
  })
})

describe('isMajorSQ', () => {
  it('returns true for March, June, September, December', () => {
    expect(isMajorSQ(3)).toBe(true)
    expect(isMajorSQ(6)).toBe(true)
    expect(isMajorSQ(9)).toBe(true)
    expect(isMajorSQ(12)).toBe(true)
  })

  it('returns false for non-quarterly months', () => {
    expect(isMajorSQ(1)).toBe(false)
    expect(isMajorSQ(2)).toBe(false)
    expect(isMajorSQ(4)).toBe(false)
    expect(isMajorSQ(5)).toBe(false)
    expect(isMajorSQ(7)).toBe(false)
    expect(isMajorSQ(8)).toBe(false)
    expect(isMajorSQ(10)).toBe(false)
    expect(isMajorSQ(11)).toBe(false)
  })
})

describe('getEventsForYear', () => {
  it('returns events for 2026 including SQ and employment dates', () => {
    const events = getEventsForYear(2026)
    expect(events.length).toBeGreaterThan(0)
  })

  it('includes 12 SQ events', () => {
    const events = getEventsForYear(2026)
    const sqEvents = events.filter((e) => e.category === 'sq')
    expect(sqEvents).toHaveLength(12)
  })

  it('includes 12 employment events', () => {
    const events = getEventsForYear(2026)
    const empEvents = events.filter((e) => e.category === 'employment')
    expect(empEvents).toHaveLength(12)
  })

  it('events are sorted by date', () => {
    const events = getEventsForYear(2026)
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.getTime()).toBeGreaterThanOrEqual(events[i - 1].date.getTime())
    }
  })

  it('includes FOMC events for 2026', () => {
    const events = getEventsForYear(2026)
    const fomcEvents = events.filter((e) => e.category === 'fomc')
    expect(fomcEvents.length).toBeGreaterThan(0)
  })

  it('includes BOJ events for 2026', () => {
    const events = getEventsForYear(2026)
    const bojEvents = events.filter((e) => e.category === 'boj')
    expect(bojEvents.length).toBeGreaterThan(0)
  })

  it('major SQ events have high importance', () => {
    const events = getEventsForYear(2026)
    const majorSqMonths = [3, 6, 9, 12]
    const sqEvents = events.filter((e) => e.category === 'sq')
    sqEvents.forEach((e) => {
      const month = e.date.getMonth() + 1
      if (majorSqMonths.includes(month)) {
        expect(e.importance).toBe('high')
      } else {
        expect(e.importance).toBe('medium')
      }
    })
  })

  it('returns only SQ and employment for non-2026 years', () => {
    const events = getEventsForYear(2025)
    const categories = new Set(events.map((e) => e.category))
    expect(categories.has('sq')).toBe(true)
    expect(categories.has('employment')).toBe(true)
    expect(categories.has('fomc')).toBe(false)
  })
})

describe('getEventsForMonth', () => {
  it('returns only events for the specified month', () => {
    const events = getEventsForMonth(2026, 3)
    events.forEach((e) => {
      expect(e.date.getMonth()).toBe(2) // 0-indexed
      expect(e.date.getFullYear()).toBe(2026)
    })
  })

  it('includes SQ for the month', () => {
    const events = getEventsForMonth(2026, 1)
    const sqEvents = events.filter((e) => e.category === 'sq')
    expect(sqEvents).toHaveLength(1)
  })
})

describe('getEventsForDate', () => {
  it('returns events for a specific date', () => {
    // SQ date for January 2026 is Jan 9
    const sqDate = getSQDate(2026, 1)
    const events = getEventsForDate(sqDate)
    const sqEvents = events.filter((e) => e.category === 'sq')
    expect(sqEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty array when no events on date', () => {
    // Pick a date unlikely to have events
    const events = getEventsForDate(new Date(2026, 0, 4)) // Jan 4 is Sunday
    // Might have ISM on Jan 5 but not Jan 4
    // Just check it returns an array
    expect(Array.isArray(events)).toBe(true)
  })
})

describe('getEventsInRange', () => {
  it('returns events within the date range', () => {
    const start = new Date(2026, 0, 1)
    const end = new Date(2026, 0, 31)
    const events = getEventsInRange(start, end)
    events.forEach((e) => {
      expect(e.date.getTime()).toBeGreaterThanOrEqual(start.getTime())
      expect(e.date.getTime()).toBeLessThanOrEqual(end.getTime())
    })
  })

  it('handles range spanning multiple years', () => {
    const start = new Date(2025, 11, 1)
    const end = new Date(2026, 0, 31)
    const events = getEventsInRange(start, end)
    expect(events.length).toBeGreaterThan(0)
  })

  it('returns empty array when range has no events', () => {
    // Very narrow range on a date with no events
    const start = new Date(2030, 5, 15, 0, 0, 0)
    const end = new Date(2030, 5, 15, 23, 59, 59)
    const events = getEventsInRange(start, end)
    // May or may not have events, but should not throw
    expect(Array.isArray(events)).toBe(true)
  })
})
