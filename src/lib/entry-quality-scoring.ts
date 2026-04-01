import type { Trade } from '@/types/database'

/**
 * エントリー品質スコアリング
 *
 * 特徴量からルールベースで0-100点のスコアを算出する。
 * 低IVランク時のオプション買い戦略（割安なプレミアム）を高評価とする。
 */

export interface EntryFeatures {
  /** IVランク (0-100) */
  ivRank: number
  /** IVパーセンタイル (0-100) */
  ivPercentile: number
  /** プット・コール・レシオ */
  pcr: number
  /** ボラティリティスキュー（負=スティープ） */
  skew: number
  /** 曜日 (0=日, 1=月, ..., 5=金, 6=土) */
  dayOfWeek: number
  /** イベント前か */
  isPreEvent: boolean
  /** イベント後か */
  isPostEvent: boolean
}

/** 各特徴量の重み */
const WEIGHTS = {
  ivRank: 0.30,
  ivPercentile: 0.20,
  pcr: 0.15,
  skew: 0.15,
  dayOfWeek: 0.05,
  event: 0.15,
} as const

/**
 * IVランクのスコア (0-100)
 * 低いほど良い（プレミアムが割安＝オプション買いに有利）
 */
function scoreIvRank(ivRank: number): number {
  return Math.max(0, Math.min(100, 100 - ivRank))
}

/**
 * IVパーセンタイルのスコア (0-100)
 * 低いほど良い（IVが相対的に低い＝買いに有利）
 */
function scoreIvPercentile(ivPercentile: number): number {
  return Math.max(0, Math.min(100, 100 - ivPercentile))
}

/**
 * PCRスコア (0-100)
 * PCR < 1.0 は楽観 → ボラ拡大余地あり → オプション買い好機
 * 0.5-2.0 の範囲を 100-0 にマッピング
 */
function scorePcr(pcr: number): number {
  const clamped = Math.max(0.5, Math.min(2.0, pcr))
  return ((2.0 - clamped) / 1.5) * 100
}

/**
 * スキュースコア (0-100)
 * 負のスキュー（スティープ）はOTMプットが割安 → 買い好機
 * -10〜+10 を 100〜0 にマッピング
 */
function scoreSkew(skew: number): number {
  const clamped = Math.max(-10, Math.min(10, skew))
  return ((10 - clamped) / 20) * 100
}

/**
 * 曜日スコア (0-100)
 * 火-木が最も良い（市場の流動性が高い）
 */
function scoreDayOfWeek(dayOfWeek: number): number {
  const scores: Record<number, number> = {
    0: 20, // 日
    1: 60, // 月
    2: 80, // 火
    3: 80, // 水
    4: 80, // 木
    5: 50, // 金
    6: 20, // 土
  }
  return scores[dayOfWeek] ?? 50
}

/**
 * イベントスコア (0-100)
 * イベント前: ボラ拡大期待 → 買い好機 → 高スコア
 * イベント後: ボラ収縮 → 買いに不利 → 低スコア
 * 通常時: 中程度
 */
function scoreEvent(isPreEvent: boolean, isPostEvent: boolean): number {
  if (isPreEvent) return 80
  if (isPostEvent) return 30
  return 60
}

/**
 * エントリー品質スコアを計算する (0-100)
 */
export function calculateEntryQualityScore(features: EntryFeatures): number {
  const rawScore =
    WEIGHTS.ivRank * scoreIvRank(features.ivRank) +
    WEIGHTS.ivPercentile * scoreIvPercentile(features.ivPercentile) +
    WEIGHTS.pcr * scorePcr(features.pcr) +
    WEIGHTS.skew * scoreSkew(features.skew) +
    WEIGHTS.dayOfWeek * scoreDayOfWeek(features.dayOfWeek) +
    WEIGHTS.event * scoreEvent(features.isPreEvent, features.isPostEvent)

  return Math.round(Math.max(0, Math.min(100, rawScore)))
}

/** スコアバンド定義 */
export interface ScoreBand {
  label: string
  min: number
  max: number
  totalTrades: number
  wins: number
  winRate: number | null
  averagePnl: number | null
}

const BANDS = [
  { label: '0-20', min: 0, max: 20 },
  { label: '21-40', min: 21, max: 40 },
  { label: '41-60', min: 41, max: 60 },
  { label: '61-80', min: 61, max: 80 },
  { label: '81-100', min: 81, max: 100 },
] as const

/**
 * 取引をIVランクベースのスコアバンドで集計する
 * (将来的にはMLスコアベースに移行)
 */
export function aggregateScoreBands(trades: Trade[]): ScoreBand[] {
  const bands: ScoreBand[] = BANDS.map((b) => ({
    ...b,
    totalTrades: 0,
    wins: 0,
    winRate: null,
    averagePnl: null,
  }))

  const pnlSums: number[] = [0, 0, 0, 0, 0]

  for (const trade of trades) {
    if (trade.entry_iv_rank == null || trade.pnl == null) continue

    const ivRank = trade.entry_iv_rank
    let idx: number
    if (ivRank <= 20) idx = 0
    else if (ivRank <= 40) idx = 1
    else if (ivRank <= 60) idx = 2
    else if (ivRank <= 80) idx = 3
    else idx = 4

    bands[idx].totalTrades++
    pnlSums[idx] += trade.pnl

    if (trade.pnl >= 0) {
      bands[idx].wins++
    }
  }

  for (let i = 0; i < bands.length; i++) {
    if (bands[i].totalTrades > 0) {
      bands[i].winRate = (bands[i].wins / bands[i].totalTrades) * 100
      bands[i].averagePnl = pnlSums[i] / bands[i].totalTrades
    }
  }

  return bands
}
