/**
 * IVランク・IVパーセンタイル・ボラティリティスキューの計算ユーティリティ
 *
 * エントリー判断の定量的指標として使用する。
 * - IVランク: 過去1年の範囲における現在IVの位置
 * - IVパーセンタイル: 過去1年で現在IVより低かった日数の割合
 * - スキュー: OTMプットIVとATM IVの差（市場のリスク認識指標）
 */

import type { IvHistory } from '@/types/database'

export interface SkewDataPoint {
  date: string
  skew: number
  atmIv: number
  otmPutIv: number
}

/**
 * IVランクを計算する
 * IVランク = (現在IV - 1年最低) / (1年最高 - 1年最低) × 100
 *
 * @param currentIv 現在のIV
 * @param minIvYearly 過去1年の最低IV
 * @param maxIvYearly 過去1年の最高IV
 * @returns IVランク (0-100)
 */
export function calculateIvRank(
  currentIv: number,
  minIvYearly: number,
  maxIvYearly: number
): number {
  // ゼロ除算防止: 最高と最低が同じ場合は50を返す
  if (maxIvYearly === minIvYearly) {
    return 50
  }

  const rank = ((currentIv - minIvYearly) / (maxIvYearly - minIvYearly)) * 100

  // 結果を0-100にクランプ
  return Math.min(100, Math.max(0, rank))
}

/**
 * IVパーセンタイルを計算する
 * IVパーセンタイル = 過去1年で現在IVより低かった日数 / 252 × 100
 *
 * @param currentIv 現在のIV
 * @param historicalIvs 過去1年分のIV配列（252営業日分）
 * @returns IVパーセンタイル (0-100)
 */
export function calculateIvPercentile(
  currentIv: number,
  historicalIvs: number[]
): number {
  if (historicalIvs.length === 0) {
    return 50
  }

  const daysBelow = historicalIvs.filter((iv) => iv < currentIv).length
  const percentile = (daysBelow / historicalIvs.length) * 100

  // 結果を0-100にクランプ
  return Math.min(100, Math.max(0, percentile))
}

/**
 * IVランクに基づく色を返す
 * - 0-25: 緑（買い好機） - IVが低い = オプション買いに有利
 * - 25-75: 黄（中立）
 * - 75-100: 赤（売り好機） - IVが高い = オプション売りに有利
 *
 * @param ivRank IVランク (0-100)
 * @returns Tailwind CSSカラークラス名
 */
export function getIvRankColor(ivRank: number): string {
  if (ivRank <= 25) {
    return 'bg-emerald-500'
  }
  if (ivRank >= 75) {
    return 'bg-red-500'
  }
  return 'bg-slate-500'
}

/**
 * IVランクに基づくラベルを返す
 *
 * @param ivRank IVランク (0-100)
 * @returns ラベル文字列
 */
export function getIvRankLabel(ivRank: number): string {
  if (ivRank <= 25) {
    return '買い好機'
  }
  if (ivRank >= 75) {
    return '売り好機'
  }
  return '中立'
}

/**
 * ATM IVを取得する
 * 原資産価格に最も近い行使価格のIVを返す。等距離の場合はプットを優先。
 */
export function findAtmIv(
  records: IvHistory[],
  underlyingPrice: number
): number | null {
  if (records.length === 0) return null

  let closest: IvHistory | null = null
  let minDist = Infinity

  for (const r of records) {
    const dist = Math.abs(r.strike_price - underlyingPrice)
    if (
      dist < minDist ||
      (dist === minDist && closest && r.option_type === 'put' && closest.option_type !== 'put')
    ) {
      minDist = dist
      closest = r
    }
  }

  return closest ? closest.iv : null
}

/**
 * OTMプットIVを取得する
 * 原資産価格の約5%下の行使価格に最も近いプットオプションのIVを返す。
 */
export function findOtmPutIv(
  records: IvHistory[],
  underlyingPrice: number,
  otmRatio: number = 0.95
): number | null {
  const otmPuts = records.filter(
    (r) => r.option_type === 'put' && r.strike_price < underlyingPrice
  )
  if (otmPuts.length === 0) return null

  const targetStrike = underlyingPrice * otmRatio
  let closest: IvHistory | null = null
  let minDist = Infinity

  for (const r of otmPuts) {
    const dist = Math.abs(r.strike_price - targetStrike)
    if (dist < minDist) {
      minDist = dist
      closest = r
    }
  }

  return closest ? closest.iv : null
}

/**
 * スキューを計算する: OTMプットIV - ATM IV
 */
export function calculateSkew(
  otmPutIv: number | null,
  atmIv: number | null
): number | null {
  if (otmPutIv === null || atmIv === null) return null
  return otmPutIv - atmIv
}

/**
 * IV履歴レコードからスキュー時系列データを構築する。
 * 日付ごとにグループ化し、各日のスキューを計算。
 */
export function buildSkewTimeSeries(records: IvHistory[]): SkewDataPoint[] {
  if (records.length === 0) return []

  const byDate = new Map<string, IvHistory[]>()
  for (const r of records) {
    const date = r.recorded_at.slice(0, 10)
    const group = byDate.get(date)
    if (group) {
      group.push(r)
    } else {
      byDate.set(date, [r])
    }
  }

  const result: SkewDataPoint[] = []
  const sortedDates = [...byDate.keys()].sort()

  for (const date of sortedDates) {
    const dayRecords = byDate.get(date)!
    const underlyingPrice = dayRecords[0].underlying_price

    const atmIv = findAtmIv(dayRecords, underlyingPrice)
    const otmPutIv = findOtmPutIv(dayRecords, underlyingPrice)
    const skew = calculateSkew(otmPutIv, atmIv)

    if (skew !== null && atmIv !== null && otmPutIv !== null) {
      result.push({ date, skew, atmIv, otmPutIv })
    }
  }

  return result
}
