import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const { subscription } = body

  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json(
      { error: '購読情報が不正です' },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    return NextResponse.json(
      { error: '購読情報の保存に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const body = await request.json()
  const { endpoint } = body

  if (!endpoint) {
    return NextResponse.json(
      { error: 'endpointが必要です' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) {
    return NextResponse.json(
      { error: '購読解除に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
