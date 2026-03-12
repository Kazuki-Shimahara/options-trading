'use client'

interface IvRankGaugeProps {
  ivRank: number | null  // 0-100, nullならデータなし
  label?: string
}

function getColor(ivRank: number): { bar: string; text: string; label: string } {
  if (ivRank < 25) {
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', label: '買い好機' }
  } else if (ivRank < 75) {
    return { bar: 'bg-slate-500', text: 'text-slate-400', label: '中立' }
  } else {
    return { bar: 'bg-red-500', text: 'text-red-400', label: '売り好機' }
  }
}

export function IvRankGauge({ ivRank, label = 'IVランク' }: IvRankGaugeProps) {
  if (ivRank === null) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-300 mb-3">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
          <p className="text-sm text-slate-500">データなし</p>
        </div>
      </div>
    )
  }

  const clamped = Math.max(0, Math.min(100, ivRank))
  const color = getColor(clamped)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-300">{label}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color.text} bg-slate-800 border border-slate-700`}>
          {color.label}
        </span>
      </div>
      {/* Value */}
      <p className={`text-3xl font-bold tabular-nums mb-3 ${color.text}`}>
        {clamped.toFixed(1)}
        <span className="text-sm font-normal text-slate-500 ml-1">/ 100</span>
      </p>
      {/* Progress bar */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          data-testid="iv-gauge-bar"
          className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {/* Scale labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-emerald-500/60">0</span>
        <span className="text-[10px] text-slate-500">25</span>
        <span className="text-[10px] text-slate-500">50</span>
        <span className="text-[10px] text-slate-500">75</span>
        <span className="text-[10px] text-red-500/60">100</span>
      </div>
    </div>
  )
}
