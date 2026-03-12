'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { PnlChartDataPoint } from '@/lib/pnl-chart-data'

function formatYen(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}万`
  }
  return value.toLocaleString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pnlFormatter = (value: any) => [`${Number(value).toLocaleString()}円`, '累計損益']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dailyFormatter = (value: any) => [`${Number(value).toLocaleString()}円`, '日次損益']

export function PnlChart({ data }: { data: PnlChartDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
        <p className="text-[#555]">決済済み取引がありません</p>
      </div>
    )
  }

  return (
    <div data-testid="pnl-chart-container" className="space-y-6 mb-6">
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">累計損益推移</h2>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatYen} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ccc' }}
                formatter={pnlFormatter}
              />
              <ReferenceLine y={0} stroke="#333" />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#00d4aa"
                strokeWidth={2}
                dot={{ fill: '#00d4aa', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">日次損益</h2>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatYen} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '8px' }}
                labelStyle={{ color: '#ccc' }}
                formatter={dailyFormatter}
              />
              <ReferenceLine y={0} stroke="#333" />
              <Bar
                dataKey="daily"
                fill="#00d4aa"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
