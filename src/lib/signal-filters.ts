/**
 * 取引スタイル別IVシグナル通知フィルタ
 *
 * ユーザーの取引スタイルに応じてIVシグナル通知をフィルタリングする。
 * - 買い中心: IVランク25以下のシグナルのみ通知
 * - 売り中心: IVランク50以上のシグナルのみ通知
 * - 全表示: 全シグナルを通知（上級者向け）
 */

export const TradingStyle = {
  BuyFocused: 'buy_focused',
  SellFocused: 'sell_focused',
  All: 'all',
} as const

export type TradingStyle = (typeof TradingStyle)[keyof typeof TradingStyle]

export interface IvSignal {
  ivRank: number
  currentIv: number
  timestamp: string
}

/**
 * 取引スタイルに基づいてシグナルを通知すべきか判定する
 */
export function shouldNotify(style: TradingStyle, signal: IvSignal): boolean {
  switch (style) {
    case TradingStyle.BuyFocused:
      return signal.ivRank <= 25
    case TradingStyle.SellFocused:
      return signal.ivRank >= 50
    case TradingStyle.All:
      return true
  }
}

/**
 * 取引スタイルのフィルタ条件説明を返す
 */
export function getFilterDescription(style: TradingStyle): string {
  switch (style) {
    case TradingStyle.BuyFocused:
      return 'IVランク25以下のシグナルのみ通知'
    case TradingStyle.SellFocused:
      return 'IVランク50以上のシグナルのみ通知'
    case TradingStyle.All:
      return '全てのシグナルを通知'
  }
}
