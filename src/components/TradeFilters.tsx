'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface TradeFiltersProps {
  currentTradeType: string | null
  currentStatus: string | null
  currentDateFrom: string | null
  currentDateTo: string | null
}

export default function TradeFilters({
  currentTradeType,
  currentStatus,
  currentDateFrom,
  currentDateTo,
}: TradeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const qs = params.toString()
      router.push(qs ? `/trades?${qs}` : '/trades')
    },
    [router, searchParams]
  )

  const clearAll = useCallback(() => {
    router.push('/trades')
  }, [router])

  const hasFilters = currentTradeType || currentStatus || currentDateFrom || currentDateTo

  return (
    <div className="space-y-3 mb-4">
      {/* Pill buttons row */}
      <div className="flex flex-wrap gap-2">
        {/* Trade type pills */}
        <button
          onClick={() =>
            updateParams('trade_type', currentTradeType === 'call' ? null : 'call')
          }
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            currentTradeType === 'call'
              ? 'bg-[#00d4aa]/20 text-[#00d4aa] border-[#00d4aa]/40'
              : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:border-[#444]'
          }`}
        >
          CALL
        </button>
        <button
          onClick={() =>
            updateParams('trade_type', currentTradeType === 'put' ? null : 'put')
          }
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            currentTradeType === 'put'
              ? 'bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/40'
              : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:border-[#444]'
          }`}
        >
          PUT
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[#2a2a2a] self-center" />

        {/* Status pills */}
        <button
          onClick={() =>
            updateParams('status', currentStatus === 'open' ? null : 'open')
          }
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            currentStatus === 'open'
              ? 'bg-[#f0b429]/20 text-[#f0b429] border-[#f0b429]/40'
              : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:border-[#444]'
          }`}
        >
          未決済
        </button>
        <button
          onClick={() =>
            updateParams('status', currentStatus === 'closed' ? null : 'closed')
          }
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            currentStatus === 'closed'
              ? 'bg-[#555]/30 text-[#aaa] border-[#555]/50'
              : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:border-[#444]'
          }`}
        >
          決済済
        </button>

        {/* Clear all */}
        {hasFilters && (
          <>
            <div className="w-px h-6 bg-[#2a2a2a] self-center" />
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs text-[#888] hover:text-white rounded-full border border-[#2a2a2a] hover:border-[#444] transition-colors"
            >
              クリア
            </button>
          </>
        )}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={currentDateFrom ?? ''}
          onChange={(e) => updateParams('date_from', e.target.value || null)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#00d4aa]/50 focus:outline-none [color-scheme:dark]"
        />
        <span className="text-[#555] text-xs">〜</span>
        <input
          type="date"
          value={currentDateTo ?? ''}
          onChange={(e) => updateParams('date_to', e.target.value || null)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] text-xs rounded-lg px-2.5 py-1.5 focus:border-[#00d4aa]/50 focus:outline-none [color-scheme:dark]"
        />
      </div>
    </div>
  )
}
