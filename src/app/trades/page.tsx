import Link from 'next/link'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseTrades, type Trade } from '@/lib/trade-schema'
import { calculateMaxLoss } from '@/lib/max-loss'
import { parseTradeFilterParams, buildTradeFilterQuery } from '@/lib/trade-filters'
import TradeFilters from '@/components/TradeFilters'

async function getTrades(searchParams: URLSearchParams): Promise<Trade[]> {
  const supabase = await createServerSupabaseClient()
  const filters = parseTradeFilterParams(searchParams)
  const conditions = buildTradeFilterQuery(filters)

  let query = supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: false })

  for (const condition of conditions) {
    if (condition.operator === 'eq') {
      query = query.eq(condition.column, condition.value)
    } else if (condition.operator === 'gte') {
      query = query.gte(condition.column, condition.value)
    } else if (condition.operator === 'lte') {
      query = query.lte(condition.column, condition.value)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch trades:', error)
    return []
  }
  return parseTrades(data ?? [])
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedParams = await searchParams
  const urlSearchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === 'string') {
      urlSearchParams.set(key, value)
    }
  }

  const filters = parseTradeFilterParams(urlSearchParams)
  const trades = await getTrades(urlSearchParams)

  const closedTrades = trades.filter((t) => t.pnl !== null)
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const openCount = trades.filter((t) => t.status === 'open').length
  const winCount = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const winRate = closedTrades.length > 0 ? Math.round((winCount / closedTrades.length) * 100) : null

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <h1 className="text-lg font-bold text-white">売買履歴</h1>
          <div className="flex items-center gap-2">
            {trades.length > 0 && (
              <a
                href="/api/trades/export"
                download="trades.csv"
                className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-[#888] text-xs font-medium rounded-lg border border-[#2a2a2a] transition-colors"
              >
                CSV
              </a>
            )}
            <Link
              href="/trades/new"
              className="px-3 py-1.5 bg-[#00d4aa] hover:bg-[#00c49a] text-black text-xs font-medium rounded-lg transition-colors"
            >
              + 新規記録
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Suspense fallback={null}>
          <TradeFilters
            currentTradeType={filters.tradeType}
            currentStatus={filters.status}
            currentDateFrom={filters.dateFrom}
            currentDateTo={filters.dateTo}
          />
        </Suspense>

        {/* Stats */}
        {trades.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              <p className="text-[10px] text-[#888] mb-0.5">累計損益</p>
              <p className={`text-lg font-bold tabular-nums ${totalPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()}
                <span className="text-[10px] font-normal text-[#555] ml-0.5">円</span>
              </p>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              <p className="text-[10px] text-[#888] mb-0.5">勝率</p>
              <p className="text-lg font-bold text-white">
                {winRate !== null ? `${winRate}%` : '—'}
                {winRate !== null && (
                  <span className="text-[10px] font-normal text-[#555] ml-0.5">{winCount}/{closedTrades.length}勝</span>
                )}
              </p>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
              <p className="text-[10px] text-[#888] mb-0.5">未決済</p>
              <p className="text-lg font-bold text-[#f0b429]">
                {openCount}
                <span className="text-[10px] font-normal text-[#555] ml-0.5">件</span>
              </p>
            </div>
          </div>
        )}

        {/* List */}
        {trades.length === 0 ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
            <p className="text-[#555] mb-4">
              {filters.tradeType || filters.status || filters.dateFrom || filters.dateTo
                ? '条件に一致する取引がありません'
                : 'まだ取引の記録がありません'}
            </p>
            {!(filters.tradeType || filters.status || filters.dateFrom || filters.dateTo) && (
              <Link
                href="/trades/new"
                className="inline-block px-4 py-2 bg-[#00d4aa] hover:bg-[#00c49a] text-black text-sm font-medium rounded-lg transition-colors"
              >
                最初の取引を記録する
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="group flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] hover:bg-[#1a1a1a] rounded-lg px-3 py-3 transition-all"
              >
                {/* Mobile: top row with badge + PnL */}
                <div className="flex items-center justify-between sm:contents">
                  {/* Type Badge */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <div className={`w-14 text-center text-[10px] font-bold py-1 rounded ${
                      trade.trade_type === 'call'
                        ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
                        : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20'
                    }`}>
                      {trade.trade_type.toUpperCase()}
                    </div>
                    {trade.is_mini && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f0b429]/10 text-[#f0b429] border border-[#f0b429]/20">
                        ミニ
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="hidden sm:block flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {trade.strike_price.toLocaleString()}円
                      </span>
                      <span className="text-xs text-[#666]">x{trade.quantity}枚</span>
                      {trade.iv_at_entry !== null && (
                        <span className="text-xs text-[#00d4aa]/70">IV {trade.iv_at_entry}%</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#888]">{trade.trade_date}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        trade.status === 'open'
                          ? 'text-[#f0b429] bg-[#f0b429]/10'
                          : 'text-[#555] bg-[#1a1a1a]'
                      }`}>
                        {trade.status === 'open' ? '未決済' : '決済済'}
                      </span>
                    </div>
                  </div>

                  {/* PnL / Max Loss */}
                  <div className="flex-shrink-0 text-right flex items-center gap-2">
                    {trade.pnl !== null ? (
                      <span className={`text-sm font-semibold tabular-nums ${
                        trade.pnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString()}円
                      </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-[#888]">@ {trade.entry_price}</span>
                        <span className="text-[10px] text-[#ff6b6b]/70 tabular-nums">
                          最大損失 {calculateMaxLoss(trade).toLocaleString()}円
                        </span>
                      </div>
                    )}
                    <span className="text-[#333] group-hover:text-[#555] transition-colors text-sm flex-shrink-0">›</span>
                  </div>
                </div>

                {/* Mobile: info row */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">
                      {trade.strike_price.toLocaleString()}円
                    </span>
                    <span className="text-xs text-[#666]">x{trade.quantity}枚</span>
                    {trade.iv_at_entry !== null && (
                      <span className="text-xs text-[#00d4aa]/70">IV {trade.iv_at_entry}%</span>
                    )}
                    <span className="text-xs text-[#888]">{trade.trade_date}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      trade.status === 'open'
                        ? 'text-[#f0b429] bg-[#f0b429]/10'
                        : 'text-[#555] bg-[#1a1a1a]'
                    }`}>
                      {trade.status === 'open' ? '未決済' : '決済済'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
