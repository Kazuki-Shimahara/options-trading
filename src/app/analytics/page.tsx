import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { buildSkewTimeSeries } from '@/lib/iv-calculations'
import type { IvHistory } from '@/types/database'
import VolatilitySkewChart from '@/components/VolatilitySkewChart'

async function getIvHistory(): Promise<IvHistory[]> {
  try {
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
  const ivHistory = await getIvHistory()
  const skewTimeSeries = buildSkewTimeSeries(ivHistory)

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          &larr; ホーム
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">分析</h1>
        <p className="text-slate-500 mb-8">ボラティリティ・スキュー分析</p>

        <div className="space-y-8">
          <VolatilitySkewChart data={skewTimeSeries} />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400">損益チャート・敗因分析・IV相関ダッシュボードを準備中</p>
          </div>
        </div>
      </div>
    </main>
  )
}
