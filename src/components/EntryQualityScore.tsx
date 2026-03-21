'use client'

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
  if (!features) return null

  const score = calculateEntryQualityScore(features)
  const color = getScoreColor(score)
  const barColor = getScoreBarColor(score)
  const label = getScoreLabel(score)

  return (
    <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#00d4aa]/70 uppercase tracking-wider">
          エントリー品質スコア
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888]">{label}</span>
          <span className={`text-lg font-mono font-bold ${color}`}>
            {score}
          </span>
        </div>
      </div>
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
