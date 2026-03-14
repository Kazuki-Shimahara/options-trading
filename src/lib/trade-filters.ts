import type { TradeType, TradeStatus } from '@/types/database'

export interface TradeFilterParams {
  tradeType: TradeType | null
  status: TradeStatus | null
  dateFrom: string | null
  dateTo: string | null
}

export interface FilterCondition {
  column: string
  operator: 'eq' | 'gte' | 'lte'
  value: string
}

const VALID_TRADE_TYPES: TradeType[] = ['call', 'put']
const VALID_STATUSES: TradeStatus[] = ['open', 'closed']
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function parseTradeFilterParams(
  searchParams: URLSearchParams
): TradeFilterParams {
  const rawType = searchParams.get('trade_type')
  const rawStatus = searchParams.get('status')
  const rawDateFrom = searchParams.get('date_from')
  const rawDateTo = searchParams.get('date_to')

  return {
    tradeType:
      rawType && VALID_TRADE_TYPES.includes(rawType as TradeType)
        ? (rawType as TradeType)
        : null,
    status:
      rawStatus && VALID_STATUSES.includes(rawStatus as TradeStatus)
        ? (rawStatus as TradeStatus)
        : null,
    dateFrom:
      rawDateFrom && DATE_REGEX.test(rawDateFrom) ? rawDateFrom : null,
    dateTo: rawDateTo && DATE_REGEX.test(rawDateTo) ? rawDateTo : null,
  }
}

export function buildTradeFilterQuery(
  filters: TradeFilterParams
): FilterCondition[] {
  const conditions: FilterCondition[] = []

  if (filters.tradeType) {
    conditions.push({
      column: 'trade_type',
      operator: 'eq',
      value: filters.tradeType,
    })
  }

  if (filters.status) {
    conditions.push({
      column: 'status',
      operator: 'eq',
      value: filters.status,
    })
  }

  if (filters.dateFrom) {
    conditions.push({
      column: 'trade_date',
      operator: 'gte',
      value: filters.dateFrom,
    })
  }

  if (filters.dateTo) {
    conditions.push({
      column: 'trade_date',
      operator: 'lte',
      value: filters.dateTo,
    })
  }

  return conditions
}
