import { describe, it, expect } from 'vitest'
import {
  calculateSkew,
  buildSkewTimeSeries,
  findAtmIv,
  findOtmPutIv,
} from '../iv-calculations'
import type { IvHistory } from '@/types/database'

function makeIvRecord(overrides: Partial<IvHistory>): IvHistory {
  return {
    id: 'test-id',
    recorded_at: '2026-01-15T09:00:00Z',
    underlying_price: 38000,
    strike_price: 38000,
    expiry_date: '2026-02-13',
    option_type: 'put',
    iv: 0.2,
    iv_rank: null,
    iv_percentile: null,
    hv20: null,
    hv60: null,
    nikkei_vi: null,
    pcr: null,
    data_source: 'jquants',
    ...overrides,
  }
}

describe('findAtmIv', () => {
  it('returns IV of the strike closest to underlying price', () => {
    const records: IvHistory[] = [
      makeIvRecord({ strike_price: 37500, iv: 0.22, option_type: 'put' }),
      makeIvRecord({ strike_price: 38000, iv: 0.18, option_type: 'put' }),
      makeIvRecord({ strike_price: 38500, iv: 0.19, option_type: 'call' }),
    ]
    // underlying_price = 38000, closest strike is 38000
    expect(findAtmIv(records, 38000)).toBe(0.18)
  })

  it('prefers put option when equidistant strikes exist', () => {
    const records: IvHistory[] = [
      makeIvRecord({ strike_price: 37750, iv: 0.22, option_type: 'put' }),
      makeIvRecord({ strike_price: 38250, iv: 0.19, option_type: 'call' }),
    ]
    // Both 250 away; should pick the put
    expect(findAtmIv(records, 38000)).toBe(0.22)
  })

  it('returns null when no records', () => {
    expect(findAtmIv([], 38000)).toBeNull()
  })
})

describe('findOtmPutIv', () => {
  it('returns IV of the OTM put furthest below underlying price (within threshold)', () => {
    const records: IvHistory[] = [
      makeIvRecord({ strike_price: 36000, iv: 0.35, option_type: 'put' }),
      makeIvRecord({ strike_price: 37000, iv: 0.28, option_type: 'put' }),
      makeIvRecord({ strike_price: 38000, iv: 0.18, option_type: 'put' }),
    ]
    // Default delta ~5% OTM: 38000 * 0.95 = 36100, closest OTM put is 36000
    expect(findOtmPutIv(records, 38000)).toBe(0.35)
  })

  it('returns null when no OTM puts exist', () => {
    const records: IvHistory[] = [
      makeIvRecord({ strike_price: 38000, iv: 0.18, option_type: 'put' }),
      makeIvRecord({ strike_price: 39000, iv: 0.15, option_type: 'call' }),
    ]
    expect(findOtmPutIv(records, 38000)).toBeNull()
  })

  it('returns null when no records', () => {
    expect(findOtmPutIv([], 38000)).toBeNull()
  })
})

describe('calculateSkew', () => {
  it('returns OTM put IV minus ATM IV', () => {
    expect(calculateSkew(0.35, 0.18)).toBeCloseTo(0.17, 4)
  })

  it('returns null when ATM IV is null', () => {
    expect(calculateSkew(0.35, null)).toBeNull()
  })

  it('returns null when OTM put IV is null', () => {
    expect(calculateSkew(null, 0.18)).toBeNull()
  })
})

describe('buildSkewTimeSeries', () => {
  it('groups records by date and calculates skew for each', () => {
    const records: IvHistory[] = [
      // Day 1
      makeIvRecord({
        recorded_at: '2026-01-15T09:00:00Z',
        underlying_price: 38000,
        strike_price: 38000,
        iv: 0.18,
        option_type: 'put',
      }),
      makeIvRecord({
        recorded_at: '2026-01-15T09:00:00Z',
        underlying_price: 38000,
        strike_price: 36000,
        iv: 0.30,
        option_type: 'put',
      }),
      // Day 2
      makeIvRecord({
        recorded_at: '2026-01-16T09:00:00Z',
        underlying_price: 39000,
        strike_price: 39000,
        iv: 0.20,
        option_type: 'put',
      }),
      makeIvRecord({
        recorded_at: '2026-01-16T09:00:00Z',
        underlying_price: 39000,
        strike_price: 37000,
        iv: 0.32,
        option_type: 'put',
      }),
    ]

    const result = buildSkewTimeSeries(records)
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-01-15')
    expect(result[0].skew).toBeCloseTo(0.12, 4)
    expect(result[1].date).toBe('2026-01-16')
    expect(result[1].skew).toBeCloseTo(0.12, 4)
  })

  it('returns empty array when no records', () => {
    expect(buildSkewTimeSeries([])).toEqual([])
  })

  it('excludes dates where skew cannot be calculated', () => {
    const records: IvHistory[] = [
      // Only ATM, no OTM put
      makeIvRecord({
        recorded_at: '2026-01-15T09:00:00Z',
        underlying_price: 38000,
        strike_price: 38000,
        iv: 0.18,
        option_type: 'put',
      }),
    ]

    const result = buildSkewTimeSeries(records)
    expect(result).toHaveLength(0)
  })
})
