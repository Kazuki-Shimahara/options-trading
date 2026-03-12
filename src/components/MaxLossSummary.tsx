'use client'

interface MaxLossSummaryProps {
  totalMaxLoss: number
}

export function MaxLossSummary({ totalMaxLoss }: MaxLossSummaryProps) {
  return (
    <div>
      <p className="text-[10px] text-[#888] mb-0.5">最大損失額</p>
      <p className="text-xl font-bold text-[#ff6b6b] tabular-nums">
        {totalMaxLoss.toLocaleString()}
        <span className="text-xs font-normal text-[#666] ml-1">円</span>
      </p>
    </div>
  )
}
