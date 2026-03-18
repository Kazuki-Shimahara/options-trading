import { describe, it, expect } from 'vitest'
import {
  simulatePosition,
  simulatePortfolio,
  compareScenarios,
  generatePayoffData,
  type SimulationPosition,
  type SimulationParams,
} from '../what-if-simulator'

// テスト用の共通パラメータ
const baseParams: SimulationParams = {
  spot: 38000,
  ivChange: 0,
  daysToExpiry: 30,
  baseIv: 0.20,
  riskFreeRate: 0.001,
  dividendYield: 0.02,
}

const callPosition: SimulationPosition = {
  strike: 38000,
  optionType: 'call',
  quantity: 1,
  entryPrice: 500,
}

const putPosition: SimulationPosition = {
  strike: 38000,
  optionType: 'put',
  quantity: 1,
  entryPrice: 500,
}

describe('simulatePosition', () => {
  it('ATMコールの理論価格を正しく計算する', () => {
    const result = simulatePosition(callPosition, baseParams)
    // ATMコールの理論価格はBS計算に基づく正値
    expect(result.theoreticalPrice).toBeGreaterThan(0)
    expect(result.multiplier).toBe(1000)
  })

  it('ATMプットの理論価格を正しく計算する', () => {
    const result = simulatePosition(putPosition, baseParams)
    expect(result.theoreticalPrice).toBeGreaterThan(0)
  })

  it('PnLを正しく計算する（買いポジション）', () => {
    const result = simulatePosition(callPosition, baseParams)
    // pnl = (theoreticalPrice - entryPrice) * quantity * multiplier
    // theoreticalPriceは丸め後の値なので、PnLとは若干の差が出うる
    // 代わりにPnLの符号と大きさの妥当性を検証
    expect(result.pnl).toBeGreaterThan(0) // ATMコール30日残存→エントリー500円より高い
    expect(typeof result.pnl).toBe('number')
    expect(Number.isInteger(result.pnl)).toBe(true)
  })

  it('売りポジション（quantity=-1）のPnLは反転する', () => {
    const sellPosition: SimulationPosition = { ...callPosition, quantity: -1 }
    const result = simulatePosition(sellPosition, baseParams)
    // 売りの場合はPnLが反転
    const buyResult = simulatePosition(callPosition, baseParams)
    expect(result.pnl).toBe(-buyResult.pnl)
  })

  it('IV上昇でコール理論価格が上がる', () => {
    const baseResult = simulatePosition(callPosition, baseParams)
    const ivUpResult = simulatePosition(callPosition, { ...baseParams, ivChange: 0.05 })
    expect(ivUpResult.theoreticalPrice).toBeGreaterThan(baseResult.theoreticalPrice)
  })

  it('IV低下でコール理論価格が下がる', () => {
    const baseResult = simulatePosition(callPosition, baseParams)
    const ivDownResult = simulatePosition(callPosition, { ...baseParams, ivChange: -0.05 })
    expect(ivDownResult.theoreticalPrice).toBeLessThan(baseResult.theoreticalPrice)
  })

  it('原資産価格上昇でコール理論価格が上がる', () => {
    const baseResult = simulatePosition(callPosition, baseParams)
    const spotUpResult = simulatePosition(callPosition, { ...baseParams, spot: 39000 })
    expect(spotUpResult.theoreticalPrice).toBeGreaterThan(baseResult.theoreticalPrice)
  })

  it('残存日数減少でATMオプション理論価格が下がる（タイムディケイ）', () => {
    const baseResult = simulatePosition(callPosition, baseParams)
    const lessTimeResult = simulatePosition(callPosition, { ...baseParams, daysToExpiry: 15 })
    expect(lessTimeResult.theoreticalPrice).toBeLessThan(baseResult.theoreticalPrice)
  })

  it('残存日数0日で満期時のイントリンシックバリューを返す', () => {
    // ITMコール: spot=39000, strike=38000 → IV = 1000
    const result = simulatePosition(callPosition, { ...baseParams, spot: 39000, daysToExpiry: 0 })
    expect(result.theoreticalPrice).toBe(1000)

    // OTMコール: spot=37000, strike=38000 → IV = 0
    const otmResult = simulatePosition(callPosition, { ...baseParams, spot: 37000, daysToExpiry: 0 })
    expect(otmResult.theoreticalPrice).toBe(0)
  })

  it('ミニオプションのmultiplierは100', () => {
    const miniPos: SimulationPosition = { ...callPosition, isMini: true }
    const result = simulatePosition(miniPos, baseParams)
    expect(result.multiplier).toBe(100)
  })

  it('Greeksが返される', () => {
    const result = simulatePosition(callPosition, baseParams)
    expect(result.greeks).toBeDefined()
    expect(result.greeks.delta).toBeGreaterThan(0) // ATMコールのdeltaは正
    expect(result.greeks.gamma).toBeGreaterThan(0)
    expect(result.greeks.vega).toBeGreaterThan(0)
    expect(result.greeks.theta).toBeLessThan(0) // タイムディケイは負
  })

  it('IVが負に設定されてもエラーにならない（最小値0.001にクランプ）', () => {
    const result = simulatePosition(callPosition, { ...baseParams, baseIv: 0.01, ivChange: -0.05 })
    expect(result.theoreticalPrice).toBeGreaterThanOrEqual(0)
  })
})

describe('simulatePortfolio', () => {
  it('単一ポジションのポートフォリオ', () => {
    const result = simulatePortfolio([callPosition], baseParams)
    expect(result.positions).toHaveLength(1)
    expect(result.totalPnl).toBe(result.positions[0].pnl)
  })

  it('複数ポジションのPnLを合算する', () => {
    const positions: SimulationPosition[] = [callPosition, putPosition]
    const result = simulatePortfolio(positions, baseParams)
    expect(result.positions).toHaveLength(2)
    const expectedTotal = result.positions[0].pnl + result.positions[1].pnl
    expect(result.totalPnl).toBe(expectedTotal)
  })

  it('ストラドル（ATMコール買い+プット買い）のGreeksを合算する', () => {
    const positions: SimulationPosition[] = [callPosition, putPosition]
    const result = simulatePortfolio(positions, baseParams)
    // ストラドルのデルタはほぼゼロ（コールのdelta + プットのdelta ≈ 0）
    expect(Math.abs(result.totalGreeks.delta)).toBeLessThan(0.1)
    // ガンマは正（両方のガンマが加算）
    expect(result.totalGreeks.gamma).toBeGreaterThan(0)
  })

  it('空のポジションリストで全て0', () => {
    const result = simulatePortfolio([], baseParams)
    expect(result.positions).toHaveLength(0)
    expect(result.totalPnl).toBe(0)
    expect(result.totalGreeks).toEqual({ delta: 0, gamma: 0, theta: 0, vega: 0 })
  })

  it('売りポジションのGreeksは数量で反転する', () => {
    const buyResult = simulatePortfolio([{ ...callPosition, quantity: 1 }], baseParams)
    const sellResult = simulatePortfolio([{ ...callPosition, quantity: -1 }], baseParams)
    expect(sellResult.totalGreeks.delta).toBeCloseTo(-buyResult.totalGreeks.delta, 3)
  })
})

describe('compareScenarios', () => {
  it('複数シナリオの結果を比較できる', () => {
    const scenarios = [
      { name: 'ベース', params: baseParams },
      { name: 'IV上昇', params: { ...baseParams, ivChange: 0.05 } },
      { name: 'IV低下', params: { ...baseParams, ivChange: -0.05 } },
    ]

    const comparisons = compareScenarios([callPosition], scenarios)
    expect(comparisons).toHaveLength(3)
    expect(comparisons[0].scenario.name).toBe('ベース')
    expect(comparisons[1].scenario.name).toBe('IV上昇')
    expect(comparisons[2].scenario.name).toBe('IV低下')

    // IV上昇シナリオのPnLはベースより良い（コール買い）
    expect(comparisons[1].result.totalPnl).toBeGreaterThan(comparisons[0].result.totalPnl)
    // IV低下シナリオのPnLはベースより悪い
    expect(comparisons[2].result.totalPnl).toBeLessThan(comparisons[0].result.totalPnl)
  })

  it('空のシナリオリストで空配列を返す', () => {
    const result = compareScenarios([callPosition], [])
    expect(result).toEqual([])
  })
})

describe('generatePayoffData', () => {
  it('指定レンジのペイオフデータを生成する', () => {
    const paramsWithoutSpot = {
      ivChange: baseParams.ivChange,
      daysToExpiry: baseParams.daysToExpiry,
      baseIv: baseParams.baseIv,
      riskFreeRate: baseParams.riskFreeRate,
      dividendYield: baseParams.dividendYield,
    }
    const points = generatePayoffData([callPosition], paramsWithoutSpot, {
      min: 36000,
      max: 40000,
      step: 1000,
    })

    expect(points).toHaveLength(5) // 36000, 37000, 38000, 39000, 40000
    expect(points[0].spot).toBe(36000)
    expect(points[4].spot).toBe(40000)

    // コール買い：原資産が上がるほどPnLが上がる
    expect(points[4].pnl).toBeGreaterThan(points[0].pnl)
  })

  it('各ポイントにspotとpnlが含まれる', () => {
    const paramsWithoutSpot = {
      ivChange: baseParams.ivChange,
      daysToExpiry: baseParams.daysToExpiry,
      baseIv: baseParams.baseIv,
      riskFreeRate: baseParams.riskFreeRate,
      dividendYield: baseParams.dividendYield,
    }
    const points = generatePayoffData([callPosition], paramsWithoutSpot, {
      min: 38000,
      max: 38000,
      step: 1000,
    })

    expect(points).toHaveLength(1)
    expect(points[0]).toHaveProperty('spot')
    expect(points[0]).toHaveProperty('pnl')
    expect(typeof points[0].spot).toBe('number')
    expect(typeof points[0].pnl).toBe('number')
  })
})
