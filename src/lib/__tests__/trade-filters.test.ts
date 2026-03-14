import { describe, it, expect } from 'vitest'
import { buildTradeFilterQuery, parseTradeFilterParams } from '../trade-filters'
import type { TradeFilterParams } from '../trade-filters'

describe('parseTradeFilterParams', () => {
  it('空のパラメータでデフォルト値を返す', () => {
    const params = parseTradeFilterParams(new URLSearchParams())
    expect(params).toEqual({
      tradeType: null,
      status: null,
      dateFrom: null,
      dateTo: null,
    })
  })

  it('trade_type パラメータをパースする', () => {
    const params = parseTradeFilterParams(new URLSearchParams('trade_type=call'))
    expect(params.tradeType).toBe('call')
  })

  it('status パラメータをパースする', () => {
    const params = parseTradeFilterParams(new URLSearchParams('status=open'))
    expect(params.status).toBe('open')
  })

  it('日付範囲パラメータをパースする', () => {
    const params = parseTradeFilterParams(
      new URLSearchParams('date_from=2025-01-01&date_to=2025-12-31')
    )
    expect(params.dateFrom).toBe('2025-01-01')
    expect(params.dateTo).toBe('2025-12-31')
  })

  it('不正なtrade_typeは無視する', () => {
    const params = parseTradeFilterParams(new URLSearchParams('trade_type=invalid'))
    expect(params.tradeType).toBeNull()
  })

  it('不正なstatusは無視する', () => {
    const params = parseTradeFilterParams(new URLSearchParams('status=invalid'))
    expect(params.status).toBeNull()
  })

  it('不正な日付フォーマットは無視する', () => {
    const params = parseTradeFilterParams(new URLSearchParams('date_from=not-a-date'))
    expect(params.dateFrom).toBeNull()
  })
})

describe('buildTradeFilterQuery', () => {
  it('フィルタなしの場合、空の条件配列を返す', () => {
    const filters: TradeFilterParams = {
      tradeType: null,
      status: null,
      dateFrom: null,
      dateTo: null,
    }
    const conditions = buildTradeFilterQuery(filters)
    expect(conditions).toEqual([])
  })

  it('trade_type フィルタの条件を返す', () => {
    const filters: TradeFilterParams = {
      tradeType: 'call',
      status: null,
      dateFrom: null,
      dateTo: null,
    }
    const conditions = buildTradeFilterQuery(filters)
    expect(conditions).toEqual([
      { column: 'trade_type', operator: 'eq', value: 'call' },
    ])
  })

  it('status フィルタの条件を返す', () => {
    const filters: TradeFilterParams = {
      tradeType: null,
      status: 'open',
      dateFrom: null,
      dateTo: null,
    }
    const conditions = buildTradeFilterQuery(filters)
    expect(conditions).toEqual([
      { column: 'status', operator: 'eq', value: 'open' },
    ])
  })

  it('日付範囲の条件を返す', () => {
    const filters: TradeFilterParams = {
      tradeType: null,
      status: null,
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    }
    const conditions = buildTradeFilterQuery(filters)
    expect(conditions).toEqual([
      { column: 'trade_date', operator: 'gte', value: '2025-01-01' },
      { column: 'trade_date', operator: 'lte', value: '2025-12-31' },
    ])
  })

  it('複数フィルタの組み合わせ', () => {
    const filters: TradeFilterParams = {
      tradeType: 'put',
      status: 'closed',
      dateFrom: '2025-06-01',
      dateTo: null,
    }
    const conditions = buildTradeFilterQuery(filters)
    expect(conditions).toEqual([
      { column: 'trade_type', operator: 'eq', value: 'put' },
      { column: 'status', operator: 'eq', value: 'closed' },
      { column: 'trade_date', operator: 'gte', value: '2025-06-01' },
    ])
  })
})
