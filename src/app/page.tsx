import Link from 'next/link'
import { getOpenTrades, getLatestIvRanks } from '@/lib/supabase'
import { IvRankGauge } from '@/components/IvRankGauge'

export default async function Home() {
  const [openTrades, ivRanks] = await Promise.all([
    getOpenTrades(),
    getLatestIvRanks(),
  ])

  const openCount = openTrades.length
  // Phase 1: 簡易含み損益（エントリー価格ベース）
  // entry_price * quantity * 1000 の合計をポジション価値として表示
  const totalPositionValue = openTrades.reduce(
    (sum, t) => sum + t.entry_price * t.quantity * 1000,
    0
  )

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            日経225オプション取引サポート
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            取引を記録し、<br className="sm:hidden" />
            <span className="text-blue-400">勝率を上げる</span>
          </h1>
          <p className="text-slate-200 text-lg max-w-xl mx-auto">
            IV分析に基づくエントリー判断・売買履歴の記録・敗因の可視化で、トレードの質を高める
          </p>
        </div>

        {/* IV Rank Gauges */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            ATM IVランク
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <IvRankGauge ivRank={ivRanks.call_iv_rank} label="コール IVランク" />
            <IvRankGauge ivRank={ivRanks.put_iv_rank} label="プット IVランク" />
          </div>
        </div>

        {/* Open Positions Summary */}
        <div className="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            未決済ポジション
          </h2>
          {openCount === 0 ? (
            <p className="text-sm text-slate-400">未決済ポジションはありません</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">ポジション数</p>
                  <p className="text-2xl font-bold text-amber-400 tabular-nums">
                    {openCount}
                    <span className="text-sm font-normal text-slate-500 ml-1">件</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">合計ポジション価値</p>
                  <p className="text-2xl font-bold text-slate-100 tabular-nums">
                    {totalPositionValue.toLocaleString()}
                    <span className="text-sm font-normal text-slate-500 ml-1">円</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {openTrades.map((trade) => (
                  <Link
                    key={trade.id}
                    href={`/trades/${trade.id}`}
                    className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl px-4 py-3 transition-all duration-150"
                  >
                    <span className={`flex-shrink-0 w-12 text-center text-xs font-bold py-1 rounded-lg ${
                      trade.trade_type === 'call'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {trade.trade_type.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white">
                        {trade.strike_price.toLocaleString()}円
                      </span>
                      <span className="text-xs text-slate-400 ml-2">×{trade.quantity}枚</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-slate-400">@ {trade.entry_price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/trades"
            className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-200"
          >
            <div className="text-2xl mb-3">📋</div>
            <h2 className="text-base font-semibold text-white mb-1">売買履歴</h2>
            <p className="text-sm text-slate-300">取引の記録・閲覧・分析</p>
            <span className="absolute bottom-4 right-4 text-slate-500 group-hover:text-slate-200 transition-colors text-sm">→</span>
          </Link>

          <Link
            href="/trades/new"
            className="group relative bg-blue-600 border border-blue-500 rounded-2xl p-6 hover:bg-blue-500 transition-all duration-200 shadow-lg shadow-blue-900/30"
          >
            <div className="text-2xl mb-3">✏️</div>
            <h2 className="text-base font-semibold text-white mb-1">取引を記録</h2>
            <p className="text-sm text-blue-200">新規エントリーの記録</p>
            <span className="absolute bottom-4 right-4 text-blue-300 group-hover:text-white transition-colors text-sm">→</span>
          </Link>

          <Link
            href="/analytics"
            className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-200"
          >
            <div className="text-2xl mb-3">📊</div>
            <h2 className="text-base font-semibold text-white mb-1">分析</h2>
            <p className="text-sm text-slate-300">損益チャート・敗因分析</p>
            <span className="absolute bottom-4 right-4 text-slate-500 group-hover:text-slate-200 transition-colors text-sm">→</span>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { label: 'IV分析', desc: 'ブラック・ショールズ' },
            { label: 'LINE通知', desc: '買い時シグナル' },
            { label: '敗因分析', desc: '勝率の可視化' },
          ].map((f) => (
            <div key={f.label} className="py-4 border-t border-slate-800">
              <p className="text-sm font-medium text-slate-100">{f.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
