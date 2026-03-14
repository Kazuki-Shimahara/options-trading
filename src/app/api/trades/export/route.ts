import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { generateCsv } from '@/lib/csv-export'
import type { Trade } from '@/types/database'

export async function GET() {
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

  const trades = (data ?? []) as Trade[]
  const csv = generateCsv(trades)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="trades.csv"',
    },
  })
}
