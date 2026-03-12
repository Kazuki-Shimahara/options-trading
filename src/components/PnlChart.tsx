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

export function PnlChart({ data }: { data: PnlChartDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        <p className="text-slate-400">決済済み取引がありません</p>
      </div>
    )
  }

  return (
    <div data-testid="pnl-chart-container" className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">累計損益推移</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatYen} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [`${value.toLocaleString()}円`, '累計損益']}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ fill: '#38bdf8', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">日次損益</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatYen} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [`${value.toLocaleString()}円`, '日次損益']}
              />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar
                dataKey="daily"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
