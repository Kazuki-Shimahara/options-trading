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
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
        <p className="text-[#555]">
          IVランクデータのある決済済み取引がありません
        </p>
        <p className="text-[#444] text-xs mt-2">
          取引記録時に「エントリー時IVランク」を入力すると分析が表示されます
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Scatter Chart */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">
          IVランク x 損益 散布図
        </h3>
        <div className="relative w-full h-56">
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-[#555]">
            損益
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-[#555]">
            IVランク
          </div>
          <div className="ml-6 mb-6 relative w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] border-l border-b border-[#2a2a2a]">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-[#2a2a2a]"
              style={{ top: '50%' }}
            />
            {[0, 25, 50, 75, 100].map((tick) => (
              <div
                key={tick}
                className="absolute bottom-0 translate-y-4 text-[10px] text-[#555] -translate-x-1/2"
                style={{ left: `${tick}%` }}
              >
                {tick}
              </div>
            ))}
            {scatterData.map((d) => {
              const x = (d.ivRank / 100) * 100
              const y = 50 + (d.pnl / maxAbsPnl) * 50
              const clampedY = Math.max(2, Math.min(98, y))
              return (
                <div
                  key={d.id}
                  className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                    d.pnl >= 0
                      ? 'bg-[#00d4aa] shadow-[#00d4aa]/30'
                      : 'bg-[#ff6b6b] shadow-[#ff6b6b]/30'
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
        <div className="flex gap-4 justify-center mt-1 text-[10px] text-[#666]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00d4aa] inline-block" />
            利益
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ff6b6b] inline-block" />
            損失
          </span>
        </div>
      </div>

      {/* Win Rate Table */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">
          IVランク帯別 勝率
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="text-left py-2 px-3 text-[10px] text-[#00d4aa]/70 font-medium">
                  IVランク帯
                </th>
                <th className="text-right py-2 px-3 text-[10px] text-[#00d4aa]/70 font-medium">
                  取引数
                </th>
                <th className="text-right py-2 px-3 text-[10px] text-[#00d4aa]/70 font-medium">
                  勝率
                </th>
                <th className="text-right py-2 px-3 text-[10px] text-[#00d4aa]/70 font-medium">
                  平均損益
                </th>
              </tr>
            </thead>
            <tbody>
              {bands.map((band) => (
                <tr
                  key={band.label}
                  className="border-b border-[#1e1e1e]/50 last:border-0"
                >
                  <td className="py-2.5 px-3 text-[#ccc]">{band.label}</td>
                  <td className="py-2.5 px-3 text-right text-[#888]">
                    {band.totalTrades}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {band.winRate != null ? (
                      <span
                        className={
                          band.winRate >= 50
                            ? 'text-[#00d4aa]'
                            : 'text-[#ff6b6b]'
                        }
                      >
                        {band.winRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-[#555]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {band.averagePnl != null ? (
                      <span
                        className={
                          band.averagePnl >= 0
                            ? 'text-[#00d4aa]'
                            : 'text-[#ff6b6b]'
                        }
                      >
                        {formatPnl(Math.round(band.averagePnl))}
                      </span>
                    ) : (
                      <span className="text-[#555]">-</span>
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
