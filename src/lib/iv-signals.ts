/**
 * IVシグナル判定ロジック（2段階閾値）
 *
 * IVの移動平均との乖離に基づき3種類のシグナルを判定する。
 * | シグナル | 条件 |
 * |---------|------|
 * | 通常買い | 現在IVが20日平均より15%以上低い |
 * | 強買い   | 現在IVが60日平均より20%以上低い、かつ20日平均も下回る |
 * | 売り     | 現在IVが20日平均より20%以上高い |
 */

export type IVSignalType = 'normal_buy' | 'strong_buy' | 'sell'

export interface IVSignal {
  type: IVSignalType
  message: string
}

const SIGNAL_MESSAGES: Record<IVSignalType, string> = {
  normal_buy: 'IV低下：買い検討タイミング',
  strong_buy: '強IVシグナル：買い好機',
  sell: 'IV上昇：売り/ヘッジ検討',
}

/**
 * IV配列の平均値を算出する
 *
 * @param ivValues IV値の配列
 * @returns 平均値。空配列の場合はnull
 */
export function calculateIVAverage(ivValues: number[]): number | null {
  if (ivValues.length === 0) {
    return null
  }
  const sum = ivValues.reduce((acc, val) => acc + val, 0)
  return sum / ivValues.length
}

/**
 * シグナル判定を行う
 *
 * 優先順位: 強買い > 売り > 通常買い
 * - 強買い: currentIV <= iv60Avg * 0.8 かつ currentIV < iv20Avg
 * - 売り:   currentIV >= iv20Avg * 1.2
 * - 通常買い: currentIV <= iv20Avg * 0.85
 *
 * @param currentIV 現在のIV
 * @param iv20Avg 20日移動平均IV
 * @param iv60Avg 60日移動平均IV
 * @returns IVSignal または null（シグナルなし）
 */
export function detectSignal(
  currentIV: number,
  iv20Avg: number,
  iv60Avg: number
): IVSignal | null {
  const isStrongBuy =
    currentIV <= iv60Avg * (1 - 0.2) && currentIV < iv20Avg
  const isSell = currentIV >= iv20Avg * (1 + 0.2)
  const isNormalBuy = currentIV <= iv20Avg * (1 - 0.15)

  // 強買いが最優先
  if (isStrongBuy) {
    return { type: 'strong_buy', message: SIGNAL_MESSAGES.strong_buy }
  }

  // 売りシグナル
  if (isSell) {
    return { type: 'sell', message: SIGNAL_MESSAGES.sell }
  }

  // 通常買いシグナル
  if (isNormalBuy) {
    return { type: 'normal_buy', message: SIGNAL_MESSAGES.normal_buy }
  }

  return null
}
