import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'
import type { PushSubscriptionRow } from '@/types/database'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

// VAPID設定
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface SendPushBody {
  title?: string
  body: string
  url?: string
  icon?: string
}

/**
 * POST /api/push/send
 * 全登録ブラウザにPush通知を送信
 */
export async function POST(request: NextRequest) {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'VAPID keys are not configured' },
        { status: 500 }
      )
    }

    const body: SendPushBody = await request.json()

    if (!body.body) {
      return NextResponse.json(
        { error: 'Notification body is required' },
        { status: 400 }
      )
    }

    // 全サブスクリプションを取得
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (error) {
      console.error('[Push Send] Failed to fetch subscriptions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No subscriptions found', sent: 0 }
      )
    }

    const payload = JSON.stringify({
      title: body.title || 'NK225 Options',
      body: body.body,
      url: body.url || '/',
      icon: body.icon || '/next.svg',
    })

    // 各サブスクリプションに送信
    const results = await Promise.allSettled(
      (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, payload)
          return { endpoint: sub.endpoint, success: true }
        } catch (err: unknown) {
          const webPushError = err as { statusCode?: number }
          // 410 Gone or 404 Not Found = subscription expired
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            console.log('[Push Send] Removing expired subscription:', sub.endpoint)
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
          throw err
        }
      })
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      message: `Push notifications sent`,
      sent,
      failed,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error('[Push Send] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
