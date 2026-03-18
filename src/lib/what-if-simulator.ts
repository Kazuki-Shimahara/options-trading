/**
 * What-If分析（リアルタイムシミュレーション）
 *
 * IV・原資産価格・残存日数のスライダー操作で
 * Greeks・理論価格・損益をリアルタイムに再計算する
 */

import { calculateBSPrice, type BSInputs } from './black-scholes'
import { calculateGreeks, type Greeks } from './greeks'

/**
 * シミュレーション対象のポジション
 */
export interface SimulationPosition {
  strike: number
  optionType: 'call' | 'put'
  quantity: number // 正=買い、負=売り
  entryPrice: number // エントリー時のプレミアム
  isMini?: boolean
}

/**
 * シミュレーションパラメータ（スライダー値）
 */
export interface SimulationParams {
  spot: number // 原資産価格
  ivChange: number // IV変動（例: +0.05 = +5%pt）
  daysToExpiry: number // 残存日数
  baseIv: number // ベースIV（小数）
  riskFreeRate?: number // 無リスク金利（デフォルト0.001）
  dividendYield?: number // 配当利回り（デフォルト0.02）
}

/**
 * 単一ポジションのシミュレーション結果
 */
export interface PositionSimResult {
  theoreticalPrice: number
  greeks: Greeks
  pnl: number // 損益 = (理論価格 - エントリー価格) * quantity * multiplier
  multiplier: number
}

/**
 * ポートフォリオ全体のシミュレーション結果
 */
export interface PortfolioSimResult {
  positions: PositionSimResult[]
  totalPnl: number
  totalGreeks: Greeks
}

/**
 * シナリオ定義
 */
export interface Scenario {
  name: string
  params: SimulationParams
}

/**
 * シナリオ比較結果
 */
export interface ScenarioComparison {
  scenario: Scenario
  result: PortfolioSimResult
}

const MULTIPLIER_STANDARD = 1000
const MULTIPLIER_MINI = 100

/**
 * 単一ポジションのWhat-Ifシミュレーション
 */
export function simulatePosition(
  position: SimulationPosition,
  params: SimulationParams
): PositionSimResult {
  const multiplier = position.isMini ? MULTIPLIER_MINI : MULTIPLIER_STANDARD
  const iv = params.baseIv + params.ivChange
  const timeToExpiry = params.daysToExpiry / 365

  const bsInputs: BSInputs = {
    spot: params.spot,
    strike: position.strike,
    timeToExpiry,
    volatility: Math.max(iv, 0.001), // IVは正値のみ
    riskFreeRate: params.riskFreeRate ?? 0.001,
    dividendYield: params.dividendYield ?? 0.02,
    optionType: position.optionType,
  }

  const theoreticalPrice = calculateBSPrice(bsInputs)
  const greeks = calculateGreeks(bsInputs)
  const pnl = (theoreticalPrice - position.entryPrice) * position.quantity * multiplier

  return {
    theoreticalPrice: Math.round(theoreticalPrice * 100) / 100,
    greeks,
    pnl: Math.round(pnl),
    multiplier,
  }
}

/**
 * ポートフォリオ全体のWhat-Ifシミュレーション
 */
export function simulatePortfolio(
  positions: SimulationPosition[],
  params: SimulationParams
): PortfolioSimResult {
  const results = positions.map((pos) => simulatePosition(pos, params))

  const totalPnl = results.reduce((sum, r) => sum + r.pnl, 0)

  const totalGreeks: Greeks = {
    delta: results.reduce((sum, r, i) => sum + r.greeks.delta * positions[i].quantity, 0),
    gamma: results.reduce((sum, r, i) => sum + r.greeks.gamma * positions[i].quantity, 0),
    theta: results.reduce((sum, r, i) => sum + r.greeks.theta * positions[i].quantity, 0),
    vega: results.reduce((sum, r, i) => sum + r.greeks.vega * positions[i].quantity, 0),
  }

  // 丸め
  totalGreeks.delta = Math.round(totalGreeks.delta * 10000) / 10000
  totalGreeks.gamma = Math.round(totalGreeks.gamma * 1000000) / 1000000
  totalGreeks.theta = Math.round(totalGreeks.theta * 100) / 100
  totalGreeks.vega = Math.round(totalGreeks.vega * 100) / 100

  return {
    positions: results,
    totalPnl,
    totalGreeks,
  }
}

/**
 * 複数シナリオの比較
 */
export function compareScenarios(
  positions: SimulationPosition[],
  scenarios: Scenario[]
): ScenarioComparison[] {
  return scenarios.map((scenario) => ({
    scenario,
    result: simulatePortfolio(positions, scenario.params),
  }))
}

/**
 * ペイオフダイアグラム用データ生成
 * 指定した原資産価格レンジで損益を計算
 */
export interface PayoffPoint {
  spot: number
  pnl: number
}

export function generatePayoffData(
  positions: SimulationPosition[],
  params: Omit<SimulationParams, 'spot'>,
  spotRange: { min: number; max: number; step: number }
): PayoffPoint[] {
  const points: PayoffPoint[] = []
  for (let spot = spotRange.min; spot <= spotRange.max; spot += spotRange.step) {
    const result = simulatePortfolio(positions, { ...params, spot })
    points.push({ spot, pnl: result.totalPnl })
  }
  return points
}
