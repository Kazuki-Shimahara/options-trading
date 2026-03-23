/**
 * Weekend Review Mode - Filter and track trades needing review.
 */

export interface ReviewableTrade {
  id: string
  trade_date: string
  trade_type: 'call' | 'put'
  strike_price: number
  expiry_date: string
  quantity: number
  entry_price: number
  exit_price: number | null
  pnl: number | null
  status: 'open' | 'closed'
  memo: string | null
  defeat_tags: string[] | null
  is_mini: boolean
}

/**
 * Filter trades that need review (missing memo or defeat_tags).
 * Returns trades sorted by trade_date descending (newest first).
 */
export function filterTradesNeedingReview(trades: ReviewableTrade[]): ReviewableTrade[] {
  return trades
    .filter((trade) => {
      const missingMemo = !trade.memo
      const missingTags = !trade.defeat_tags || trade.defeat_tags.length === 0
      return missingMemo || missingTags
    })
    .sort((a, b) => b.trade_date.localeCompare(a.trade_date))
}

/**
 * Calculate review completion progress as a percentage (0-100).
 * Returns Math.floor of the percentage.
 */
export function calculateReviewProgress(totalTrades: number, needingReview: number): number {
  if (totalTrades === 0) return 100
  return Math.floor(((totalTrades - needingReview) / totalTrades) * 100)
}
