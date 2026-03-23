import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'
import { requireInternalAuth } from '@/lib/api-auth'
import { checkAlerts, formatAlertMessage } from '@/lib/pnl-alert'
import { parseTrades } from '@/lib/trade-schema'
import type { PnlAlertSetting, PnlAlertNotification } from '@/types/database'

export async function POST(request: Request) {
  const auth = requireInternalAuth(request)
  if (!auth.authenticated) return auth.response

  const body = await request.json()
  const { current_prices } = body

  if (!current_prices || typeof current_prices !== 'object') {
    return NextResponse.json(
      { error: 'current_pricesが必要です（{ trade_id: price }形式）' },
      { status: 400 }
    )
  }

  // 1. オープントレードを取得
  const { data: rawTrades, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .eq('status', 'open')

  if (tradesError) {
    return NextResponse.json(
      { error: 'トレードの取得に失敗しました' },
      { status: 500 }
    )
  }

  const trades = parseTrades(rawTrades ?? [])

  // 2. 有効なアラート設定を取得
  const { data: rawSettings, error: settingsError } = await supabase
    .from('pnl_alert_settings')
    .select('*')
    .eq('enabled', true)

  if (settingsError) {
    return NextResponse.json(
      { error: 'アラート設定の取得に失敗しました' },
      { status: 500 }
    )
  }

  const settings = (rawSettings ?? []) as PnlAlertSetting[]

  // 3. 各設定の最新通知を取得
  const recentNotifications = new Map<string, PnlAlertNotification>()
  for (const setting of settings) {
    const { data: notifs } = await supabase
      .from('pnl_alert_notifications')
      .select('*')
      .eq('alert_setting_id', setting.id)
      .order('sent_at', { ascending: false })
      .limit(1)

    if (notifs && notifs.length > 0) {
      recentNotifications.set(setting.id, notifs[0] as PnlAlertNotification)
    }
  }

  // 4. アラートチェック実行
  const priceMap = new Map<string, number>(Object.entries(current_prices))
  const results = checkAlerts(trades, settings, priceMap, recentNotifications)
  const alertsToNotify = results.filter((r) => r.shouldNotify)

  // 5. Push通知の送信
  let notificationsSent = 0

  if (alertsToNotify.length > 0) {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        'mailto:noreply@example.com',
        vapidPublicKey,
        vapidPrivateKey
      )

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')

      for (const alert of alertsToNotify) {
        const { title, body: notifBody } = formatAlertMessage(
          alert.trade,
          alert.unrealizedPnl,
          alert.setting.threshold_amount
        )

        const payload = JSON.stringify({
          title,
          body: notifBody,
          icon: '/icon-192x192.png',
        })

        for (const sub of subscriptions ?? []) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            )
            notificationsSent++
          } catch {
            // 送信失敗は無視して続行
          }
        }

        // 通知履歴を記録
        await supabase.from('pnl_alert_notifications').insert({
          alert_setting_id: alert.setting.id,
          trade_id: alert.trade.id,
          triggered_pnl: alert.unrealizedPnl,
          threshold_amount: alert.setting.threshold_amount,
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    alerts_triggered: alertsToNotify.length,
    notifications_sent: notificationsSent,
    results: results.map((r) => ({
      trade_id: r.trade.id,
      unrealized_pnl: r.unrealizedPnl,
      should_notify: r.shouldNotify,
      reason: r.reason,
    })),
  })
}
