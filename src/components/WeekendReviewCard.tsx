'use client'

import { useState } from 'react'
import { DEFEAT_TAG_CATEGORIES } from '@/lib/tags'
import type { ReviewableTrade } from '@/lib/weekend-review'

interface WeekendReviewCardProps {
  trade: ReviewableTrade
  onSave: (tradeId: string, data: { defeat_tags: string[]; memo: string }) => void
  onSkip: () => void
}

export function WeekendReviewCard({ trade, onSave, onSkip }: WeekendReviewCardProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(trade.defeat_tags ?? [])
  const [memo, setMemo] = useState(trade.memo ?? '')

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleSave() {
    onSave(trade.id, { defeat_tags: selectedTags, memo })
  }

  const pnlFormatted =
    trade.pnl != null
      ? `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}`
      : '-'

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-4">
      {/* Trade Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded ${
              trade.trade_type === 'call'
                ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
                : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20'
            }`}
          >
            {trade.trade_type.toUpperCase()}
          </span>
          <span className="text-white font-semibold">
            {trade.strike_price.toLocaleString()}円
          </span>
          <span className="text-[#666] text-xs">x{trade.quantity}枚</span>
        </div>
        <span className="text-[#666] text-xs">{trade.trade_date}</span>
      </div>

      {/* P&L */}
      <div
        data-testid="review-pnl"
        className={`text-lg font-bold font-mono ${
          trade.pnl != null && trade.pnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
        }`}
      >
        {pnlFormatted}円
      </div>

      {/* Defeat Tags */}
      <div>
        <label className="block text-[10px] font-medium text-[#00d4aa]/70 mb-2 tracking-wider uppercase">
          敗因タグ
        </label>
        <div className="space-y-3">
          {Object.entries(DEFEAT_TAG_CATEGORIES).map(([category, tags]) => (
            <div key={category}>
              <p className="text-[10px] text-[#555] mb-1">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-[#00d4aa] text-black font-semibold'
                        : 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] hover:border-[#444]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Memo */}
      <div>
        <label className="block text-[10px] font-medium text-[#00d4aa]/70 mb-1 tracking-wider uppercase">
          振り返りメモ
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="振り返りメモを入力..."
          rows={3}
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa] transition-colors resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2.5 bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] rounded-lg text-sm hover:border-[#444] transition-colors"
        >
          スキップ
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2.5 bg-[#00d4aa] hover:bg-[#00c49a] text-black font-semibold rounded-lg text-sm transition-colors"
        >
          保存して次へ
        </button>
      </div>
    </div>
  )
}
