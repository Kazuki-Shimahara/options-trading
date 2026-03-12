import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { buildPnlChartData } from '@/lib/pnl-chart-data'
import { PnlChart } from '@/components/PnlChart'
import type { Trade } from '@/types/database'
import IvRankAnalysis from '@/components/IvRankAnalysis'

async function getClosedTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .order('exit_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch trades:', error)
    return []
  }
  return (data ?? []) as Trade[]
}

export default async function AnalyticsPage() {
  const trades = await getClosedTrades()
  const chartData = buildPnlChartData(trades)

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          &larr; ホーム
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">分析</h1>
        <p className="text-slate-500 mb-8">トレード分析ダッシュボード</p>

        <PnlChart data={chartData} />

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            勝率 × IVランク相関分析
          </h2>
          <IvRankAnalysis trades={trades} />
        </section>
      </div>
    </main>
  )
}
