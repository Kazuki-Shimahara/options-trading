'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { updateTradeReview } from '@/app/actions/trades'
import { WeekendReviewCard } from '@/components/WeekendReviewCard'
import {
  filterTradesNeedingReview,
  calculateReviewProgress,
  type ReviewableTrade,
} from '@/lib/weekend-review'

export default function WeekendReviewPage() {
  const [allTrades, setAllTrades] = useState<ReviewableTrade[]>([])
  const [needsReview, setNeedsReview] = useState<ReviewableTrade[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createBrowserSupabaseClient()
    supabase
      .from('trades')
      .select(
        'id, trade_date, trade_type, strike_price, expiry_date, quantity, entry_price, exit_price, pnl, status, memo, defeat_tags, is_mini'
      )
      .order('trade_date', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        const trades = (data ?? []) as ReviewableTrade[]
        setAllTrades(trades)
        setNeedsReview(filterTradesNeedingReview(trades))
        setLoading(false)
      })
  }, [])

  async function handleSave(
    tradeId: string,
    data: { defeat_tags: string[]; memo: string }
  ) {
    setSaving(true)
    setError(null)

    const result = await updateTradeReview(tradeId, data)
    if (!result.success) {
      setError(result.error)
      setSaving(false)
      return
    }

    // Update local state
    setNeedsReview((prev) => {
      const next = prev.filter((t) => t.id !== tradeId)
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1)
      }
      return next
    })
    setAllTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId
          ? { ...t, defeat_tags: data.defeat_tags, memo: data.memo }
          : t
      )
    )
    setSaving(false)
  }

  function handleSkip() {
    if (currentIndex < needsReview.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const progress = calculateReviewProgress(allTrades.length, needsReview.length)
  const currentTrade = needsReview[currentIndex]

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-24">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link
            href="/trades"
            className="text-[#666] hover:text-[#888] text-sm transition-colors"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">週末レビュー</h1>
          <div className="w-10" />
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#888]">
              レビュー完了率
            </span>
            <span className="text-xs font-mono text-[#00d4aa]">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              data-testid="progress-bar"
              className="h-full bg-[#00d4aa] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-[#555] mt-1">
            {allTrades.length}件中 {allTrades.length - needsReview.length}件 レビュー済み
            {needsReview.length > 0 && ` (残り${needsReview.length}件)`}
          </p>
        </div>

        {/* Content */}
        {needsReview.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#10003;</div>
            <h2 className="text-white font-semibold text-lg mb-2">
              全てのレビューが完了しました
            </h2>
            <p className="text-[#888] text-sm mb-6">
              お疲れ様でした。振り返りが完了しています。
            </p>
            <Link
              href="/trades"
              className="inline-block px-6 py-2.5 bg-[#00d4aa] hover:bg-[#00c49a] text-black font-semibold rounded-lg text-sm transition-colors"
            >
              取引一覧へ
            </Link>
          </div>
        ) : (
          <>
            {/* Card counter */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="text-sm text-[#888] hover:text-white disabled:opacity-30 transition-colors"
              >
                ← 前へ
              </button>
              <span className="text-xs text-[#888] font-mono">
                {currentIndex + 1} / {needsReview.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(needsReview.length - 1, prev + 1)
                  )
                }
                disabled={currentIndex === needsReview.length - 1}
                className="text-sm text-[#888] hover:text-white disabled:opacity-30 transition-colors"
              >
                次へ →
              </button>
            </div>

            {/* Review Card */}
            {currentTrade && (
              <div className={saving ? 'opacity-50 pointer-events-none' : ''}>
                <WeekendReviewCard
                  key={currentTrade.id}
                  trade={currentTrade}
                  onSave={handleSave}
                  onSkip={handleSkip}
                />
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#ff6b6b] text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}
