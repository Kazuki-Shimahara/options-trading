'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import {
  calculateCombinedPayoff,
  findBreakevenPoints,
  findMaxProfit,
  findMaxLoss,
  generatePriceRange,
  type PayoffPosition,
} from '@/lib/payoff'

const POSITION_COLORS = [
  '#00d4aa',
  '#ff6b6b',
  '#f0b429',
  '#6b8afd',
  '#e879f9',
  '#38bdf8',
]

function formatYen(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}万`
  }
  return value.toLocaleString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const payoffFormatter = (value: any) => [
  `${Number(value).toLocaleString()}円`,
  '合成損益',
]

interface PayoffDiagramProps {
  positions: PayoffPosition[]
  underlyingPrice?: number
}

export function PayoffDiagram({ positions, underlyingPrice }: PayoffDiagramProps) {
  const { chartData, breakevens, maxProfit, maxLossInfo } = useMemo(() => {
    if (positions.length === 0) {
      return { chartData: [], breakevens: [], maxProfit: null, maxLossInfo: null }
    }

    const prices = generatePriceRange(positions, underlyingPrice)
    const data = calculateCombinedPayoff(positions, prices)

    const chartPoints = data.map((d) => {
      const point: Record<string, number> = {
        price: d.price,
        payoff: d.payoff,
      }
      d.positions.forEach((val, idx) => {
        point[`pos_${idx}`] = val
      })
      return point
    })

    return {
      chartData: chartPoints,
      breakevens: findBreakevenPoints(data),
      maxProfit: findMaxProfit(data),
      maxLossInfo: findMaxLoss(data),
    }
  }, [positions, underlyingPrice])

  if (positions.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-12 text-center">
        <p className="text-[#555]">ポジションがありません</p>
      </div>
    )
  }

  return (
    <div data-testid="payoff-diagram" className="space-y-4">
      {/* Summary annotations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {maxProfit && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <div className="text-[10px] text-[#888] mb-0.5">最大利益</div>
            <div className="text-base font-bold text-[#00d4aa]">
              {maxProfit.value === Infinity
                ? '無限大'
                : `${formatYen(maxProfit.value)}円`}
            </div>
            <div className="text-[10px] text-[#555]">
              @{maxProfit.price.toLocaleString()}円
            </div>
          </div>
        )}
        {maxLossInfo && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
            <div className="text-[10px] text-[#888] mb-0.5">最大損失</div>
            <div className="text-base font-bold text-[#ff6b6b]">
              {`${formatYen(maxLossInfo.value)}円`}
            </div>
            <div className="text-[10px] text-[#555]">
              @{maxLossInfo.price.toLocaleString()}円
            </div>
          </div>
        )}
        {breakevens.length > 0 && (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center col-span-2">
            <div className="text-[10px] text-[#888] mb-0.5">損益分岐点</div>
            <div className="text-base font-bold text-white">
              {breakevens.map((b) => `${Math.round(b).toLocaleString()}円`).join(' / ')}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis
              dataKey="price"
              stroke="#555"
              fontSize={11}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              stroke="#555"
              fontSize={11}
              tickFormatter={formatYen}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#ccc' }}
              labelFormatter={(v) => `原資産: ${Number(v).toLocaleString()}円`}
              formatter={payoffFormatter}
            />

            {/* Zero line */}
            <ReferenceLine y={0} stroke="#333" strokeWidth={1} />

            {/* Breakeven points */}
            {breakevens.map((be, i) => (
              <ReferenceLine
                key={`be-${i}`}
                x={Math.round(be)}
                stroke="#f0b429"
                strokeDasharray="4 4"
                label={{
                  value: `BE: ${Math.round(be).toLocaleString()}`,
                  position: 'top',
                  fill: '#f0b429',
                  fontSize: 10,
                }}
              />
            ))}

            {/* Current underlying price */}
            {underlyingPrice && (
              <ReferenceLine
                x={underlyingPrice}
                stroke="#6b8afd"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{
                  value: `現在値: ${underlyingPrice.toLocaleString()}`,
                  position: 'top',
                  fill: '#6b8afd',
                  fontSize: 10,
                }}
              />
            )}

            {/* Individual position lines (dashed) */}
            {positions.map((_, idx) => (
              <Line
                key={`pos-${idx}`}
                type="monotone"
                dataKey={`pos_${idx}`}
                stroke={POSITION_COLORS[idx % POSITION_COLORS.length]}
                strokeWidth={1}
                strokeDasharray="4 2"
                dot={false}
                name={`${positions[idx].side === 'buy' ? '買' : '売'} ${positions[idx].trade_type.toUpperCase()} @${positions[idx].strike_price.toLocaleString()}`}
              />
            ))}

            {/* Combined payoff line */}
            <Line
              type="monotone"
              dataKey="payoff"
              stroke="#ffffff"
              strokeWidth={2.5}
              dot={false}
              name="合成損益"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Position legend */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3">
        <div className="text-[10px] text-[#888] mb-2">ポジション</div>
        <div className="flex flex-wrap gap-3">
          {positions.map((pos, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-[#ccc]">
              <span
                className="inline-block w-3 h-0.5 rounded"
                style={{
                  backgroundColor: POSITION_COLORS[idx % POSITION_COLORS.length],
                }}
              />
              <span>
                {pos.side === 'buy' ? '買' : '売'}{' '}
                {pos.trade_type === 'call' ? 'コール' : 'プット'}{' '}
                {pos.strike_price.toLocaleString()}円 ×{pos.quantity}
                {pos.is_mini ? ' (ミニ)' : ''}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-white font-medium">
            <span className="inline-block w-3 h-0.5 rounded bg-white" />
            <span>合成損益</span>
          </div>
        </div>
      </div>
    </div>
  )
}
