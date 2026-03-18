/**
 * POP（Probability of Profit）計算
 *
 * Black-Scholes Mertonモデルのd2パラメータを利用して
 * オプションが利益となる確率を推定する
 */

import { normalCDF, calculateD1D2, type BSInputs } from './black-scholes'

export interface POPInput {
  spot: number          // 原資産価格
  strike: number        // 権利行使価格
  entryPrice: number    // エントリー時のプレミアム
  timeToExpiry: number  // 満期までの年数
  volatility: number    // IV（小数）
  riskFreeRate: number  // 無リスク金利
  dividendYield: number // 配当利回り
  optionType: 'call' | 'put'
  side: 'buy' | 'sell'
}

/**
 * 単一ポジションのPOP（利益確率）を計算する
 *
 * ロングコール: 原資産が strike + premium を超える確率
 * ロングプット: 原資産が strike - premium を下回る確率
 * ショートポジション: 100 - ロングPOP
 *
 * @returns POP (0-100の数値、小数第1位まで)
 */
export function calculatePOP(input: POPInput): number {
  const {
    spot, strike, entryPrice, timeToExpiry,
    volatility, riskFreeRate, dividendYield,
    optionType, side,
  } = input

  // 満期時: イントリンシックバリューで判定
  if (timeToExpiry <= 0) {
    let isProfit: boolean
    if (optionType === 'call') {
      isProfit = side === 'buy'
        ? spot > strike + entryPrice
        : spot <= strike + entryPrice
    } else {
      isProfit = side === 'buy'
        ? spot < strike - entryPrice
        : spot >= strike - entryPrice
    }
    return isProfit ? 100 : 0
  }

  // ブレークイーブン価格を計算
  const breakeven = optionType === 'call'
    ? strike + entryPrice
    : strike - entryPrice

  // BS d2パラメータをブレークイーブン価格で計算
  const bsInputs: BSInputs = {
    spot,
    strike: breakeven,
    timeToExpiry,
    volatility,
    riskFreeRate,
    dividendYield,
    optionType,
  }

  const { d2 } = calculateD1D2(bsInputs)

  // ロングポジションのPOP
  let longPOP: number
  if (optionType === 'call') {
    // P(S_T > breakeven) = N(d2)
    longPOP = normalCDF(d2) * 100
  } else {
    // P(S_T < breakeven) = N(-d2)
    longPOP = normalCDF(-d2) * 100
  }

  const pop = side === 'buy' ? longPOP : 100 - longPOP

  // 0-100にクランプし、小数第1位に丸める
  return Math.round(Math.max(0, Math.min(100, pop)) * 10) / 10
}

/**
 * スプレッドのレッグ情報
 */
export interface SpreadLeg {
  strike: number
  optionType: 'call' | 'put'
  side: 'buy' | 'sell'
  premium: number
}

export interface SpreadPOPInput {
  spot: number
  timeToExpiry: number
  volatility: number
  riskFreeRate: number
  dividendYield: number
  legs: SpreadLeg[]
}

/**
 * 複合ポジション（スプレッド等）のPOPを計算する
 *
 * モンテカルロ的にブレークイーブンポイントを見つけ、
 * 利益となる原資産価格帯の確率を合算する
 *
 * 簡易版: 満期時ペイオフ関数からブレークイーブンを求め、
 * 正規分布で利益確率を計算
 *
 * @returns POP (0-100の数値、小数第1位まで)
 */
export function calculateSpreadPOP(input: SpreadPOPInput): number {
  const { spot, timeToExpiry, volatility, riskFreeRate, dividendYield, legs } = input

  if (legs.length === 0) return 0

  // 単一レッグの場合は calculatePOP に委譲
  if (legs.length === 1) {
    const leg = legs[0]
    return calculatePOP({
      spot,
      strike: leg.strike,
      entryPrice: leg.premium,
      timeToExpiry,
      volatility,
      riskFreeRate,
      dividendYield,
      optionType: leg.optionType,
      side: leg.side,
    })
  }

  // 複数レッグ: 満期時ペイオフをサンプリングして利益確率を計算
  // ログ正規分布の前方価格のサンプリングポイントで評価

  // ネットプレミアム（受取が正、支払が負）
  const netPremium = legs.reduce((sum, leg) => {
    return sum + (leg.side === 'sell' ? leg.premium : -leg.premium)
  }, 0)

  // 満期時の原資産価格レンジをサンプリング
  const sqrtT = Math.sqrt(Math.max(timeToExpiry, 1 / 365))
  const logMean = Math.log(spot) + (riskFreeRate - dividendYield - 0.5 * volatility * volatility) * Math.max(timeToExpiry, 1 / 365)

  // -4σ から +4σ まで細かくサンプリング
  const numSamples = 2000
  let profitProb = 0

  for (let i = 0; i < numSamples; i++) {
    const z = -4 + (8 * (i + 0.5)) / numSamples
    const futurePrice = Math.exp(logMean + volatility * sqrtT * z)

    // 満期時ペイオフを計算
    let payoff = netPremium
    for (const leg of legs) {
      let legPayoff: number
      if (leg.optionType === 'call') {
        legPayoff = Math.max(futurePrice - leg.strike, 0)
      } else {
        legPayoff = Math.max(leg.strike - futurePrice, 0)
      }
      payoff += leg.side === 'buy' ? legPayoff : -legPayoff
    }

    // 正規分布の確率密度で加重
    const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
    if (payoff > 0) {
      profitProb += phi * (8 / numSamples)
    }
  }

  const pop = Math.max(0, Math.min(100, profitProb * 100))
  return Math.round(pop * 10) / 10
}
