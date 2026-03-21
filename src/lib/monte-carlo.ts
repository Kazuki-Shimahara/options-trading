/**
 * モンテカルロシミュレーション（VaR/CVaR）
 *
 * 過去の損益データからリターン分布を推定し、
 * モンテカルロ法でVaR・CVaRを算出する。
 * 計算ロジックは純粋関数として実装（Web Worker対応はUIレイヤーで行う）。
 */

export interface MonteCarloInput {
  pnlHistory: number[]
  numSimulations: number
  numDays: number
  confidenceLevels?: number[] // e.g., [0.95, 0.99]
}

export interface HistogramBin {
  binStart: number
  binEnd: number
  count: number
  frequency: number // count / total
}

export interface DistributionStats {
  mean: number
  stdDev: number
  min: number
  max: number
  median: number
}

export interface MonteCarloResult {
  simulatedReturns: number[]
  var95: number
  var99: number
  cvar95: number
  cvar99: number
  stats: DistributionStats
  histogram: HistogramBin[]
}

/**
 * VaR（Value at Risk）を計算する
 * sortedDataは昇順ソート済みの配列
 * confidenceLevel: 0.95 → 下位5%点を返す
 */
export function calculateVaR(sortedData: number[], confidenceLevel: number): number {
  const index = Math.floor(sortedData.length * (1 - confidenceLevel))
  return sortedData[Math.max(0, index)]
}

/**
 * CVaR（Conditional VaR / Expected Shortfall）を計算する
 * VaR以下の値の平均
 */
export function calculateCVaR(sortedData: number[], confidenceLevel: number): number {
  const varIndex = Math.floor(sortedData.length * (1 - confidenceLevel))
  const cutoff = Math.max(1, varIndex + 1)
  let sum = 0
  for (let i = 0; i < cutoff; i++) {
    sum += sortedData[i]
  }
  return sum / cutoff
}

/**
 * 分布の統計量を計算する
 */
export function computeDistributionStats(data: number[]): DistributionStats {
  const n = data.length
  const mean = data.reduce((sum, v) => sum + v, 0) / n

  const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  const sorted = [...data].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[n - 1]

  let median: number
  if (n % 2 === 0) {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  } else {
    median = sorted[Math.floor(n / 2)]
  }

  return { mean, stdDev, min, max, median }
}

/**
 * ヒストグラムのビンを生成する
 */
function buildHistogram(data: number[], numBins: number = 50): HistogramBin[] {
  const min = Math.min(...data)
  const max = Math.max(...data)

  if (min === max) {
    return [{ binStart: min, binEnd: max, count: data.length, frequency: 1 }]
  }

  const binWidth = (max - min) / numBins
  const bins: HistogramBin[] = []

  for (let i = 0; i < numBins; i++) {
    bins.push({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: 0,
      frequency: 0,
    })
  }

  for (const value of data) {
    let binIndex = Math.floor((value - min) / binWidth)
    if (binIndex >= numBins) binIndex = numBins - 1
    bins[binIndex].count++
  }

  for (const bin of bins) {
    bin.frequency = bin.count / data.length
  }

  return bins
}

/**
 * 簡易な擬似乱数生成（Box-Muller変換で正規分布）
 * seedベースでないMath.randomを使用
 */
function normalRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * モンテカルロシミュレーションを実行する
 *
 * 1. 過去のPnLデータから日次リターンの平均・標準偏差を推定
 * 2. 正規分布を仮定して numDays 日分のリターンをシミュレーション
 * 3. VaR/CVaR と分布統計量を算出
 */
export function runMonteCarloSimulation(input: MonteCarloInput): MonteCarloResult {
  const { pnlHistory, numSimulations, numDays } = input

  if (pnlHistory.length < 2) {
    throw new Error('PnL履歴が不足しています（最低2件必要）')
  }

  // 日次PnLの平均・標準偏差を推定
  const n = pnlHistory.length
  const dailyMean = pnlHistory.reduce((sum, v) => sum + v, 0) / n
  const dailyVariance = pnlHistory.reduce((sum, v) => sum + (v - dailyMean) ** 2, 0) / n
  const dailyStdDev = Math.sqrt(dailyVariance)

  // モンテカルロシミュレーション
  const simulatedReturns: number[] = []

  for (let sim = 0; sim < numSimulations; sim++) {
    let cumulativePnl = 0
    for (let day = 0; day < numDays; day++) {
      cumulativePnl += dailyMean + dailyStdDev * normalRandom()
    }
    simulatedReturns.push(Math.round(cumulativePnl))
  }

  // ソートしてVaR/CVaR計算
  const sorted = [...simulatedReturns].sort((a, b) => a - b)

  const var95 = calculateVaR(sorted, 0.95)
  const var99 = calculateVaR(sorted, 0.99)
  const cvar95 = calculateCVaR(sorted, 0.95)
  const cvar99 = calculateCVaR(sorted, 0.99)

  const stats = computeDistributionStats(simulatedReturns)
  const histogram = buildHistogram(simulatedReturns)

  return {
    simulatedReturns,
    var95,
    var99,
    cvar95,
    cvar99,
    stats,
    histogram,
  }
}
