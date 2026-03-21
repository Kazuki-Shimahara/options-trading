'use client'

import { aggregateScoreBands, type ScoreBand } from '@/lib/entry-quality-scoring'
import type { Trade } from '@/types/database'

interface Props {
  trades: Trade[]
}

function getBandBarColor(winRate: number | null): string {
  if (winRate == null) return 'bg-[#333]'
  if (winRate >= 70) return 'bg-[#00d4aa]'
  if (winRate >= 50) return 'bg-[#4ade80]'
  if (winRate >= 30) return 'bg-[#f0b429]'
  return 'bg-[#ff6b6b]'
}

export default function ScoreBandAnalysis({ trades }: Props) {
  const bands = aggregateScoreBands(trades)
  const maxTrades = Math.max(...bands.map((b) => b.totalTrades), 1)

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1e1e1e]">
            <th className="text-left text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
              IVランク帯
            </th>
            <th className="text-right text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
              取引数
            </th>
            <th className="text-right text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
              勝率
            </th>
            <th className="text-right text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5">
              平均損益
            </th>
            <th className="text-left text-[10px] text-[#00d4aa]/70 font-medium px-4 py-2.5 hidden sm:table-cell">
              分布
            </th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band: ScoreBand) => {
            const ratio = band.totalTrades > 0
              ? (band.totalTrades / maxTrades) * 100
              : 0
            return (
              <tr
                key={band.label}
                className="border-b border-[#1e1e1e]/50 last:border-0"
              >
                <td className="px-4 py-2.5 text-[#ccc] font-mono">
                  {band.label}
                </td>
                <td className="px-4 py-2.5 text-right text-[#888] font-mono">
                  {band.totalTrades}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {band.winRate != null ? (
                    <span
                      className={
                        band.winRate >= 50 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
                      }
                    >
                      {band.winRate.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[#555]">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {band.averagePnl != null ? (
                    <span
                      className={
                        band.averagePnl >= 0
                          ? 'text-[#00d4aa]'
                          : 'text-[#ff6b6b]'
                      }
                    >
                      {band.averagePnl >= 0 ? '+' : ''}
                      {band.averagePnl.toLocaleString()}円
                    </span>
                  ) : (
                    <span className="text-[#555]">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${getBandBarColor(band.winRate)}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
