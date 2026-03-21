'use client'

import { useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  runMonteCarloSimulation,
  type MonteCarloResult,
  type HistogramBin,
} from '@/lib/monte-carlo'

interface MonteCarloSimulationProps {
  pnlHistory: number[]
}

export default function MonteCarloSimulation({ pnlHistory }: MonteCarloSimulationProps) {
  const [result, setResult] = useState<MonteCarloResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [numSimulations, setNumSimulations] = useState(10000)
  const [numDays, setNumDays] = useState(20)

  const runSimulation = useCallback(() => {
    if (pnlHistory.length < 2) return

    setIsRunning(true)
    // Use setTimeout to avoid blocking the main thread for initial render
    setTimeout(() => {
      try {
        const simResult = runMonteCarloSimulation({
          pnlHistory,
          numSimulations,
          numDays,
        })
        setResult(simResult)
      } catch (e) {
        console.error('Simulation error:', e)
      } finally {
        setIsRunning(false)
      }
    }, 0)
  }, [pnlHistory, numSimulations, numDays])

  if (pnlHistory.length < 2) {
    return (
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8 text-center">
        <p className="text-[#555]">モンテカルロシミュレーションには最低2件の決済済み取引が必要です</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[10px] text-[#888] mb-1">シミュレーション回数</label>
            <select
              value={numSimulations}
              onChange={(e) => setNumSimulations(Number(e.target.value))}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={50000}>50,000</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-[#888] mb-1">シミュレーション日数</label>
            <select
              value={numDays}
              onChange={(e) => setNumDays(Number(e.target.value))}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value={5}>5日</option>
              <option value={10}>10日</option>
              <option value={20}>20日（1ヶ月）</option>
              <option value={60}>60日（3ヶ月）</option>
            </select>
          </div>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="bg-[#00d4aa] text-black font-medium px-4 py-1.5 rounded-lg text-sm hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '計算中...' : 'シミュレーション実行'}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* VaR / CVaR Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCard label="VaR (95%)" value={result.var95} />
            <MetricCard label="VaR (99%)" value={result.var99} />
            <MetricCard label="CVaR (95%)" value={result.cvar95} />
            <MetricCard label="CVaR (99%)" value={result.cvar99} />
          </div>

          {/* Distribution Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <StatCard label="平均" value={result.stats.mean} />
            <StatCard label="標準偏差" value={result.stats.stdDev} />
            <StatCard label="中央値" value={result.stats.median} />
            <StatCard label="最小" value={result.stats.min} />
            <StatCard label="最大" value={result.stats.max} />
          </div>

          {/* Histogram */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-3">損益分布ヒストグラム</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={result.histogram.map((bin) => ({
                  ...bin,
                  label: formatBinLabel(bin),
                }))}
                margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#888', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'count') return [String(value), '回数']
                    return [String(value), String(name)]
                  }}
                  labelFormatter={(label) => `損益: ${String(label)}`}
                />
                <ReferenceLine x={findBinIndex(result.histogram, result.var95)} stroke="#ff6b6b" strokeDasharray="5 5" label={{ value: 'VaR95', fill: '#ff6b6b', fontSize: 10 }} />
                <ReferenceLine x={findBinIndex(result.histogram, result.var99)} stroke="#ff4444" strokeDasharray="5 5" label={{ value: 'VaR99', fill: '#ff4444', fontSize: 10 }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {result.histogram.map((bin, index) => (
                    <Cell
                      key={index}
                      fill={bin.binEnd <= result.var99 ? '#ff4444' : bin.binEnd <= result.var95 ? '#ff6b6b' : '#00d4aa'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <Legend color="#ff4444" label="VaR 99%以下" />
              <Legend color="#ff6b6b" label="VaR 95%以下" />
              <Legend color="#00d4aa" label="通常範囲" />
            </div>
          </div>

          {/* Worst Case Scenarios */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white mb-3">最悪ケースシナリオ</h3>
            <div className="space-y-2">
              <WorstCaseRow
                label="99%信頼区間の最大損失"
                value={result.var99}
                description={`${numDays}日間で99%の確率でこの金額以上の損失は発生しない`}
              />
              <WorstCaseRow
                label="99%超過時の平均損失"
                value={result.cvar99}
                description="VaR(99%)を超えた場合の期待損失額"
              />
              <WorstCaseRow
                label="シミュレーション中の最大損失"
                value={result.stats.min}
                description={`${numSimulations.toLocaleString()}回のシミュレーションで観測された最大損失`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 text-center">
      <div className="text-[10px] text-[#888] mb-0.5">{label}</div>
      <div className={`text-lg font-bold font-mono ${value < 0 ? 'text-[#ff6b6b]' : 'text-[#00d4aa]'}`}>
        {value.toLocaleString()}円
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-2.5 text-center">
      <div className="text-[10px] text-[#888] mb-0.5">{label}</div>
      <div className="text-sm font-bold text-white font-mono">
        {Math.round(value).toLocaleString()}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-[#888]">{label}</span>
    </div>
  )
}

function WorstCaseRow({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1e1e1e]/50 last:border-0">
      <div>
        <div className="text-xs text-[#ccc]">{label}</div>
        <div className="text-[10px] text-[#555]">{description}</div>
      </div>
      <div className={`text-sm font-bold font-mono ${value < 0 ? 'text-[#ff6b6b]' : 'text-[#00d4aa]'}`}>
        {Math.round(value).toLocaleString()}円
      </div>
    </div>
  )
}

function formatBinLabel(bin: HistogramBin): string {
  return `${(bin.binStart / 1000).toFixed(0)}k`
}

function findBinIndex(histogram: HistogramBin[], value: number): string {
  for (const bin of histogram) {
    if (value >= bin.binStart && value < bin.binEnd) {
      return formatBinLabel(bin)
    }
  }
  return formatBinLabel(histogram[0])
}
