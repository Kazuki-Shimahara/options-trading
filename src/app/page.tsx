import Link from 'next/link'
import { getOpenTrades, getLatestIvRanks } from '@/lib/supabase'
import { IvRankGauge } from '@/components/IvRankGauge'
import { GreeksSummary } from '@/components/GreeksSummary'
import { aggregatePortfolioGreeks, calculateDeltaNeutralDeviation } from '@/lib/greeks'
import type { PositionGreeks } from '@/lib/greeks'
import { MaxLossSummary } from '@/components/MaxLossSummary'
import { calculateTotalMaxLoss } from '@/lib/max-loss'
import { DEFAULT_MULTIPLIER } from '@/lib/constants'

export default async function Home() {
  const [openTrades, ivRanks] = await Promise.all([
    getOpenTrades(),
    getLatestIvRanks(),
  ])

  const openCount = openTrades.length
  const totalPositionValue = openTrades.reduce(
    (sum, t) => sum + t.entry_price * t.quantity * DEFAULT_MULTIPLIER,
    0
  )
  const totalMaxLoss = calculateTotalMaxLoss(openTrades)

  const positionGreeks: PositionGreeks[] = openTrades
    .filter((t) => t.entry_delta !== null)
    .map((t) => ({
      delta: t.entry_delta!,
      gamma: t.entry_gamma ?? 0,
      theta: t.entry_theta ?? 0,
      vega: t.entry_vega ?? 0,
      quantity: t.quantity,
    }))
  const portfolioGreeks = aggregatePortfolioGreeks(positionGreeks)
  const deltaNeutral = calculateDeltaNeutralDeviation(portfolioGreeks.delta)

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <h1 className="text-lg font-bold text-white">マーケット</h1>
          <Link
            href="/calendar"
            className="text-[#00d4aa] text-sm font-medium hover:opacity-80 transition-opacity"
          >
            カレンダー
          </Link>
        </div>

        {/* IV Rank Section */}
        <div className="mb-4">
          <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
            ATM IVランク
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <IvRankGauge ivRank={ivRanks.call_iv_rank} label="コール IVランク" />
            <IvRankGauge ivRank={ivRanks.put_iv_rank} label="プット IVランク" />
          </div>
        </div>

        {/* Portfolio Greeks Summary */}
        {openCount > 0 && positionGreeks.length > 0 && (
          <div className="mb-4">
            <GreeksSummary greeks={portfolioGreeks} deltaNeutral={deltaNeutral} />
          </div>
        )}

        {/* Open Positions */}
        <div className="mb-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
              未決済ポジション
            </h2>
            {openCount === 0 ? (
              <p className="text-sm text-[#666]">未決済ポジションはありません</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] text-[#888] mb-0.5">ポジション数</p>
                    <p className="text-xl font-bold text-white tabular-nums">
                      {openCount}
                      <span className="text-xs font-normal text-[#666] ml-1">件</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#888] mb-0.5">ポジション価値</p>
                    <p className="text-xl font-bold text-white tabular-nums">
                      {totalPositionValue.toLocaleString()}
                      <span className="text-xs font-normal text-[#666] ml-1">円</span>
                    </p>
                  </div>
                  <MaxLossSummary totalMaxLoss={totalMaxLoss} />
                </div>

                <div className="space-y-1">
                  {openTrades.map((trade) => (
                    <Link
                      key={trade.id}
                      href={`/trades/${trade.id}`}
                      className="flex items-center gap-3 bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <span className={`flex-shrink-0 w-12 text-center text-[10px] font-bold py-1 rounded ${
                        trade.trade_type === 'call'
                          ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
                          : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20'
                      }`}>
                        {trade.trade_type.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white">
                          {trade.strike_price.toLocaleString()}円
                        </span>
                        <span className="text-xs text-[#666] ml-2">x{trade.quantity}枚</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-[#888]">@ {trade.entry_price}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/trades"
            className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:bg-[#1a1a1a] transition-colors"
          >
            <h2 className="text-sm font-semibold text-white mb-0.5">売買履歴</h2>
            <p className="text-[10px] text-[#666]">取引の記録・閲覧</p>
          </Link>

          <Link
            href="/trades/new"
            className="bg-[#00d4aa] rounded-xl p-4 hover:bg-[#00c49a] transition-colors"
          >
            <h2 className="text-sm font-semibold text-black mb-0.5">取引を記録</h2>
            <p className="text-[10px] text-black/60">新規エントリー</p>
          </Link>

          <Link
            href="/analytics"
            className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 hover:bg-[#1a1a1a] transition-colors"
          >
            <h2 className="text-sm font-semibold text-white mb-0.5">分析</h2>
            <p className="text-[10px] text-[#666]">損益・敗因分析</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
