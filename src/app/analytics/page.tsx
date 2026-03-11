import Link from 'next/link'

export default function AnalyticsPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          &larr; ホーム
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">分析</h1>
        <p className="text-slate-500 mb-8">Phase 3で実装予定</p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-400">損益チャート・敗因分析・IV相関ダッシュボードを準備中</p>
        </div>
      </div>
    </main>
  )
}
