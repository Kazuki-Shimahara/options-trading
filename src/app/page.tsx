import Link from 'next/link'

export default function Home() {
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
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
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
