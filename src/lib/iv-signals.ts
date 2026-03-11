/**
 * IVシグナル判定ロジック（2段階閾値）
 *
 * IVの移動平均との乖離に基づき、3種類のシグナルを判定する。
 * - 通常買い: 現在IVが20日平均より15%以上低い
 * - 強買い:   現在IVが60日平均より20%以上低い、かつ20日平均も下回る
 * - 売り:     現在IVが20日平均より20%以上高い
 */

export type SignalType = 'buy' | 'strong_buy' | 'sell'

export interface IVSignal {
  type: SignalType
  message: string
  currentIv: number
  iv20Avg: number
  iv60Avg: number | null
  deviation: number // 乖離率（%）
}

/**
 * 過去N日のIV平均を計算する
 *
 * @param ivValues IV値の配列
 * @returns 平均値（空配列の場合は0）
 */
export function calculateIVAverage(ivValues: number[]): number {
  if (ivValues.length === 0) {
    return 0
  }
  const sum = ivValues.reduce((acc, v) => acc + v, 0)
  return sum / ivValues.length
}

/**
 * IVシグナルを判定する
 *
 * 判定優先順位:
 * 1. 強買いシグナル（iv60Avgがnullの場合はスキップ）
 * 2. 通常買いシグナル
 * 3. 売りシグナル
 *
 * @param currentIv 現在のIV
 * @param iv20Avg 20日移動平均
 * @param iv60Avg 60日移動平均（データ不足時はnull）
 * @returns シグナル情報、該当なしの場合はnull
 */
export function detectSignal(
  currentIv: number,
  iv20Avg: number,
  iv60Avg: number | null
): IVSignal | null {
  // 強買いシグナル（最優先判定）
  // currentIV < iv60Avg * 0.80 && currentIV < iv20Avg
  if (iv60Avg !== null && currentIv < iv60Avg * 0.8 && currentIv < iv20Avg) {
    const deviation = ((currentIv - iv60Avg) / iv60Avg) * 100
    return {
      type: 'strong_buy',
      message: '強IVシグナル：買い好機',
      currentIv,
      iv20Avg,
      iv60Avg,
      deviation: Math.round(deviation * 100) / 100,
    }
  }

  // 通常買いシグナル
  // currentIV < iv20Avg * 0.85
  if (currentIv < iv20Avg * 0.85) {
    const deviation = ((currentIv - iv20Avg) / iv20Avg) * 100
    return {
      type: 'buy',
      message: 'IV低下：買い検討タイミング',
      currentIv,
      iv20Avg,
      iv60Avg,
      deviation: Math.round(deviation * 100) / 100,
    }
  }

  // 売りシグナル
  // currentIV > iv20Avg * 1.20
  if (currentIv > iv20Avg * 1.2) {
    const deviation = ((currentIv - iv20Avg) / iv20Avg) * 100
    return {
      type: 'sell',
      message: 'IV上昇：売り/ヘッジ検討',
      currentIv,
      iv20Avg,
      iv60Avg,
      deviation: Math.round(deviation * 100) / 100,
    }
  }

  // いずれにも該当しない
  return null
}

/**
 * 複数のIV履歴データからシグナルを検出する
 *
 * 履歴データを日付順にソートし、直近のIVと20日/60日移動平均を算出してシグナル判定を行う。
 *
 * @param ivHistory IV履歴データ（iv値と記録日時）
 * @returns シグナル情報、データ不足または該当なしの場合はnull
 */
export function detectSignalFromHistory(
  ivHistory: { iv: number; recorded_at: string }[]
): IVSignal | null {
  if (ivHistory.length === 0) {
    return null
  }

  // 日付順にソート（古い順）
  const sorted = [...ivHistory].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  )

  // 直近のIV
  const currentIv = sorted[sorted.length - 1].iv

  // 20日平均を計算（直近のデータは除外し、その前の最大20件を使用）
  const ivValues = sorted.map((d) => d.iv)
  const past = ivValues.slice(0, -1) // 直近を除く

  if (past.length === 0) {
    return null
  }

  const last20 = past.slice(-20)
  const iv20Avg = calculateIVAverage(last20)

  // 60日平均を計算（60日分のデータがある場合のみ）
  let iv60Avg: number | null = null
  if (past.length >= 60) {
    const last60 = past.slice(-60)
    iv60Avg = calculateIVAverage(last60)
  }

  return detectSignal(currentIv, iv20Avg, iv60Avg)
}
