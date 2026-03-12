'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { SkewDataPoint } from '@/lib/iv-calculations'

interface VolatilitySkewChartProps {
  data: SkewDataPoint[]
}

export default function VolatilitySkewChart({ data }: VolatilitySkewChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <p className="text-slate-400">スキューデータがありません</p>
        <p className="text-slate-500 text-sm mt-2">
          IV履歴にATM・OTMプットの両方のデータが必要です
        </p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date,
    スキュー: Math.round(d.skew * 10000) / 100,
    'ATM IV': Math.round(d.atmIv * 10000) / 100,
    'OTM Put IV': Math.round(d.otmPutIv * 10000) / 100,
  }))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">
        ボラティリティ・スキュー推移
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        OTMプットIV − ATM IV（スキューが大きいほど市場のリスク警戒が強い）
      </p>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v: number) => `${v}%`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`]}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Line
              type="monotone"
              dataKey="スキュー"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ATM IV"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="OTM Put IV"
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
