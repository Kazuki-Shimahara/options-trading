/**
 * IVシグナル判定ロジック（2段階閾値 + SQ週フィルタ）
 *
 * シグナル種別:
 * - 通常買いシグナル: 現在IVが20日平均より15%以上低い
 * - 強買いシグナル: 現在IVが60日平均より20%以上低い、かつ20日平均も下回る
 * - 売りシグナル: 現在IVが20日平均より20%以上高い
 *
 * フィルタ:
 * - 残存5営業日未満のオプションを除外
 * - ATMから±2000円超のオプションを除外
 * - SQ前3営業日は閾値を緩和
 */

import { getSQWeekSensitivity } from './sq-helper'

export type SignalType = 'strong_buy' | 'buy' | 'sell' | 'none'

export interface IVSignalInput {
  /** 現在のIV */
  currentIV: number
  /** 20日移動平均IV */
  avg20dIV: number
  /** 60日移動平均IV */
  avg60dIV: number
  /** 行使価格 */
  strikePrice: number
  /** 原資産価格（日経225先物） */
  spotPrice: number
  /** 残存営業日数 */
  remainingBusinessDays: number
  /** 評価日（SQ週判定に使用） */
  evaluationDate: Date
}

export interface IVSignalResult {
  /** シグナル種別 */
  signal: SignalType
  /** 通知メッセージ */
  message: string
  /** フィルタで除外されたか */
  filtered: boolean
  /** フィルタ除外理由 */
  filterReason?: string
  /** SQ週フィルタで抑制されたか */
  sqWeekFilter: boolean
  /** IV乖離率（20日平均との比較） */
  deviation20d: number
  /** IV乖離率（60日平均との比較） */
  deviation60d: number
}

/** 通常買いシグナル閾値（20日平均比） */
const BUY_THRESHOLD_20D = 0.15
/** 強買いシグナル閾値（60日平均比） */
const STRONG_BUY_THRESHOLD_60D = 0.20
/** 売りシグナル閾値（20日平均比） */
const SELL_THRESHOLD_20D = 0.20
/** ATMからの最大乖離（円） */
const ATM_RANGE = 2000
/** 最低残存営業日数 */
const MIN_REMAINING_DAYS = 5

export function evaluateIVSignal(input: IVSignalInput): IVSignalResult {
  const {
    currentIV,
    avg20dIV,
    avg60dIV,
    strikePrice,
    spotPrice,
    remainingBusinessDays,
    evaluationDate,
  } = input

  const deviation20d = (currentIV - avg20dIV) / avg20dIV
  const deviation60d = (currentIV - avg60dIV) / avg60dIV

  const baseResult: IVSignalResult = {
    signal: 'none',
    message: '',
    filtered: false,
    sqWeekFilter: false,
    deviation20d,
    deviation60d,
  }

  // 残存日数フィルタ
  if (remainingBusinessDays < MIN_REMAINING_DAYS) {
    return {
      ...baseResult,
      filtered: true,
      filterReason: '残存営業日数が5日未満',
    }
  }

  // ATMフィルタ
  const atmDistance = Math.abs(strikePrice - spotPrice)
  if (atmDistance > ATM_RANGE) {
    return {
      ...baseResult,
      filtered: true,
      filterReason: `ATMから${atmDistance}円乖離（上限${ATM_RANGE}円）`,
    }
  }

  // SQ週感度調整
  const sqSensitivity = getSQWeekSensitivity(evaluationDate)

  // 閾値にmultiplierを適用
  const buyThreshold = BUY_THRESHOLD_20D * sqSensitivity.multiplier
  const strongBuyThreshold = STRONG_BUY_THRESHOLD_60D * sqSensitivity.multiplier
  const sellThreshold = SELL_THRESHOLD_20D * sqSensitivity.multiplier

  // 強買いシグナル判定（優先度高）
  if (deviation60d <= -strongBuyThreshold && currentIV < avg20dIV) {
    return {
      ...baseResult,
      signal: 'strong_buy',
      message: '強IVシグナル：買い好機',
      sqWeekFilter: false,
    }
  }

  // 売りシグナル判定
  if (deviation20d >= sellThreshold) {
    return {
      ...baseResult,
      signal: 'sell',
      message: 'IV上昇：売り/ヘッジ検討',
      sqWeekFilter: false,
    }
  }

  // 通常買いシグナル判定
  if (deviation20d <= -buyThreshold) {
    return {
      ...baseResult,
      signal: 'buy',
      message: 'IV低下：買い検討タイミング',
      sqWeekFilter: false,
    }
  }

  // シグナルなし（SQ週フィルタで抑制された可能性をチェック）
  const wouldSignalWithoutSQ = sqSensitivity.isSQWeek && (
    deviation20d <= -BUY_THRESHOLD_20D ||
    deviation20d >= SELL_THRESHOLD_20D ||
    (deviation60d <= -STRONG_BUY_THRESHOLD_60D && currentIV < avg20dIV)
  )

  return {
    ...baseResult,
    sqWeekFilter: wouldSignalWithoutSQ,
  }
}
