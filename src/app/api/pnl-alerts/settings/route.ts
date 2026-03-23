import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireUserAuth } from '@/lib/api-auth'

const VALID_DIRECTIONS = ['loss', 'profit', 'both']

export async function GET(request: Request) {
  const auth = await requireUserAuth()
  if (!auth.authenticated) return auth.response

  const url = new URL(request.url)
  const tradeId = url.searchParams.get('trade_id')

  if (!tradeId) {
    return NextResponse.json(
      { error: 'trade_idが必要です' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('pnl_alert_settings')
    .select('*')
    .eq('trade_id', tradeId)

  if (error) {
    return NextResponse.json(
      { error: 'アラート設定の取得に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireUserAuth()
  if (!auth.authenticated) return auth.response

  const body = await request.json()
  const { trade_id, threshold_amount, direction, cooldown_minutes } = body

  if (!trade_id || threshold_amount === undefined || !direction || cooldown_minutes === undefined) {
    return NextResponse.json(
      { error: 'trade_id, threshold_amount, direction, cooldown_minutesは必須です' },
      { status: 400 }
    )
  }

  if (!VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json(
      { error: 'directionはloss, profit, bothのいずれかを指定してください' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('pnl_alert_settings')
    .insert({
      trade_id,
      threshold_amount,
      direction,
      cooldown_minutes,
      enabled: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'アラート設定の作成に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const auth = await requireUserAuth()
  if (!auth.authenticated) return auth.response

  const body = await request.json()
  const { id } = body

  if (!id) {
    return NextResponse.json(
      { error: 'idが必要です' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('pnl_alert_settings')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: 'アラート設定の削除に失敗しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
