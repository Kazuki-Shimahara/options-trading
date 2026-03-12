import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Trade } from '@/types/database'
import {
  DEFEAT_TAG_CATEGORIES,
  MARKET_ENV_AXES,
  aggregateDefeatTags,
  aggregateMarketEnvTags,
} from '@/lib/tags'

async function getClosedTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .order('trade_date', { ascending: false })

  if (error) {
    console.error('Failed to fetch trades:', error)
    return []
  }
  return (data ?? []) as Trade[]
}

export default async function AnalyticsPage() {
  const trades = await getClosedTrades()
  const defeatAgg = aggregateDefeatTags(trades)
  const marketEnvAgg = aggregateMarketEnvTags(trades)

  const totalTrades = trades.length
  const wins = trades.filter((t) => t.pnl != null && t.pnl >= 0).length
  const losses = trades.filter((t) => t.pnl != null && t.pnl < 0).length
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0'

  const defeatTagsWithCount = defeatAgg.filter((d) => d.count > 0)
  const maxDefeatCount = defeatTagsWithCount.length > 0 ? defeatTagsWithCount[0].count : 0

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
        >
          &larr; ホーム
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">分析ダッシュボード</h1>
        <p className="text-slate-500 mb-8">敗因タグ・市場環境タグの集計</p>

        {/* サマリー */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">決済済み取引</div>
            <div className="text-2xl font-bold text-slate-100">{totalTrades}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">勝ち</div>
            <div className="text-2xl font-bold text-green-400">{wins}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">負け</div>
            <div className="text-2xl font-bold text-red-400">{losses}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">勝率</div>
            <div className="text-2xl font-bold text-slate-100">{winRate}%</div>
          </div>
        </div>

        {totalTrades === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400">決済済みの取引がまだありません</p>
          </div>
        ) : (
          <>
            {/* 敗因タグ集計 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">敗因タグ集計</h2>
              {defeatTagsWithCount.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                  <p className="text-slate-400">敗因タグが設定された取引がありません</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">
                          敗因タグ
                        </th>
                        <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">
                          回数
                        </th>
                        <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">
                          損失合計
                        </th>
                        <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden sm:table-cell">
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
                            className="border-b border-slate-800/50 last:border-0"
                          >
                            <td className="px-4 py-3 text-slate-200">{item.tag}</td>
                            <td className="px-4 py-3 text-right text-slate-300 font-mono">
                              {item.count}
                            </td>
                            <td className="px-4 py-3 text-right text-red-400 font-mono">
                              {item.totalLoss.toLocaleString()}円
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full"
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

            {/* 敗因カテゴリ別サマリー */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                敗因カテゴリ別サマリー
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                    >
                      <div className="text-xs text-slate-500 mb-1">{category}</div>
                      <div className="text-xl font-bold text-slate-100">{categoryTotal}回</div>
                      {categoryLoss < 0 && (
                        <div className="text-sm text-red-400 font-mono">
                          {categoryLoss.toLocaleString()}円
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 市場環境タグ×勝率ヒートマップ */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                市場環境×勝率ヒートマップ
              </h2>
              <div className="space-y-4">
                {Object.entries(MARKET_ENV_AXES).map(([axis, config]) => (
                  <div
                    key={axis}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                  >
                    <div className="text-xs text-slate-500 mb-3 font-medium">{config.label}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {config.tags.map((tag) => {
                        const data = marketEnvAgg.find((m) => m.tag === tag)
                        const winRate = data?.winRate ?? 0
                        const total = data?.total ?? 0
                        let bgColor = 'bg-slate-800'
                        if (total > 0) {
                          if (winRate >= 70) bgColor = 'bg-green-900/60 border-green-700/50'
                          else if (winRate >= 50) bgColor = 'bg-emerald-900/40 border-emerald-700/30'
                          else if (winRate >= 30) bgColor = 'bg-yellow-900/40 border-yellow-700/30'
                          else bgColor = 'bg-red-900/40 border-red-700/30'
                        }
                        return (
                          <div
                            key={tag}
                            className={`${bgColor} border border-slate-700/50 rounded-xl p-3 text-center`}
                          >
                            <div className="text-xs text-slate-400 mb-1 truncate" title={tag}>
                              {tag}
                            </div>
                            <div className="text-lg font-bold text-slate-100">
                              {total > 0 ? `${winRate.toFixed(0)}%` : '-'}
                            </div>
                            <div className="text-xs text-slate-500">
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
