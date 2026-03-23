/**
 * 含み損益アラート - コアロジック
 *
 * オープンポジションの含み損益を計算し、
 * 設定された閾値を超えた場合にアラート対象として検出する。
 */

import type { Trade } from '@/lib/trade-schema'
import type { PnlAlertSetting, PnlAlertNotification } from '@/types/database'

export interface UnrealizedPnlResult {
  trade: Trade
  unrealizedPnl: number
  currentPrice: number
}

export interface AlertCheckResult {
  trade: Trade
  setting: PnlAlertSetting
  unrealizedPnl: number
  shouldNotify: boolean
  reason: string
}

/**
 * 含み損益を計算する
 * PnL = (currentPrice - entryPrice) * quantity * multiplier
 * multiplier: ミニオプション=100, 通常=1000
 */
export function calculateUnrealizedPnl(
  trade: Trade,
  currentPrice: number
): number {
  const multiplier = trade.is_mini ? 100 : 1000
  return (currentPrice - trade.entry_price) * trade.quantity * multiplier
}

/**
 * 閾値超過を判定する
 */
export function isThresholdExceeded(
  unrealizedPnl: number,
  setting: PnlAlertSetting
): boolean {
  const threshold = setting.threshold_amount

  switch (setting.direction) {
    case 'loss':
      return unrealizedPnl <= -threshold
    case 'profit':
      return unrealizedPnl >= threshold
    case 'both':
      return Math.abs(unrealizedPnl) >= threshold
    default:
      return false
  }
}

/**
 * クールダウン期間内かどうか判定する
 * 最後の通知からcooldown_minutes以内であればtrue
 */
export function isInCooldown(
  lastNotification: PnlAlertNotification | null,
  cooldownMinutes: number,
  now: Date = new Date()
): boolean {
  if (!lastNotification) return false
  const lastSent = new Date(lastNotification.sent_at)
  const diffMs = now.getTime() - lastSent.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  return diffMinutes < cooldownMinutes
}

/**
 * アラートチェックを実行する
 * 各トレードの含み損益を確認し、通知すべきかどうか判定する
 */
export function checkAlerts(
  trades: Trade[],
  settings: PnlAlertSetting[],
  currentPrices: Map<string, number>,
  recentNotifications: Map<string, PnlAlertNotification>,
  now: Date = new Date()
): AlertCheckResult[] {
  const results: AlertCheckResult[] = []

  for (const setting of settings) {
    if (!setting.enabled) continue

    const trade = trades.find((t) => t.id === setting.trade_id)
    if (!trade) continue
    if (trade.status !== 'open') continue

    const currentPrice = currentPrices.get(trade.id)
    if (currentPrice === undefined) continue

    const unrealizedPnl = calculateUnrealizedPnl(trade, currentPrice)
    const exceeded = isThresholdExceeded(unrealizedPnl, setting)

    if (!exceeded) {
      results.push({
        trade,
        setting,
        unrealizedPnl,
        shouldNotify: false,
        reason: '閾値未達',
      })
      continue
    }

    const lastNotification = recentNotifications.get(setting.id)
    const inCooldown = isInCooldown(lastNotification ?? null, setting.cooldown_minutes, now)

    if (inCooldown) {
      results.push({
        trade,
        setting,
        unrealizedPnl,
        shouldNotify: false,
        reason: 'クールダウン期間中',
      })
      continue
    }

    results.push({
      trade,
      setting,
      unrealizedPnl,
      shouldNotify: true,
      reason: '閾値超過',
    })
  }

  return results
}

/**
 * アラート通知メッセージを生成する
 */
export function formatAlertMessage(
  trade: Trade,
  unrealizedPnl: number,
  thresholdAmount: number
): { title: string; body: string } {
  const pnlStr = unrealizedPnl >= 0
    ? `+${unrealizedPnl.toLocaleString()}円`
    : `${unrealizedPnl.toLocaleString()}円`
  const typeLabel = trade.trade_type === 'call' ? 'コール' : 'プット'
  const title = unrealizedPnl < 0 ? '含み損アラート' : '含み益アラート'
  const body = `${typeLabel} ${trade.strike_price} (${trade.quantity}枚): 含み損益 ${pnlStr}（閾値: ${thresholdAmount.toLocaleString()}円）`

  return { title, body }
}
