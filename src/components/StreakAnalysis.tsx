'use client'

import {
  detectStreaks,
  detectRevengeTrades,
  calculateMentalScore,
  analyzePositionSizeChanges,
  type Streak,
  type RevengeTrade,
  type MentalScoreEntry,
  type PositionSizeAnalysis,
} from '@/lib/streak-analysis'
import type { Trade } from '@/types/database'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface StreakAnalysisProps {
  trades: Trade[]
}

function StreakBadge({ streak }: { streak: Streak }) {
  const isWin = streak.type === 'win'
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono ${
        isWin
          ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
          : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20'
      }`}
    >
      <span>{isWin ? '連勝' : '連敗'}</span>
      <span className="font-bold">{streak.count}</span>
    </div>
  )
}

function StreakTimeline({ streaks }: { streaks: Streak[] }) {
  if (streaks.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
        <p className="text-[#555]">ストリークデータがありません</p>
      </div>
    )
  }

  const maxStreak = Math.max(
    ...streaks.filter((s) => s.type === 'win').map((s) => s.count),
    0
  )
  const maxLossStreak = Math.max(
    ...streaks.filter((s) => s.type === 'loss').map((s) => s.count),
    0
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
          <div className="text-[10px] text-[#888] mb-0.5">最大連勝</div>
          <div className="text-xl font-bold text-[#00d4aa]">{maxStreak}</div>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
          <div className="text-[10px] text-[#888] mb-0.5">最大連敗</div>
          <div className="text-xl font-bold text-[#ff6b6b]">{maxLossStreak}</div>
        </div>
      </div>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
        <div className="text-[10px] text-[#888] mb-2">ストリーク履歴</div>
        <div className="flex flex-wrap gap-1.5">
          {streaks.map((streak, i) => (
            <StreakBadge key={i} streak={streak} />
          ))}
        </div>
      </div>
    </div>
  )
}

function RevengeTradeWarnings({ warnings }: { warnings: RevengeTrade[] }) {
  if (warnings.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 text-center">
        <p className="text-[#00d4aa] text-sm">リベンジトレードの疑いなし</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <div
          key={w.tradeId}
          className="bg-[#ff6b6b]/5 border border-[#ff6b6b]/20 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#ff6b6b] text-sm font-bold">⚠ リベンジトレード疑い</span>
          </div>
          <p className="text-[#ccc] text-xs">{w.reason}</p>
          <p className="text-[#666] text-[10px] mt-1">
            取引ID: {w.tradeId}（前回損失: {w.previousLossTradeId}）
          </p>
        </div>
      ))}
    </div>
  )
}

function MentalScoreChart({ data }: { data: MentalScoreEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
        <p className="text-[#555]">メンタルスコアデータがありません</p>
      </div>
    )
  }

  const latestScore = data[data.length - 1].score
  let scoreColor = '#00d4aa'
  let scoreLabel = '良好'
  if (latestScore < 30) {
    scoreColor = '#ff6b6b'
    scoreLabel = '注意'
  } else if (latestScore < 60) {
    scoreColor = '#f0b429'
    scoreLabel = '普通'
  }

  return (
    <div className="space-y-3">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
        <div className="text-[10px] text-[#888] mb-0.5">現在のメンタルスコア</div>
        <div className="text-2xl font-bold" style={{ color: scoreColor }}>
          {latestScore}
        </div>
        <div className="text-xs" style={{ color: scoreColor }}>
          {scoreLabel}
        </div>
      </div>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#666', fontSize: 10 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#666', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(label) => `日付: ${label}`}
              formatter={(value) => [`${value}`, 'スコア']}
            />
            <ReferenceLine y={50} stroke="#333" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#ff6b6b33" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#00d4aa"
              strokeWidth={2}
              dot={{ fill: '#00d4aa', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PositionSizeSection({ analysis }: { analysis: PositionSizeAnalysis }) {
  if (analysis.baselineAvg == null) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
        <p className="text-[#555]">ポジションサイズデータがありません</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
        <div className="text-[10px] text-[#888] mb-0.5">全体平均</div>
        <div className="text-lg font-bold text-white font-mono">
          {analysis.baselineAvg.toFixed(1)}
        </div>
      </div>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
        <div className="text-[10px] text-[#888] mb-0.5">連勝中平均</div>
        <div className="text-lg font-bold text-[#00d4aa] font-mono">
          {analysis.duringWinStreak?.toFixed(1) ?? '-'}
        </div>
      </div>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
        <div className="text-[10px] text-[#888] mb-0.5">連敗中平均</div>
        <div className="text-lg font-bold text-[#ff6b6b] font-mono">
          {analysis.duringLossStreak?.toFixed(1) ?? '-'}
        </div>
      </div>
    </div>
  )
}

export default function StreakAnalysis({ trades }: StreakAnalysisProps) {
  const streaks = detectStreaks(trades)
  const revengeTrades = detectRevengeTrades(trades)
  const mentalScores = calculateMentalScore(trades)
  const positionAnalysis = analyzePositionSizeChanges(trades)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">
          連勝/連敗ストリーク
        </h2>
        <StreakTimeline streaks={streaks} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">
          リベンジトレード検出
        </h2>
        <p className="text-[10px] text-[#666] mb-2">
          損失後24時間以内に1.5倍以上のポジションを取った取引を検出
        </p>
        <RevengeTradeWarnings warnings={revengeTrades} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">
          メンタル状態スコア
        </h2>
        <p className="text-[10px] text-[#666] mb-2">
          勝敗パターンから推定するメンタル状態（0-100）
        </p>
        <MentalScoreChart data={mentalScores} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">
          ポジションサイズ変化分析
        </h2>
        <p className="text-[10px] text-[#666] mb-2">
          連勝/連敗時のポジションサイズ変化を分析
        </p>
        <PositionSizeSection analysis={positionAnalysis} />
      </section>
    </div>
  )
}
