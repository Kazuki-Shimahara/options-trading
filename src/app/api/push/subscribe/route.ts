import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/push/subscribe
 * PushSubscriptionをSupabaseに保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription: endpoint is required' },
        { status: 400 }
      )
    }

    // endpoint をキーに upsert（同じブラウザの再登録に対応）
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh || null,
          auth: subscription.keys?.auth || null,
          user_agent: request.headers.get('user-agent') || null,
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[Push API] Failed to save subscription:', error)
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Subscription saved' })
  } catch (error) {
    console.error('[Push API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/push/subscribe
 * PushSubscriptionをSupabaseから削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('[Push API] Failed to delete subscription:', error)
      return NextResponse.json(
        { error: 'Failed to delete subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Subscription deleted' })
  } catch (error) {
    console.error('[Push API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
