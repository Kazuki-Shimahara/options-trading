/**
 * Black-Scholes Merton (配当調整版) オプション価格計算
 */

/**
 * 正規分布CDF（Abramowitz and Stegun 近似）
 * 精度: 最大誤差 ~1.5e-7
 */
export function normalCDF(x: number): number {
  if (x < -8) return 0
  if (x > 8) return 1

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x)
  const t = 1.0 / (1.0 + p * absX)
  const t2 = t * t
  const t3 = t2 * t
  const t4 = t3 * t
  const t5 = t4 * t

  const y = 1.0 - (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp(-absX * absX / 2)

  return 0.5 * (1.0 + sign * y)
}

/**
 * 正規分布PDF
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export interface BSInputs {
  spot: number          // 先物価格（原資産）
  strike: number        // 権利行使価格
  timeToExpiry: number  // 満期までの年数
  volatility: number    // IV（小数、例: 0.20 = 20%）
  riskFreeRate: number  // 無リスク金利（デフォルト0.001）
  dividendYield: number // 配当利回り（デフォルト0.02）
  optionType: 'call' | 'put'
}

/**
 * d1, d2 パラメータ計算
 */
export function calculateD1D2(inputs: BSInputs): { d1: number; d2: number } {
  const { spot, strike, timeToExpiry, volatility, riskFreeRate, dividendYield } = inputs
  const sqrtT = Math.sqrt(timeToExpiry)

  const d1 =
    (Math.log(spot / strike) + (riskFreeRate - dividendYield + 0.5 * volatility * volatility) * timeToExpiry) /
    (volatility * sqrtT)

  const d2 = d1 - volatility * sqrtT

  return { d1, d2 }
}

/**
 * BS Merton版 オプション価格計算
 */
export function calculateBSPrice(inputs: BSInputs): number {
  const { spot, strike, timeToExpiry, riskFreeRate, dividendYield, optionType } = inputs

  if (timeToExpiry <= 0) {
    // 満期時はイントリンシックバリュー
    if (optionType === 'call') {
      return Math.max(spot - strike, 0)
    } else {
      return Math.max(strike - spot, 0)
    }
  }

  const { d1, d2 } = calculateD1D2(inputs)

  const discountDividend = Math.exp(-dividendYield * timeToExpiry)
  const discountRate = Math.exp(-riskFreeRate * timeToExpiry)

  if (optionType === 'call') {
    return spot * discountDividend * normalCDF(d1) - strike * discountRate * normalCDF(d2)
  } else {
    return strike * discountRate * normalCDF(-d2) - spot * discountDividend * normalCDF(-d1)
  }
}

/**
 * IV逆算（Newton-Raphson法）
 * @param marketPrice 市場価格
 * @param inputs volatilityを除いたBS入力パラメータ
 * @returns 推定IV（小数）。収束しない場合は null
 */
export function calculateImpliedVolatility(
  marketPrice: number,
  inputs: Omit<BSInputs, 'volatility'>
): number | null {
  const MAX_ITERATIONS = 100
  const PRECISION = 1e-8

  let sigma = 0.20 // 初期値20%

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const fullInputs: BSInputs = { ...inputs, volatility: sigma }
    const price = calculateBSPrice(fullInputs)
    const diff = price - marketPrice

    if (Math.abs(diff) < PRECISION) {
      return sigma
    }

    // Vega（σ微分）を計算
    const { d1 } = calculateD1D2(fullInputs)
    const sqrtT = Math.sqrt(inputs.timeToExpiry)
    const discountDividend = Math.exp(-inputs.dividendYield * inputs.timeToExpiry)
    const vega = inputs.spot * discountDividend * normalPDF(d1) * sqrtT

    if (vega < 1e-12) {
      // Vegaが小さすぎる場合は収束不可
      return null
    }

    sigma = sigma - diff / vega

    if (sigma <= 0) {
      sigma = 0.001
    }
    if (sigma > 5) {
      return null // 非現実的なIV
    }
  }

  return null // 収束しなかった
}
