'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  simulatePortfolio,
  compareScenarios,
  generatePayoffData,
  type SimulationPosition,
  type SimulationParams,
  type Scenario,
} from '@/lib/what-if-simulator'

const DEFAULT_SPOT = 38000
const DEFAULT_IV = 0.20
const DEFAULT_DAYS = 30

interface PositionInput {
  id: number
  strike: string
  optionType: 'call' | 'put'
  quantity: string
  entryPrice: string
  isMini: boolean
}

let nextId = 1

function createEmptyPosition(): PositionInput {
  return {
    id: nextId++,
    strike: '38000',
    optionType: 'call',
    quantity: '1',
    entryPrice: '500',
    isMini: false,
  }
}

export default function WhatIfPage() {
  // ポジション入力
  const [positionInputs, setPositionInputs] = useState<PositionInput[]>([createEmptyPosition()])

  // スライダー値
  const [spot, setSpot] = useState(DEFAULT_SPOT)
  const [ivChange, setIvChange] = useState(0)
  const [daysToExpiry, setDaysToExpiry] = useState(DEFAULT_DAYS)

  // シナリオ比較モード
  const [showScenarios, setShowScenarios] = useState(false)

  // ポジション変換
  const positions: SimulationPosition[] = useMemo(() => {
    return positionInputs
      .filter((p) => Number(p.strike) > 0 && Number(p.entryPrice) >= 0)
      .map((p) => ({
        strike: Number(p.strike),
        optionType: p.optionType,
        quantity: Number(p.quantity),
        entryPrice: Number(p.entryPrice),
        isMini: p.isMini,
      }))
  }, [positionInputs])

  // シミュレーションパラメータ
  const params: SimulationParams = useMemo(
    () => ({
      spot,
      ivChange,
      daysToExpiry,
      baseIv: DEFAULT_IV,
    }),
    [spot, ivChange, daysToExpiry]
  )

  // メイン結果
  const result = useMemo(() => {
    if (positions.length === 0) return null
    return simulatePortfolio(positions, params)
  }, [positions, params])

  // シナリオ比較
  const scenarioResults = useMemo(() => {
    if (!showScenarios || positions.length === 0) return null
    const scenarios: Scenario[] = [
      { name: '現在', params },
      { name: 'IV +5%pt', params: { ...params, ivChange: params.ivChange + 0.05 } },
      { name: 'IV -5%pt', params: { ...params, ivChange: params.ivChange - 0.05 } },
      { name: '原資産 +3%', params: { ...params, spot: Math.round(params.spot * 1.03) } },
      { name: '原資産 -3%', params: { ...params, spot: Math.round(params.spot * 0.97) } },
    ]
    return compareScenarios(positions, scenarios)
  }, [showScenarios, positions, params])

  // ペイオフデータ
  const payoffData = useMemo(() => {
    if (positions.length === 0) return []
    const range = {
      min: Math.round(spot * 0.9),
      max: Math.round(spot * 1.1),
      step: Math.round(spot * 0.005),
    }
    const paramsNoSpot = {
      ivChange: params.ivChange,
      daysToExpiry: params.daysToExpiry,
      baseIv: params.baseIv,
    }
    return generatePayoffData(positions, paramsNoSpot, range)
  }, [positions, params, spot])

  // ペイオフチャートの最大・最小PnL
  const payoffBounds = useMemo(() => {
    if (payoffData.length === 0) return { min: 0, max: 0 }
    const pnls = payoffData.map((p) => p.pnl)
    return { min: Math.min(...pnls), max: Math.max(...pnls) }
  }, [payoffData])

  const addPosition = useCallback(() => {
    setPositionInputs((prev) => [...prev, createEmptyPosition()])
  }, [])

  const removePosition = useCallback((id: number) => {
    setPositionInputs((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const updatePosition = useCallback((id: number, field: keyof PositionInput, value: string | boolean) => {
    setPositionInputs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }, [])

  return (
    <main className="min-h-screen px-4 pt-2 pb-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-lg font-bold text-white py-4">What-If分析</h1>

        {/* ポジション入力 */}
        <section className="mb-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
              ポジション設定
            </h2>
            <div className="space-y-3">
              {positionInputs.map((pos) => (
                <div key={pos.id} className="flex flex-wrap gap-2 items-end bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-3">
                  <div className="flex-1 min-w-[80px]">
                    <label className="text-[10px] text-[#888] block mb-1">権利行使価格</label>
                    <input
                      type="number"
                      value={pos.strike}
                      onChange={(e) => updatePosition(pos.id, 'strike', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white tabular-nums"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-[#888] block mb-1">種類</label>
                    <select
                      value={pos.optionType}
                      onChange={(e) => updatePosition(pos.id, 'optionType', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white"
                    >
                      <option value="call">CALL</option>
                      <option value="put">PUT</option>
                    </select>
                  </div>
                  <div className="w-16">
                    <label className="text-[10px] text-[#888] block mb-1">数量</label>
                    <input
                      type="number"
                      value={pos.quantity}
                      onChange={(e) => updatePosition(pos.id, 'quantity', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white tabular-nums"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-[#888] block mb-1">参入価格</label>
                    <input
                      type="number"
                      value={pos.entryPrice}
                      onChange={(e) => updatePosition(pos.id, 'entryPrice', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-[#888]">
                      <input
                        type="checkbox"
                        checked={pos.isMini}
                        onChange={(e) => updatePosition(pos.id, 'isMini', e.target.checked)}
                        className="rounded border-[#333]"
                      />
                      ミニ
                    </label>
                    {positionInputs.length > 1 && (
                      <button
                        onClick={() => removePosition(pos.id)}
                        className="text-[#ff6b6b] text-xs hover:opacity-80"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addPosition}
              className="mt-3 text-sm text-[#00d4aa] hover:opacity-80 transition-opacity"
            >
              + ポジションを追加
            </button>
          </div>
        </section>

        {/* スライダーコントロール */}
        <section className="mb-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
              シミュレーション条件
            </h2>

            {/* 原資産価格 */}
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1">
                <label className="text-xs text-[#888]">原資産価格</label>
                <span className="text-sm font-bold text-white tabular-nums">
                  {spot.toLocaleString()}円
                </span>
              </div>
              <input
                type="range"
                min={Math.round(DEFAULT_SPOT * 0.8)}
                max={Math.round(DEFAULT_SPOT * 1.2)}
                step={100}
                value={spot}
                onChange={(e) => setSpot(Number(e.target.value))}
                className="w-full accent-[#00d4aa]"
              />
              <div className="flex justify-between text-[10px] text-[#666]">
                <span>{Math.round(DEFAULT_SPOT * 0.8).toLocaleString()}</span>
                <span>{DEFAULT_SPOT.toLocaleString()}</span>
                <span>{Math.round(DEFAULT_SPOT * 1.2).toLocaleString()}</span>
              </div>
            </div>

            {/* IV変動 */}
            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-1">
                <label className="text-xs text-[#888]">IV変動</label>
                <span className="text-sm font-bold text-white tabular-nums">
                  {ivChange >= 0 ? '+' : ''}{(ivChange * 100).toFixed(1)}%pt
                  <span className="text-xs font-normal text-[#666] ml-1">
                    (IV: {((DEFAULT_IV + ivChange) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={ivChange * 100}
                onChange={(e) => setIvChange(Number(e.target.value) / 100)}
                className="w-full accent-[#00d4aa]"
              />
              <div className="flex justify-between text-[10px] text-[#666]">
                <span>-20%pt</span>
                <span>0</span>
                <span>+20%pt</span>
              </div>
            </div>

            {/* 残存日数 */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="text-xs text-[#888]">残存日数</label>
                <span className="text-sm font-bold text-white tabular-nums">
                  {daysToExpiry}日
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={daysToExpiry}
                onChange={(e) => setDaysToExpiry(Number(e.target.value))}
                className="w-full accent-[#00d4aa]"
              />
              <div className="flex justify-between text-[10px] text-[#666]">
                <span>0日</span>
                <span>45日</span>
                <span>90日</span>
              </div>
            </div>
          </div>
        </section>

        {/* シミュレーション結果 */}
        {result && (
          <section className="mb-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
                シミュレーション結果
              </h2>

              {/* 損益 */}
              <div className="mb-4">
                <p className="text-[10px] text-[#888] mb-0.5">損益</p>
                <p className={`text-2xl font-bold tabular-nums ${
                  result.totalPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
                }`}>
                  {result.totalPnl >= 0 ? '+' : ''}{result.totalPnl.toLocaleString()}
                  <span className="text-sm font-normal text-[#666] ml-1">円</span>
                </p>
              </div>

              {/* Greeks */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-[#888] mb-0.5">Delta</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {result.totalGreeks.delta.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888] mb-0.5">Gamma</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {result.totalGreeks.gamma.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888] mb-0.5">Theta</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {result.totalGreeks.theta.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888] mb-0.5">Vega</p>
                  <p className="text-sm font-bold text-white tabular-nums">
                    {result.totalGreeks.vega.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* 個別ポジション結果 */}
              {result.positions.length > 1 && (
                <div className="mt-4 pt-4 border-t border-[#1e1e1e]">
                  <p className="text-[10px] text-[#888] mb-2">個別ポジション</p>
                  <div className="space-y-2">
                    {result.positions.map((pos, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[#888]">
                          {positions[i].optionType.toUpperCase()} {positions[i].strike.toLocaleString()}
                          {' '}x{positions[i].quantity}
                        </span>
                        <div className="flex gap-4">
                          <span className="text-white tabular-nums">
                            理論: {pos.theoreticalPrice.toFixed(2)}
                          </span>
                          <span className={`tabular-nums ${pos.pnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'}`}>
                            {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toLocaleString()}円
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ペイオフダイアグラム */}
        {payoffData.length > 0 && (
          <section className="mb-4">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <h2 className="text-xs font-medium text-[#00d4aa] mb-3 tracking-wider">
                ペイオフダイアグラム
              </h2>
              <div className="h-48 relative">
                <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* ゼロライン */}
                  {payoffBounds.max > 0 && payoffBounds.min < 0 && (
                    <line
                      x1="0"
                      y1={200 * payoffBounds.max / (payoffBounds.max - payoffBounds.min)}
                      x2="400"
                      y2={200 * payoffBounds.max / (payoffBounds.max - payoffBounds.min)}
                      stroke="#333"
                      strokeDasharray="4,4"
                    />
                  )}
                  {/* ペイオフ曲線 */}
                  <polyline
                    fill="none"
                    stroke="#00d4aa"
                    strokeWidth="2"
                    points={payoffData.map((p, i) => {
                      const x = (i / (payoffData.length - 1)) * 400
                      const range = payoffBounds.max - payoffBounds.min || 1
                      const y = 200 - ((p.pnl - payoffBounds.min) / range) * 200
                      return `${x},${y}`
                    }).join(' ')}
                  />
                  {/* 現在の原資産価格マーカー */}
                  {(() => {
                    const spotIdx = payoffData.findIndex((p) => p.spot >= spot)
                    if (spotIdx < 0) return null
                    const x = (spotIdx / (payoffData.length - 1)) * 400
                    return (
                      <line x1={x} y1="0" x2={x} y2="200" stroke="#666" strokeDasharray="2,2" />
                    )
                  })()}
                </svg>
                {/* 軸ラベル */}
                <div className="flex justify-between text-[10px] text-[#666] mt-1">
                  <span>{payoffData[0]?.spot.toLocaleString()}</span>
                  <span>{spot.toLocaleString()} (現在)</span>
                  <span>{payoffData[payoffData.length - 1]?.spot.toLocaleString()}</span>
                </div>
                <div className="absolute right-0 top-0 text-[10px] text-[#666] flex flex-col justify-between h-48">
                  <span>{payoffBounds.max.toLocaleString()}</span>
                  <span>{payoffBounds.min.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* シナリオ比較 */}
        <section className="mb-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-medium text-[#00d4aa] tracking-wider">
                シナリオ比較
              </h2>
              <button
                onClick={() => setShowScenarios(!showScenarios)}
                className="text-xs text-[#00d4aa] hover:opacity-80"
              >
                {showScenarios ? '非表示' : '表示'}
              </button>
            </div>
            {showScenarios && scenarioResults && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#888] border-b border-[#1e1e1e]">
                      <th className="text-left py-2 pr-3">シナリオ</th>
                      <th className="text-right py-2 px-2">損益</th>
                      <th className="text-right py-2 px-2">Delta</th>
                      <th className="text-right py-2 px-2">Gamma</th>
                      <th className="text-right py-2 px-2">Theta</th>
                      <th className="text-right py-2 pl-2">Vega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioResults.map((s, i) => (
                      <tr key={i} className={`border-b border-[#1e1e1e] ${i === 0 ? 'bg-[#0a0a0a]' : ''}`}>
                        <td className="py-2 pr-3 text-white font-medium">{s.scenario.name}</td>
                        <td className={`py-2 px-2 text-right tabular-nums ${
                          s.result.totalPnl >= 0 ? 'text-[#00d4aa]' : 'text-[#ff6b6b]'
                        }`}>
                          {s.result.totalPnl >= 0 ? '+' : ''}{s.result.totalPnl.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right text-white tabular-nums">
                          {s.result.totalGreeks.delta.toFixed(4)}
                        </td>
                        <td className="py-2 px-2 text-right text-white tabular-nums">
                          {s.result.totalGreeks.gamma.toFixed(6)}
                        </td>
                        <td className="py-2 px-2 text-right text-white tabular-nums">
                          {s.result.totalGreeks.theta.toFixed(2)}
                        </td>
                        <td className="py-2 pl-2 text-right text-white tabular-nums">
                          {s.result.totalGreeks.vega.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showScenarios && !scenarioResults && (
              <p className="text-sm text-[#666]">ポジションを設定してください</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
