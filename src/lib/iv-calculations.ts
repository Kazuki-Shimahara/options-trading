/**
 * IVランク・IVパーセンタイルの計算ユーティリティ
 *
 * エントリー判断の定量的指標として使用する。
 * - IVランク: 過去1年の範囲における現在IVの位置
 * - IVパーセンタイル: 過去1年で現在IVより低かった日数の割合
 */

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
