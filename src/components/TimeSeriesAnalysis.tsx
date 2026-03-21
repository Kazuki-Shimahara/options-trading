'use client'

import {
  calculateDayOfWeekStats,
  calculateMonthlyPerformance,
  calculateSQWeekComparison,
  calculateEventPerformance,
  buildHeatmapData,
  type GroupStats,
  type HeatmapCell,
} from '@/lib/time-series-analysis'
import type { Trade } from '@/lib/trade-schema'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const winRateFormatter = (value: any) => [`${Number(value)}%`, '勝率']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pnlFormatter = (value: any) => [formatPnl(Number(value)), '損益合計']

function formatPnl(value: number): string {
  if (value >= 0) return `+${value.toLocaleString()}円`
  return `${value.toLocaleString()}円`
}

function StatsCard({ label, stats }: { label: string; stats: GroupStats }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
      <div className="text-[10px] text-[#888] mb-1">{label}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-[#666]">取引数</div>
          <div className="text-sm font-bold text-white">{stats.tradeCount}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#666]">勝率</div>
          <div className="text-sm font-bold text-white">{stats.winRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[10px] text-[#666]">平均損益</div>
          <div className={`text-sm font-bold font-mono ${stats.averagePnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
            {formatPnl(Math.round(stats.averagePnl))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DayOfWeekSection({ trades }: { trades: Trade[] }) {
  const stats = calculateDayOfWeekStats(trades)
  // Filter to weekdays only (1=Mon to 5=Fri)
  const weekdayStats = stats.filter((s) => s.dayOfWeek >= 1 && s.dayOfWeek <= 5)

  const chartData = weekdayStats.map((s) => ({
    name: s.dayLabel,
    winRate: Number(s.winRate.toFixed(1)),
    averagePnl: Math.round(s.averagePnl),
    tradeCount: s.tradeCount,
  }))

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#00d4aa]/70 mb-2">曜日別勝率・平均損益</h3>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 mb-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#ccc' }}
              formatter={winRateFormatter}
            />
            <Bar dataKey="winRate" name="勝率" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.winRate >= 50 ? '#00d4aa' : '#ff6b6b'} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {weekdayStats.map((s) => (
          <div key={s.dayOfWeek} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-2 text-center">
            <div className="text-xs font-bold text-white">{s.dayLabel}</div>
            <div className="text-[10px] text-[#888]">{s.tradeCount}件</div>
            <div className={`text-xs font-mono ${s.winRate >= 50 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
              {s.tradeCount > 0 ? `${s.winRate.toFixed(0)}%` : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthlySection({ trades }: { trades: Trade[] }) {
  const monthly = calculateMonthlyPerformance(trades)

  const chartData = monthly.map((m) => ({
    name: m.yearMonth.slice(5), // 'MM'
    totalPnl: m.totalPnl,
    winRate: Number(m.winRate.toFixed(1)),
    tradeCount: m.tradeCount,
  }))

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#00d4aa]/70 mb-2">月別パフォーマンス推移</h3>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
        {chartData.length === 0 ? (
          <p className="text-[#555] text-center text-sm py-8">データなし</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#ccc' }}
                formatter={pnlFormatter}
              />
              <Bar dataKey="totalPnl" name="損益合計" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.totalPnl >= 0 ? '#00d4aa' : '#ff6b6b'} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function SQWeekSection({ trades }: { trades: Trade[] }) {
  const comparison = calculateSQWeekComparison(trades)

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#00d4aa]/70 mb-2">SQ週 vs 非SQ週</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatsCard label="SQ週（SQ前3営業日以内）" stats={comparison.sqWeek} />
        <StatsCard label="非SQ週" stats={comparison.nonSQWeek} />
      </div>
    </div>
  )
}

function EventSection({ trades }: { trades: Trade[] }) {
  const fomcPerf = calculateEventPerformance(trades, 'fomc', 1)
  const bojPerf = calculateEventPerformance(trades, 'boj', 1)

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#00d4aa]/70 mb-2">イベント前後のパフォーマンス</h3>
      <div className="space-y-2">
        <div>
          <div className="text-[10px] text-[#888] mb-1">FOMC前後（前後1日以内）</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StatsCard label="FOMC近辺" stats={fomcPerf.nearEvent} />
            <StatsCard label="FOMC以外" stats={fomcPerf.farFromEvent} />
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#888] mb-1">日銀会合前後（前後1日以内）</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StatsCard label="日銀近辺" stats={bojPerf.nearEvent} />
            <StatsCard label="日銀以外" stats={bojPerf.farFromEvent} />
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatmapSection({ trades }: { trades: Trade[] }) {
  const cells = buildHeatmapData(trades)
  // Filter to weekdays
  const weekdayCells = cells.filter((c) => c.dayOfWeek >= 1 && c.dayOfWeek <= 5)

  const maxPnl = Math.max(...weekdayCells.map((c) => Math.abs(c.averagePnl)), 1)

  function getCellColor(cell: HeatmapCell): string {
    if (cell.tradeCount === 0) return '#1a1a1a'
    const intensity = Math.min(Math.abs(cell.averagePnl) / maxPnl, 1)
    if (cell.averagePnl >= 0) {
      const alpha = Math.round(intensity * 40 + 10)
      return `rgba(0, 212, 170, ${alpha / 100})`
    }
    const alpha = Math.round(intensity * 40 + 10)
    return `rgba(255, 107, 107, ${alpha / 100})`
  }

  const dayLabels = ['月', '火', '水', '木', '金']
  const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#00d4aa]/70 mb-2">曜日 x 月 ヒートマップ</h3>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="text-[10px] text-[#666] p-1"></th>
              {monthLabels.map((m) => (
                <th key={m} className="text-[10px] text-[#666] p-1">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayLabels.map((dayLabel, dayIdx) => {
              const dayOfWeek = dayIdx + 1
              return (
                <tr key={dayOfWeek}>
                  <td className="text-[10px] text-[#888] p-1 font-medium">{dayLabel}</td>
                  {Array.from({ length: 12 }, (_, mIdx) => {
                    const cell = weekdayCells.find(
                      (c) => c.dayOfWeek === dayOfWeek && c.month === mIdx + 1,
                    )!
                    return (
                      <td
                        key={mIdx}
                        className="p-0.5"
                        title={
                          cell.tradeCount > 0
                            ? `${cell.dayLabel} ${cell.monthLabel}: ${cell.tradeCount}件, 勝率${cell.winRate.toFixed(0)}%, 平均${formatPnl(Math.round(cell.averagePnl))}`
                            : `${cell.dayLabel} ${cell.monthLabel}: データなし`
                        }
                      >
                        <div
                          className="rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
                          style={{ backgroundColor: getCellColor(cell) }}
                        >
                          <span className="text-[9px] text-white/70">
                            {cell.tradeCount > 0 ? `${cell.winRate.toFixed(0)}%` : '-'}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function TimeSeriesAnalysis({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">時系列パターン分析</h2>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
          <p className="text-[#555]">分析に必要な決済済み取引がありません</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-white mb-3">時系列パターン分析</h2>
      <div className="space-y-4">
        <DayOfWeekSection trades={trades} />
        <MonthlySection trades={trades} />
        <SQWeekSection trades={trades} />
        <EventSection trades={trades} />
        <HeatmapSection trades={trades} />
      </div>
    </section>
  )
}
