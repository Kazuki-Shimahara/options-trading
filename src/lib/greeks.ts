/**
 * Greeks計算（Black-Scholes Merton 配当調整版）
 */

import { normalCDF, normalPDF, calculateD1D2, calculateBSPrice, type BSInputs } from './black-scholes'

export interface Greeks {
  delta: number  // Δ
  gamma: number  // Γ
  theta: number  // Θ（1日あたり）
  vega: number   // ν（1%変化あたり）
}

/**
 * Merton配当調整版 Greeks計算
 *
 * Delta: Call = e^(-qT) * N(d1), Put = e^(-qT) * (N(d1) - 1)
 * Gamma: e^(-qT) * φ(d1) / (S * σ * √T)
 * Theta: 数値微分（1日分の時間変化）
 * Vega:  S * e^(-qT) * φ(d1) * √T / 100
 */
export function calculateGreeks(inputs: BSInputs): Greeks {
  const { spot, strike, timeToExpiry, volatility, riskFreeRate, dividendYield, optionType } = inputs

  // 満期が極端に近い場合はゼロを返す
  if (timeToExpiry <= 0 || volatility <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0 }
  }

  const { d1 } = calculateD1D2(inputs)
  const sqrtT = Math.sqrt(timeToExpiry)
  const discountDividend = Math.exp(-dividendYield * timeToExpiry)

  // Delta
  let delta: number
  if (optionType === 'call') {
    delta = discountDividend * normalCDF(d1)
  } else {
    delta = discountDividend * (normalCDF(d1) - 1)
  }

  // Gamma（call/put共通）
  const gamma = (discountDividend * normalPDF(d1)) / (spot * volatility * sqrtT)

  // Theta（数値微分: 1日 = 1/365年）
  const dt = 1 / 365
  const priceNow = calculateBSPrice(inputs)

  let thetaPerDay: number
  if (timeToExpiry > dt) {
    const priceTomorrow = calculateBSPrice({
      ...inputs,
      timeToExpiry: timeToExpiry - dt,
    })
    thetaPerDay = priceTomorrow - priceNow
  } else {
    // 残り1日未満の場合、イントリンシックバリューとの差
    const intrinsic = optionType === 'call'
      ? Math.max(spot - strike, 0)
      : Math.max(strike - spot, 0)
    thetaPerDay = intrinsic - priceNow
  }

  // Vega（IVが1%変化した場合の価格変化）
  const vega = (spot * discountDividend * normalPDF(d1) * sqrtT) / 100

  return {
    delta: roundTo(delta, 4),
    gamma: roundTo(gamma, 6),
    theta: roundTo(thetaPerDay, 2),
    vega: roundTo(vega, 2),
  }
}

/**
 * calculateAllGreeks のエイリアス（互換性のため）
 */
export function calculateAllGreeks(inputs: BSInputs): Greeks {
  return calculateGreeks(inputs)
}

/**
 * 個別ポジションのGreeks（数量付き）
 */
export interface PositionGreeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  quantity: number
}

/**
 * ポートフォリオ全体のGreeks合算
 * 各ポジションのGreeksを数量で加重して合算する
 */
export function aggregatePortfolioGreeks(positions: PositionGreeks[]): Greeks {
  if (positions.length === 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0 }
  }

  const totals = positions.reduce(
    (acc, pos) => ({
      delta: acc.delta + pos.delta * pos.quantity,
      gamma: acc.gamma + pos.gamma * pos.quantity,
      theta: acc.theta + pos.theta * pos.quantity,
      vega: acc.vega + pos.vega * pos.quantity,
    }),
    { delta: 0, gamma: 0, theta: 0, vega: 0 }
  )

  return {
    delta: roundTo(totals.delta, 4),
    gamma: roundTo(totals.gamma, 6),
    theta: roundTo(totals.theta, 2),
    vega: roundTo(totals.vega, 2),
  }
}

/**
 * デルタ中立乖離度の計算結果
 */
export interface DeltaNeutralResult {
  deviation: number   // 乖離度（デルタ絶対値）
  isWarning: boolean  // 閾値超え警告
}

/**
 * デルタ中立乖離度を計算する
 * @param portfolioDelta ポートフォリオの合算デルタ
 * @param threshold 警告閾値（デフォルト0.5）
 */
export function calculateDeltaNeutralDeviation(
  portfolioDelta: number,
  threshold: number = 0.5
): DeltaNeutralResult {
  const deviation = roundTo(Math.abs(portfolioDelta), 4)
  return {
    deviation,
    isWarning: deviation > threshold,
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
