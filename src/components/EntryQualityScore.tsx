'use client'

import { useState } from 'react'
import { calculateEntryQualityScore, type EntryFeatures } from '@/lib/entry-quality-scoring'

interface Props {
  features: EntryFeatures | null
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[#00d4aa]'
  if (score >= 60) return 'text-[#4ade80]'
  if (score >= 40) return 'text-[#f0b429]'
  if (score >= 20) return 'text-[#ff9f43]'
  return 'text-[#ff6b6b]'
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-[#00d4aa]'
  if (score >= 60) return 'bg-[#4ade80]'
  if (score >= 40) return 'bg-[#f0b429]'
  if (score >= 20) return 'bg-[#ff9f43]'
  return 'bg-[#ff6b6b]'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '優良'
  if (score >= 60) return '良好'
  if (score >= 40) return '普通'
  if (score >= 20) return '注意'
  return '危険'
}

export default function EntryQualityScore({ features }: Props) {
  const [showHelp, setShowHelp] = useState(false)

  if (!features) return null

  const score = calculateEntryQualityScore(features)
  const color = getScoreColor(score)
  const barColor = getScoreBarColor(score)
  const label = getScoreLabel(score)

  return (
    <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#00d4aa]/70 uppercase tracking-wider flex items-center gap-1">
          エントリー品質スコア
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="w-4 h-4 rounded-full border border-[#555] text-[#888] hover:text-[#00d4aa] hover:border-[#00d4aa] text-[9px] leading-none transition-colors"
          >
            ?
          </button>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888]">{label}</span>
          <span className={`text-lg font-mono font-bold ${color}`}>
            {score}
          </span>
        </div>
      </div>
      {showHelp && (
        <div className="mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-[11px] text-[#aaa]">
          <p className="text-[#00d4aa] font-semibold mb-1.5">スコア目安表</p>
          <table className="w-full">
            <tbody>
              {[
                ['81-100', '最高の好機'],
                ['61-80', '好条件'],
                ['41-60', '普通'],
                ['21-40', 'やや不利'],
                ['0-20', '不適（エントリー避けるべき）'],
              ].map(([range, desc]) => (
                <tr key={range} className="border-b border-[#2a2a2a] last:border-b-0">
                  <td className="py-1 pr-3 font-mono text-white whitespace-nowrap">{range}</td>
                  <td className="py-1 text-[#888]">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-1.5 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[10px] text-[#444] mt-1.5">
        IVランク・PCR・スキュー・曜日・イベント前後を加味した総合評価
      </p>
    </div>
  )
}
