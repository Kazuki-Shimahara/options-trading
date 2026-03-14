import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateCsv } from '@/lib/csv-export'
import { requireUserAuth } from '@/lib/api-auth'
import { parseTrades } from '@/lib/trade-schema'

export async function GET() {
  const auth = await requireUserAuth()
  if (!auth.authenticated) return auth.response

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }

  const trades = parseTrades(data ?? [])
  const csv = generateCsv(trades)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trades.csv"',
    },
  })
}
