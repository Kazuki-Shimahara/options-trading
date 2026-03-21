import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseTrades, type Trade } from '@/lib/trade-schema'
import type { IvHistory } from '@/types/database'
import {
  DEFEAT_TAG_CATEGORIES,
  MARKET_ENV_AXES,
  aggregateDefeatTags,
  aggregateMarketEnvTags,
} from '@/lib/tags'
import { buildSkewTimeSeries } from '@/lib/iv-calculations'
import VolatilitySkewChart from '@/components/VolatilitySkewChart'
import { buildPnlChartData } from '@/lib/pnl-chart-data'
import { PnlChart } from '@/components/PnlChart'
import IvRankAnalysis from '@/components/IvRankAnalysis'
import { tradesToPayoffPositions } from '@/lib/payoff'
import { PayoffDiagram } from '@/components/PayoffDiagram'
import { calculatePerformanceSummary } from '@/lib/performance-metrics'
import TimeSeriesAnalysis from '@/components/TimeSeriesAnalysis'

async function getClosedTrades(): Promise<Trade[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .order('exit_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch trades:', error)
    return []
  }
  return parseTrades(data ?? [])
}

async function getOpenTrades(): Promise<Trade[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'open')
    .order('trade_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch open trades:', error)
    return []
  }
  return parseTrades(data ?? [])
}

async function getIvHistory(): Promise<IvHistory[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('iv_history')
      .select('*')
      .order('recorded_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch iv_history:', error)
      return []
    }
    return (data ?? []) as IvHistory[]
  } catch {
    return []
  }
}

export default async function AnalyticsPage() {
  const [trades, openTrades, ivHistory] = await Promise.all([
    getClosedTrades(),
    getOpenTrades(),
    getIvHistory(),
  ])
  const chartData = buildPnlChartData(trades)
  const skewTimeSeries = buildSkewTimeSeries(ivHistory)
  const defeatAgg = aggregateDefeatTags(trades)
  const marketEnvAgg = aggregateMarketEnvTags(trades)
  const payoffPositions = tradesToPayoffPositions(openTrades)

  const totalTrades = trades.length
  const wins = trades.filter((t) => t.pnl != null && t.pnl >= 0).length
  const losses = trades.filter((t) => t.pnl != null && t.pnl < 0).length
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0'

  const perfSummary = calculatePerformanceSummary(trades)

  const defeatTagsWithCount = defeatAgg.filter((d) => d.count > 0)
  const maxDefeatCount = defeatTagsWithCount.length > 0 ? defeatTagsWithCount[0].count : 0

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="py-4">
          <h1 className="text-lg font-bold text-white">分析ダッシュボード</h1>
          <p className="text-[10px] text-[#666] mt-0.5">トレード分析・敗因タグ・市場環境タグの集計</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <div className="text-[10px] text-[#888] mb-0.5">決済済み取引</div>
            <div className="text-xl font-bold text-white">{totalTrades}</div>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <div className="text-[10px] text-[#888] mb-0.5">勝ち</div>
            <div className="text-xl font-bold text-[#00d4aa]">{wins}</div>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <div className="text-[10px] text-[#888] mb-0.5">負け</div>
            <div className="text-xl font-bold text-[#ff6b6b]">{losses}</div>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <div className="text-[10px] text-[#888] mb-0.5">勝率</div>
            <div className="text-xl font-bold text-white">{winRate}%</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-white mb-3">パフォーマンス指標</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#888] mb-0.5">Sharpe比</div>
              <div className="text-xl font-bold text-white">
                {perfSummary.sharpeRatio.toFixed(2)}
              </div>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#888] mb-0.5">最大DD</div>
              <div className="text-xl font-bold text-[#ff6b6b]">
                {perfSummary.maxDrawdown > 0
                  ? `-${perfSummary.maxDrawdown.toLocaleString()}円`
                  : '0円'}
              </div>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#888] mb-0.5">Profit Factor</div>
              <div className="text-xl font-bold text-white">
                {perfSummary.profitFactor === Infinity
                  ? '∞'
                  : perfSummary.profitFactor.toFixed(2)}
              </div>
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#888] mb-0.5">Kelly基準</div>
              <div className="text-xl font-bold text-white">
                {(perfSummary.kellyCriterion * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </section>

        <PnlChart data={chartData} />

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">ペイオフダイアグラム</h2>
          <p className="text-[10px] text-[#666] mb-3">
            オープンポジションの満期損益図（{openTrades.length}件）
          </p>
          <PayoffDiagram positions={payoffPositions} />
        </section>

        <TimeSeriesAnalysis trades={trades} />

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">
            勝率 x IVランク相関分析
          </h2>
          <IvRankAnalysis trades={trades} />
        </section>

        <section className="mb-6">
          <VolatilitySkewChart data={skewTimeSeries} />
        </section>

        {totalTrades === 0 ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
            <p className="text-[#555]">決済済みの取引がまだありません</p>
          </div>
        ) : (
          <>
            {/* Defeat Tags Table */}
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-white mb-3">敗因タグ集計</h2>
              {defeatTagsWithCount.length === 0 ? (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
                  <p className="text-[#555]">敗因タグが設定された取引がありません</p>
                </div>
              ) : (
                <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        <th className="text-left text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
                          敗因タグ
                        </th>
                        <th className="text-right text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
                          回数
                        </th>
                        <th className="text-right text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
                          損失合計
                        </th>
                        <th className="text-left text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5 hidden sm:table-cell">
                          割合
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {defeatTagsWithCount.map((item) => {
                        const ratio =
                          maxDefeatCount > 0 ? (item.count / maxDefeatCount) * 100 : 0
                        return (
                          <tr
                            key={item.tag}
                            className="border-b border-[#1e1e1e]/50 last:border-0"
                          >
                            <td className="px-4 py-2.5 text-[#ccc]">{item.tag}</td>
                            <td className="px-4 py-2.5 text-right text-[#888] font-mono">
                              {item.count}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[#ff6b6b] font-mono">
                              {item.totalLoss.toLocaleString()}円
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                                <div
                                  className="bg-[#ff6b6b] h-1.5 rounded-full"
                                  style={{ width: `${ratio}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Defeat Category Summary */}
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-white mb-3">
                敗因カテゴリ別サマリー
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(DEFEAT_TAG_CATEGORIES).map(([category, tags]) => {
                  const categoryTotal = tags.reduce((sum, tag) => {
                    const found = defeatAgg.find((d) => d.tag === tag)
                    return sum + (found?.count ?? 0)
                  }, 0)
                  const categoryLoss = tags.reduce((sum, tag) => {
                    const found = defeatAgg.find((d) => d.tag === tag)
                    return sum + (found?.totalLoss ?? 0)
                  }, 0)
                  return (
                    <div
                      key={category}
                      className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3"
                    >
                      <div className="text-[10px] text-[#888] mb-0.5">{category}</div>
                      <div className="text-lg font-bold text-white">{categoryTotal}回</div>
                      {categoryLoss < 0 && (
                        <div className="text-xs text-[#ff6b6b] font-mono">
                          {categoryLoss.toLocaleString()}円
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Market Env Heatmap */}
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-white mb-3">
                市場環境 x 勝率ヒートマップ
              </h2>
              <div className="space-y-3">
                {Object.entries(MARKET_ENV_AXES).map(([axis, config]) => (
                  <div
                    key={axis}
                    className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3"
                  >
                    <div className="text-[10px] text-[#00d4aa]/70 mb-2 font-medium">{config.label}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                      {config.tags.map((tag) => {
                        const data = marketEnvAgg.find((m) => m.tag === tag)
                        const winRate = data?.winRate ?? 0
                        const total = data?.total ?? 0
                        let bgColor = 'bg-[#1a1a1a]'
                        if (total > 0) {
                          if (winRate >= 70) bgColor = 'bg-[#00d4aa]/15 border-[#00d4aa]/20'
                          else if (winRate >= 50) bgColor = 'bg-[#00d4aa]/8 border-[#00d4aa]/10'
                          else if (winRate >= 30) bgColor = 'bg-[#f0b429]/10 border-[#f0b429]/15'
                          else bgColor = 'bg-[#ff6b6b]/10 border-[#ff6b6b]/15'
                        }
                        return (
                          <div
                            key={tag}
                            className={`${bgColor} border border-[#2a2a2a] rounded-lg p-2.5 text-center`}
                          >
                            <div className="text-[10px] text-[#888] mb-0.5 truncate" title={tag}>
                              {tag}
                            </div>
                            <div className="text-base font-bold text-white">
                              {total > 0 ? `${winRate.toFixed(0)}%` : '-'}
                            </div>
                            <div className="text-[10px] text-[#555]">
                              {total > 0
                                ? `${data!.wins}勝${data!.losses}敗`
                                : 'データなし'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
