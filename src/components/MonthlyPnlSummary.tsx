import type { MonthlyPnlSummary as MonthlyPnlSummaryData } from '@/lib/monthly-pnl'

interface MonthlyPnlSummaryProps {
  summary: MonthlyPnlSummaryData
  month: number
}

export function MonthlyPnlSummary({ summary, month }: MonthlyPnlSummaryProps) {
  const pnlColor = summary.totalPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
  const pnlSign = summary.totalPnl >= 0 ? '+' : ''
  const diffColor = summary.monthOverMonthDiff >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
  const diffSign = summary.monthOverMonthDiff >= 0 ? '+' : ''
  const diffArrow = summary.monthOverMonthDiff > 0 ? '\u25B2' : summary.monthOverMonthDiff < 0 ? '\u25BC' : ''

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
        {month}月の損益サマリー
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* 確定損益 */}
        <div>
          <p className="text-[10px] text-[#888] mb-0.5">確定損益</p>
          <p className={`text-xl font-bold tabular-nums ${pnlColor}`}>
            {pnlSign}{summary.totalPnl.toLocaleString()}
            <span className="text-xs font-normal text-[#666] ml-1">円</span>
          </p>
        </div>

        {/* 取引数・勝率 */}
        <div>
          <p className="text-[10px] text-[#888] mb-0.5">取引数 / 勝率</p>
          <p className="text-xl font-bold text-white tabular-nums">
            {summary.tradeCount}
            <span className="text-xs font-normal text-[#666] ml-1">件</span>
            <span className="text-sm font-normal text-[#888] ml-2">
              ({summary.tradeCount > 0 ? `${Math.round(summary.winRate * 100)}%` : '-'})
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 前月比 */}
        <div>
          <p className="text-[10px] text-[#888] mb-0.5">前月比</p>
          <p className={`text-sm font-bold tabular-nums ${diffColor}`}>
            {diffArrow} {diffSign}{summary.monthOverMonthDiff.toLocaleString()}
            <span className="text-xs font-normal text-[#666] ml-1">円</span>
          </p>
        </div>

        {/* 含み損益 */}
        <div>
          <p className="text-[10px] text-[#888] mb-0.5">含み損益</p>
          <p className={`text-sm font-bold tabular-nums ${summary.unrealizedPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
            {summary.unrealizedPnl >= 0 ? '+' : ''}{summary.unrealizedPnl.toLocaleString()}
            <span className="text-xs font-normal text-[#666] ml-1">円</span>
          </p>
        </div>
      </div>
    </div>
  )
}
