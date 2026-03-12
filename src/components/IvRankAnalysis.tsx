'use client'

import { useMemo } from 'react'
import { calculateIvRankWinRates } from '@/lib/iv-analysis'
import type { Trade } from '@/types/database'

interface Props {
  trades: Trade[]
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toLocaleString('ja-JP')}円`
}

export default function IvRankAnalysis({ trades }: Props) {
  const bands = useMemo(() => calculateIvRankWinRates(trades), [trades])
  const hasData = bands.some((b) => b.totalTrades > 0)

  // Scatter data: trades with both iv_rank and pnl
  const scatterData = useMemo(
    () =>
      trades
        .filter((t) => t.entry_iv_rank != null && t.pnl != null)
        .map((t) => ({
          ivRank: t.entry_iv_rank!,
          pnl: t.pnl!,
          id: t.id,
        })),
    [trades],
  )

  const maxAbsPnl = useMemo(() => {
    if (scatterData.length === 0) return 1
    return Math.max(...scatterData.map((d) => Math.abs(d.pnl)), 1)
  }, [scatterData])

  if (!hasData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <p className="text-slate-400">
          IVランクデータのある決済済み取引がありません
        </p>
        <p className="text-slate-500 text-sm mt-2">
          取引記録時に「エントリー時IVランク」を入力すると分析が表示されます
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scatter Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          IVランク × 損益 散布図
        </h3>
        <div className="relative w-full h-64">
          {/* Y axis label */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500">
            損益
          </div>
          {/* X axis label */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-slate-500">
            IVランク
          </div>
          {/* Chart area */}
          <div className="ml-6 mb-6 relative w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] border-l border-b border-slate-700">
            {/* Zero line */}
            <div
              className="absolute left-0 right-0 border-t border-dashed border-slate-700"
              style={{ top: '50%' }}
            />
            {/* X axis ticks */}
            {[0, 25, 50, 75, 100].map((tick) => (
              <div
                key={tick}
                className="absolute bottom-0 translate-y-4 text-xs text-slate-500 -translate-x-1/2"
                style={{ left: `${tick}%` }}
              >
                {tick}
              </div>
            ))}
            {/* Data points */}
            {scatterData.map((d) => {
              const x = (d.ivRank / 100) * 100
              // Map pnl to 0-100%, where 50% is zero
              const y = 50 + (d.pnl / maxAbsPnl) * 50
              const clampedY = Math.max(2, Math.min(98, y))
              return (
                <div
                  key={d.id}
                  className={`absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                    d.pnl >= 0
                      ? 'bg-emerald-400 shadow-emerald-400/30'
                      : 'bg-red-400 shadow-red-400/30'
                  } shadow-lg`}
                  style={{
                    left: `${x}%`,
                    bottom: `${clampedY}%`,
                  }}
                  title={`IVランク: ${d.ivRank}, 損益: ${formatPnl(d.pnl)}`}
                />
              )
            })}
          </div>
        </div>
        <div className="flex gap-4 justify-center mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            利益
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            損失
          </span>
        </div>
      </div>

      {/* Win Rate Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          IVランク帯別 勝率
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">
                  IVランク帯
                </th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">
                  取引数
                </th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">
                  勝率
                </th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">
                  平均損益
                </th>
              </tr>
            </thead>
            <tbody>
              {bands.map((band) => (
                <tr
                  key={band.label}
                  className="border-b border-slate-800 last:border-0"
                >
                  <td className="py-3 px-4 text-slate-200">{band.label}</td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    {band.totalTrades}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {band.winRate != null ? (
                      <span
                        className={
                          band.winRate >= 50
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }
                      >
                        {band.winRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {band.averagePnl != null ? (
                      <span
                        className={
                          band.averagePnl >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }
                      >
                        {formatPnl(Math.round(band.averagePnl))}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
