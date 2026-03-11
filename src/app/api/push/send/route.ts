import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const { title, body: notificationBody } = body

  if (!title || !notificationBody) {
    return NextResponse.json(
      { error: 'titleとbodyが必要です' },
      { status: 400 }
    )
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: 'VAPID鍵が設定されていません' },
      { status: 500 }
    )
  }

  webpush.setVapidDetails(
    'mailto:noreply@example.com',
    vapidPublicKey,
    vapidPrivateKey
  )

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (error) {
    return NextResponse.json(
      { error: '購読情報の取得に失敗しました' },
      { status: 500 }
    )
  }

  const payload = JSON.stringify({
    title,
    body: notificationBody,
    icon: '/icon-192x192.png',
  })

  let sent = 0
  const errors: string[] = []

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
      sent++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${sub.endpoint}: ${message}`)
    }
  }

  return NextResponse.json({ success: true, sent, errors })
}
