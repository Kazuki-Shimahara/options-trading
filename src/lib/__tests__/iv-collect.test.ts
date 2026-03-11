import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { JQuantsOptionPrice } from '../jquants'

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../jquants-token', () => ({
  getValidIdToken: vi.fn(),
}))

vi.mock('../jquants', () => ({
  fetchOptionPrices: vi.fn(),
}))

import { supabase } from '../supabase'
import { getValidIdToken } from '../jquants-token'
import { fetchOptionPrices } from '../jquants'
import {
  filterAtmOptions,
  buildIvHistoryRecords,
  collectIvData,
} from '../iv-collect'

const mockedSupabase = vi.mocked(supabase)
const mockedGetValidIdToken = vi.mocked(getValidIdToken)
const mockedFetchOptionPrices = vi.mocked(fetchOptionPrices)

// --- テストデータ ---

function makeOptionPrice(overrides: Partial<JQuantsOptionPrice> = {}): JQuantsOptionPrice {
  return {
    Date: '2026-03-10',
    Code: '130060018',
    WholeDayOpen: 100,
    WholeDayHigh: 110,
    WholeDayLow: 90,
    WholeDayClose: 105,
    Volume: 500,
    OpenInterest: 1000,
    TurnoverValue: 50000000,
    ContractMonth: '2026-04',
    StrikePrice: 38000,
    PutCallDivision: '2', // Call
    ImpliedVolatility: 0.22,
    UnderlyingPrice: 38000,
    TheoreticalPrice: 500,
    ...overrides,
  }
}

describe('filterAtmOptions', () => {
  it('ATM±2000円以内のオプションのみ抽出する', () => {
    const options = [
      makeOptionPrice({ StrikePrice: 36000, UnderlyingPrice: 38000 }), // -2000: 含む
      makeOptionPrice({ StrikePrice: 37000, UnderlyingPrice: 38000 }), // -1000: 含む
      makeOptionPrice({ StrikePrice: 38000, UnderlyingPrice: 38000 }), // ATM: 含む
      makeOptionPrice({ StrikePrice: 39000, UnderlyingPrice: 38000 }), // +1000: 含む
      makeOptionPrice({ StrikePrice: 40000, UnderlyingPrice: 38000 }), // +2000: 含む
      makeOptionPrice({ StrikePrice: 41000, UnderlyingPrice: 38000 }), // +3000: 除外
      makeOptionPrice({ StrikePrice: 35000, UnderlyingPrice: 38000 }), // -3000: 除外
    ]

    const result = filterAtmOptions(options)
    expect(result).toHaveLength(5)
    expect(result.map((o) => o.StrikePrice)).toEqual([36000, 37000, 38000, 39000, 40000])
  })

  it('IVがnullのオプションを除外する', () => {
    const options = [
      makeOptionPrice({ StrikePrice: 38000, UnderlyingPrice: 38000, ImpliedVolatility: null }),
      makeOptionPrice({ StrikePrice: 38500, UnderlyingPrice: 38000, ImpliedVolatility: 0.25 }),
    ]

    const result = filterAtmOptions(options)
    expect(result).toHaveLength(1)
    expect(result[0].StrikePrice).toBe(38500)
  })

  it('UnderlyingPriceがnullのオプションを除外する', () => {
    const options = [
      makeOptionPrice({ StrikePrice: 38000, UnderlyingPrice: null }),
    ]

    const result = filterAtmOptions(options)
    expect(result).toHaveLength(0)
  })
})

describe('buildIvHistoryRecords', () => {
  it('オプションデータからiv_historyレコードを構築する', () => {
    const options = [
      makeOptionPrice({
        StrikePrice: 38000,
        UnderlyingPrice: 38000,
        ImpliedVolatility: 0.22,
        PutCallDivision: '2', // Call
        ContractMonth: '2026-04',
      }),
      makeOptionPrice({
        StrikePrice: 38000,
        UnderlyingPrice: 38000,
        ImpliedVolatility: 0.24,
        PutCallDivision: '1', // Put
        ContractMonth: '2026-04',
      }),
    ]

    const records = buildIvHistoryRecords(options)
    expect(records).toHaveLength(2)

    expect(records[0]).toMatchObject({
      underlying_price: 38000,
      strike_price: 38000,
      option_type: 'call',
      iv: 0.22,
      data_source: 'j-quants',
    })

    expect(records[1]).toMatchObject({
      underlying_price: 38000,
      strike_price: 38000,
      option_type: 'put',
      iv: 0.24,
      data_source: 'j-quants',
    })
  })

  it('ContractMonthからexpiry_dateを設定する', () => {
    const options = [
      makeOptionPrice({ ContractMonth: '2026-04' }),
    ]

    const records = buildIvHistoryRecords(options)
    // ContractMonth "2026-04" → expiry_date should be set
    expect(records[0].expiry_date).toBeDefined()
    expect(records[0].expiry_date).toContain('2026-04')
  })

  it('PutCallDivision "1"をput、"2"をcallに変換する', () => {
    const putOption = makeOptionPrice({ PutCallDivision: '1' })
    const callOption = makeOptionPrice({ PutCallDivision: '2' })

    const records = buildIvHistoryRecords([putOption, callOption])
    expect(records[0].option_type).toBe('put')
    expect(records[1].option_type).toBe('call')
  })
})

describe('collectIvData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('J-Quants APIからデータ取得しSupabaseに保存する', async () => {
    mockedGetValidIdToken.mockResolvedValue('test-token')
    mockedFetchOptionPrices.mockResolvedValue([
      makeOptionPrice({
        StrikePrice: 38000,
        UnderlyingPrice: 38000,
        ImpliedVolatility: 0.22,
        PutCallDivision: '2',
      }),
    ])

    const insertMock = vi.fn().mockResolvedValue({ error: null, count: 1 })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })
    mockedSupabase.from = fromMock

    const result = await collectIvData()

    expect(mockedGetValidIdToken).toHaveBeenCalledOnce()
    expect(mockedFetchOptionPrices).toHaveBeenCalledWith('test-token', undefined)
    expect(fromMock).toHaveBeenCalledWith('iv_history')
    expect(insertMock).toHaveBeenCalledOnce()
    expect(result.savedCount).toBe(1)
  })

  it('ATM範囲外のデータを除外して保存する', async () => {
    mockedGetValidIdToken.mockResolvedValue('test-token')
    mockedFetchOptionPrices.mockResolvedValue([
      makeOptionPrice({ StrikePrice: 38000, UnderlyingPrice: 38000 }), // ATM
      makeOptionPrice({ StrikePrice: 50000, UnderlyingPrice: 38000 }), // 除外
    ])

    const insertMock = vi.fn().mockResolvedValue({ error: null, count: 1 })
    mockedSupabase.from = vi.fn().mockReturnValue({ insert: insertMock })

    const result = await collectIvData()

    // insertに渡されるレコードは1件のみ
    const insertedRecords = insertMock.mock.calls[0][0]
    expect(insertedRecords).toHaveLength(1)
    expect(result.savedCount).toBe(1)
  })

  it('保存対象が0件の場合はinsertを呼ばない', async () => {
    mockedGetValidIdToken.mockResolvedValue('test-token')
    mockedFetchOptionPrices.mockResolvedValue([])

    const insertMock = vi.fn()
    mockedSupabase.from = vi.fn().mockReturnValue({ insert: insertMock })

    const result = await collectIvData()

    expect(insertMock).not.toHaveBeenCalled()
    expect(result.savedCount).toBe(0)
  })

  it('Supabaseエラー時に例外を投げる', async () => {
    mockedGetValidIdToken.mockResolvedValue('test-token')
    mockedFetchOptionPrices.mockResolvedValue([
      makeOptionPrice({ StrikePrice: 38000, UnderlyingPrice: 38000 }),
    ])

    const insertMock = vi.fn().mockResolvedValue({
      error: { message: 'DB insert error' },
      count: 0,
    })
    mockedSupabase.from = vi.fn().mockReturnValue({ insert: insertMock })

    await expect(collectIvData()).rejects.toThrow('Failed to save IV data')
  })

  it('指定日付でデータ取得できる', async () => {
    mockedGetValidIdToken.mockResolvedValue('test-token')
    mockedFetchOptionPrices.mockResolvedValue([])

    const insertMock = vi.fn()
    mockedSupabase.from = vi.fn().mockReturnValue({ insert: insertMock })

    await collectIvData('2026-03-10')

    expect(mockedFetchOptionPrices).toHaveBeenCalledWith('test-token', '2026-03-10')
  })
})
