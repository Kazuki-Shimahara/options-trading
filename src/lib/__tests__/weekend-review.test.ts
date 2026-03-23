import { describe, it, expect } from 'vitest'
import {
  filterTradesNeedingReview,
  calculateReviewProgress,
  type ReviewableTrade,
} from '../weekend-review'

function makeTrade(overrides: Partial<ReviewableTrade> = {}): ReviewableTrade {
  return {
    id: 'trade-1',
    trade_date: '2026-03-20',
    trade_type: 'call',
    strike_price: 38000,
    expiry_date: '2026-04-10',
    quantity: 1,
    entry_price: 100,
    exit_price: 150,
    pnl: 50000,
    status: 'closed',
    memo: null,
    defeat_tags: null,
    is_mini: false,
    ...overrides,
  }
}

describe('filterTradesNeedingReview', () => {
  it('memoもdefeat_tagsも未記入の取引を返す', () => {
    const trades = [makeTrade({ id: '1', memo: null, defeat_tags: null })]
    const result = filterTradesNeedingReview(trades)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('memoのみ未記入の取引を返す', () => {
    const trades = [makeTrade({ id: '1', memo: null, defeat_tags: ['損切り遅れ'] })]
    const result = filterTradesNeedingReview(trades)
    expect(result).toHaveLength(1)
  })

  it('defeat_tagsのみ未記入（null）の取引を返す', () => {
    const trades = [makeTrade({ id: '1', memo: 'メモあり', defeat_tags: null })]
    const result = filterTradesNeedingReview(trades)
    expect(result).toHaveLength(1)
  })

  it('defeat_tagsが空配列の取引を返す', () => {
    const trades = [makeTrade({ id: '1', memo: 'メモあり', defeat_tags: [] })]
    const result = filterTradesNeedingReview(trades)
    expect(result).toHaveLength(1)
  })

  it('memo・defeat_tagsどちらも記入済みの取引は返さない', () => {
    const trades = [makeTrade({ id: '1', memo: 'メモあり', defeat_tags: ['損切り遅れ'] })]
    const result = filterTradesNeedingReview(trades)
    expect(result).toHaveLength(0)
  })

  it('open状態の取引も対象に含む', () => {
    const trades = [makeTrade({ id: '1', status: 'open', memo: null, defeat_tags: null })]
    const result = filterTradesNeedingReview(trades)
    expect(result).toHaveLength(1)
  })

  it('取引日の降順でソートされる', () => {
    const trades = [
      makeTrade({ id: '1', trade_date: '2026-03-10', memo: null, defeat_tags: null }),
      makeTrade({ id: '2', trade_date: '2026-03-20', memo: null, defeat_tags: null }),
      makeTrade({ id: '3', trade_date: '2026-03-15', memo: null, defeat_tags: null }),
    ]
    const result = filterTradesNeedingReview(trades)
    expect(result.map((t) => t.id)).toEqual(['2', '3', '1'])
  })

  it('空配列を渡すと空配列を返す', () => {
    const result = filterTradesNeedingReview([])
    expect(result).toEqual([])
  })
})

describe('calculateReviewProgress', () => {
  it('全件レビュー済みで100%を返す', () => {
    const progress = calculateReviewProgress(10, 0)
    expect(progress).toBe(100)
  })

  it('全件未レビューで0%を返す', () => {
    const progress = calculateReviewProgress(10, 10)
    expect(progress).toBe(0)
  })

  it('半分レビュー済みで50%を返す', () => {
    const progress = calculateReviewProgress(10, 5)
    expect(progress).toBe(50)
  })

  it('totalが0の場合100%を返す', () => {
    const progress = calculateReviewProgress(0, 0)
    expect(progress).toBe(100)
  })

  it('小数点以下を切り捨てる', () => {
    const progress = calculateReviewProgress(3, 1)
    // (3-1)/3 * 100 = 66.666...
    expect(progress).toBe(66)
  })
})
