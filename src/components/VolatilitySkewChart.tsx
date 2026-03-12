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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const skewFormatter = (value: any) => [`${Number(value).toFixed(2)}%`]

export default function VolatilitySkewChart({ data }: VolatilitySkewChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
        <p className="text-[#555]">スキューデータがありません</p>
        <p className="text-[#444] text-xs mt-2">
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
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-2">
        ボラティリティ・スキュー推移
      </h2>
      <p className="text-[#555] text-[10px] mb-4">
        OTMプットIV - ATM IV（スキューが大きいほど市場のリスク警戒が強い）
      </p>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#555', fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: '#555', fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                color: '#ccc',
              }}
              formatter={skewFormatter}
            />
            <Legend wrapperStyle={{ color: '#888' }} />
            <Line
              type="monotone"
              dataKey="スキュー"
              stroke="#f0b429"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ATM IV"
              stroke="#00d4aa"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="OTM Put IV"
              stroke="#ff6b6b"
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
