/**
 * J-Quants APIからのデータ取得に関する型定義
 *
 * 実際のAPI呼び出しロジックは Issue #7 で実装予定。
 * ここでは型定義のみを提供する。
 */

/**
 * IV（インプライドボラティリティ）データ取得結果
 */
export interface FetchIVDataResult {
  /** 日経225のATM IV（パーセンテージ） */
  atmIv: number
  /** 日経VI（ボラティリティインデックス） */
  nikkeiVi: number
  /** データ取得日 */
  date: string
}

/**
 * 価格データ取得結果
 */
export interface FetchPriceDataResult {
  /** 日経225終値の配列（時系列順、最新が末尾） */
  prices: number[]
  /** データの開始日 */
  startDate: string
  /** データの終了日 */
  endDate: string
}

/**
 * PCR（プット・コール・レシオ）データ取得結果
 */
export interface FetchPCRDataResult {
  /** プット出来高 */
  putVolume: number
  /** コール出来高 */
  callVolume: number
  /** PCR値（プット出来高 ÷ コール出来高） */
  pcr: number
  /** データ取得日 */
  date: string
}

/**
 * 補助指標の集約結果
 */
export interface MarketIndicators {
  /** 20日ヒストリカルボラティリティ（パーセンテージ） */
  hv20: number | null
  /** 60日ヒストリカルボラティリティ（パーセンテージ） */
  hv60: number | null
  /** 現在のATM IV（パーセンテージ） */
  atmIv: number | null
  /** IV/HV比 */
  ivHvRatio: number | null
  /** 日経VI */
  nikkeiVi: number | null
  /** PCR値 */
  pcr: number | null
}
