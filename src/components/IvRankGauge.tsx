'use client'

interface IvRankGaugeProps {
  ivRank: number | null  // 0-100, nullならデータなし
  label?: string
}

function getColor(ivRank: number): { bar: string; text: string; label: string } {
  if (ivRank < 25) {
    return { bar: 'bg-[#00d4aa]', text: 'text-[#00d4aa]', label: '買い好機' }
  } else if (ivRank < 75) {
    return { bar: 'bg-[#888]', text: 'text-[#888]', label: '中立' }
  } else {
    return { bar: 'bg-[#ff6b6b]', text: 'text-[#ff6b6b]', label: '割高注意' }
  }
}

export function IvRankGauge({ ivRank, label = 'IVランク' }: IvRankGaugeProps) {
  if (ivRank === null) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <p className="text-xs font-medium text-[#888] mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#333]" />
          <p className="text-sm text-[#555]">データなし</p>
        </div>
      </div>
    )
  }

  const clamped = Math.max(0, Math.min(100, ivRank))
  const color = getColor(clamped)

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-[#888]">{label}</p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color.text} bg-[#1a1a1a] border border-[#2a2a2a]`}>
          {color.label}
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums mb-2 ${color.text}`}>
        {clamped.toFixed(1)}
        <span className="text-xs font-normal text-[#555] ml-1">/ 100</span>
      </p>
      <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          data-testid="iv-gauge-bar"
          className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[#00d4aa]/50">0</span>
        <span className="text-[9px] text-[#555]">25</span>
        <span className="text-[9px] text-[#555]">50</span>
        <span className="text-[9px] text-[#555]">75</span>
        <span className="text-[9px] text-[#ff6b6b]/50">100</span>
      </div>
    </div>
  )
}
