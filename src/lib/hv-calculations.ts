/**
 * ヒストリカルボラティリティ（HV）計算ユーティリティ
 *
 * 計算式:
 * - 対数リターン: ln(P[i] / P[i-1])
 * - HV = 対数リターンの標準偏差 × √252（年率化）
 * - IV/HV比 = 現在IV ÷ HV20
 */

/**
 * ヒストリカルボラティリティを計算する
 * @param prices 価格配列（時系列順、最新が末尾）
 * @param period 期間（20 or 60）
 * @returns HV（パーセンテージ）。計算不能の場合は null
 */
export function calculateHistoricalVolatility(
  prices: number[],
  period: number
): number | null {
  // 価格データが不足している場合
  if (prices.length < 2 || period < 1) {
    return null
  }

  // period+1 個の価格が必要（period個のリターンを計算するため）
  if (prices.length < period + 1) {
    return null
  }

  // 直近 period+1 個の価格を使用
  const recentPrices = prices.slice(-(period + 1))

  // 1. 対数リターン計算: ln(P[i] / P[i-1])
  const logReturns: number[] = []
  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i - 1] <= 0) {
      return null // ゼロ以下の価格は不正
    }
    logReturns.push(Math.log(recentPrices[i] / recentPrices[i - 1]))
  }

  // 2. 標準偏差計算
  const mean = logReturns.reduce((sum, r) => sum + r, 0) / logReturns.length
  const variance =
    logReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
    (logReturns.length - 1) // 不偏分散
  const stdDev = Math.sqrt(variance)

  // 3. 年率化: × √252
  const annualized = stdDev * Math.sqrt(252)

  // 4. パーセンテージ化: × 100
  return annualized * 100
}

/**
 * IV/HV比を計算する
 * @param currentIv 現在のインプライドボラティリティ（パーセンテージ）
 * @param hv20 20日ヒストリカルボラティリティ（パーセンテージ）
 * @returns IV/HV比。計算不能の場合は null
 */
export function calculateIvHvRatio(
  currentIv: number,
  hv20: number
): number | null {
  // ゼロ除算防止
  if (hv20 === 0) {
    return null
  }
  return currentIv / hv20
}

/**
 * IV/HV比のシグナルラベルを返す
 * @param ratio IV/HV比
 * @returns シグナルラベル
 */
export function getIvHvSignal(
  ratio: number
): '買い好機' | '中立' | '割高注意' {
  if (ratio < 1.0) {
    return '買い好機'
  }
  if (ratio > 1.5) {
    return '割高注意'
  }
  return '中立'
}

/**
 * PCR（プット・コール・レシオ）のシグナルラベルを返す
 * @param pcr プット出来高 ÷ コール出来高
 * @returns シグナルラベル
 */
export function getPcrSignal(
  pcr: number
): '逆張り買いシグナル補強' | '中立' {
  if (pcr > 1.2) {
    return '逆張り買いシグナル補強'
  }
  return '中立'
}
