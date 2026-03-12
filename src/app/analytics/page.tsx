import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { buildPnlChartData } from '@/lib/pnl-chart-data'
import { PnlChart } from '@/components/PnlChart'
import type { Trade } from '@/types/database'

export default async function AnalyticsPage() {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'closed')
    .order('exit_date', { ascending: true })

  const trades = error ? [] : ((data ?? []) as Trade[])
  const chartData = buildPnlChartData(trades)

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          &larr; ホーム
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-8">分析</h1>

        <PnlChart data={chartData} />
      </div>
    </main>
  )
}
