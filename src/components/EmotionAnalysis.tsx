'use client'

import {
  aggregateByEmotion,
  aggregateByConfidence,
  buildConfidenceScatter,
  compareEmotionWinRates,
  type TradeWithEmotion,
} from '@/lib/emotion-analysis'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

interface Props {
  trades: TradeWithEmotion[]
}

export default function EmotionAnalysis({ trades }: Props) {
  const emotionStats = aggregateByEmotion(trades)
  const confidenceStats = aggregateByConfidence(trades)
  const scatterData = buildConfidenceScatter(trades)

  const emotionsWithData = emotionStats.filter((s) => s.total > 0)
  const confidenceWithData = confidenceStats.filter((s) => s.total > 0)

  const calmVsRush =
    emotionStats.find((s) => s.emotion === '冷静')?.total &&
    emotionStats.find((s) => s.emotion === '焦り')?.total
      ? compareEmotionWinRates(emotionStats, '冷静', '焦り')
      : null

  if (emotionsWithData.length === 0 && confidenceWithData.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
        <p className="text-[#555]">感情データが記録された取引がありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calm vs Rush comparison */}
      {calmVsRush && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-3">「冷静」vs「焦り」勝率比較</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#888] mb-0.5">冷静時の勝率</div>
              <div className="text-2xl font-bold text-[#00d4aa]">
                {calmVsRush.emotionA.winRate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#555]">
                {calmVsRush.emotionA.wins}勝{calmVsRush.emotionA.losses}敗
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3 text-center">
              <div className="text-[10px] text-[#888] mb-0.5">焦り時の勝率</div>
              <div className="text-2xl font-bold text-[#ff6b6b]">
                {calmVsRush.emotionB.winRate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#555]">
                {calmVsRush.emotionB.wins}勝{calmVsRush.emotionB.losses}敗
              </div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <span className={`text-sm font-bold ${calmVsRush.diff >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
              差: {calmVsRush.diff >= 0 ? '+' : ''}{calmVsRush.diff.toFixed(1)}pt
            </span>
          </div>
        </div>
      )}

      {/* Emotion win rate bar chart */}
      {emotionsWithData.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-3">感情別勝率・平均損益</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionsWithData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="emotion" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: 8 }}
                  labelStyle={{ color: '#ccc' }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, '勝率']}
                />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {emotionsWithData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.winRate >= 50 ? '#00d4aa' : '#ff6b6b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 mt-3">
            {emotionsWithData.map((stat) => (
              <div
                key={stat.emotion}
                className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-2.5 text-center"
              >
                <div className="text-[10px] text-[#888] mb-0.5">{stat.emotion}</div>
                <div className="text-xs text-[#ccc]">
                  平均: <span className={`font-mono ${stat.avgPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
                    {stat.avgPnl >= 0 ? '+' : ''}{Math.round(stat.avgPnl).toLocaleString()}円
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence scatter plot */}
      {scatterData.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-3">自信度 vs 実績（散布図）</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis
                  type="number"
                  dataKey="confidence"
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#888', fontSize: 11 }}
                  label={{ value: '自信度', position: 'insideBottom', offset: -2, fill: '#666', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="pnl"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  label={{ value: '損益(円)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: 8 }}
                  formatter={(value, name) => [
                    name === 'pnl' ? `${Number(value).toLocaleString()}円` : String(value),
                    name === 'pnl' ? '損益' : '自信度',
                  ]}
                />
                <Scatter data={scatterData} fill="#00d4aa" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Confidence stats table */}
      {confidenceWithData.length > 0 && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-white mb-3">自信度別パフォーマンス</h3>
          <div className="grid grid-cols-5 gap-1.5">
            {confidenceStats.map((stat) => (
              <div
                key={stat.confidence}
                className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-2.5 text-center"
              >
                <div className="text-[10px] text-[#888] mb-0.5">Lv.{stat.confidence}</div>
                <div className="text-base font-bold text-white">
                  {stat.total > 0 ? `${stat.winRate.toFixed(0)}%` : '-'}
                </div>
                <div className="text-[10px] text-[#555]">
                  {stat.total > 0 ? `${stat.wins}勝${stat.losses}敗` : 'データなし'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
