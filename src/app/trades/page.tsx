import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/types/database'

async function getTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: false })

  if (error) {
    console.error('Failed to fetch trades:', error)
    return []
  }
  return (data ?? []) as Trade[]
}

export default async function TradesPage() {
  const trades = await getTrades()

  const closedTrades = trades.filter((t) => t.pnl !== null)
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const openCount = trades.filter((t) => t.status === 'open').length
  const winCount = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length
  const winRate = closedTrades.length > 0 ? Math.round((winCount / closedTrades.length) * 100) : null

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">売買履歴</h1>
          <Link
            href="/trades/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            + 新規記録
          </Link>
        </div>

        {/* Stats */}
        {trades.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-300 mb-1">累計損益</p>
              <p className={`text-xl font-bold tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()}
                <span className="text-sm font-normal text-slate-500 ml-1">円</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-300 mb-1">勝率</p>
              <p className="text-xl font-bold text-slate-100">
                {winRate !== null ? `${winRate}%` : '—'}
                {winRate !== null && (
                  <span className="text-sm font-normal text-slate-500 ml-1">{winCount}/{closedTrades.length}勝</span>
                )}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-300 mb-1">未決済</p>
              <p className="text-xl font-bold text-amber-400">
                {openCount}
                <span className="text-sm font-normal text-slate-500 ml-1">ポジション</span>
              </p>
            </div>
          </div>
        )}

        {/* List */}
        {trades.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-slate-400 mb-6">まだ取引の記録がありません</p>
            <Link
              href="/trades/new"
              className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              最初の取引を記録する
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="group flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 rounded-xl px-4 py-3.5 transition-all duration-150"
              >
                {/* Type Badge */}
                <div className={`flex-shrink-0 w-14 text-center text-xs font-bold py-1 rounded-lg ${
                  trade.trade_type === 'call'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {trade.trade_type.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {trade.strike_price.toLocaleString()}円
                    </span>
                    <span className="text-xs text-slate-400">×{trade.quantity}枚</span>
                    {trade.iv_at_entry !== null && (
                      <span className="text-xs text-slate-400">IV {trade.iv_at_entry}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-300">{trade.trade_date}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      trade.status === 'open'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-slate-500 bg-slate-800'
                    }`}>
                      {trade.status === 'open' ? '未決済' : '決済済'}
                    </span>
                  </div>
                </div>

                {/* PnL */}
                <div className="flex-shrink-0 text-right">
                  {trade.pnl !== null ? (
                    <span className={`text-sm font-semibold tabular-nums ${
                      trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString()}円
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">@ {trade.entry_price}</span>
                  )}
                </div>

                <span className="text-slate-700 group-hover:text-slate-500 transition-colors text-sm flex-shrink-0">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
