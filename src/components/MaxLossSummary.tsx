'use client'

interface MaxLossSummaryProps {
  totalMaxLoss: number
}

export function MaxLossSummary({ totalMaxLoss }: MaxLossSummaryProps) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">最大損失額</p>
      <p className="text-2xl font-bold text-red-400 tabular-nums">
        {totalMaxLoss.toLocaleString()}
        <span className="text-sm font-normal text-slate-500 ml-1">円</span>
      </p>
    </div>
  )
}
