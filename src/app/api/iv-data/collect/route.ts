import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { IvHistory } from '@/types/database'

type IvDataInput = Omit<IvHistory, 'id'>

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: 'リクエストボディはIVデータの配列である必要があります' },
        { status: 400 }
      )
    }

    // Validate required fields
    const requiredFields = [
      'recorded_at',
      'underlying_price',
      'strike_price',
      'expiry_date',
      'option_type',
      'iv',
      'data_source',
    ] as const

    for (const [index, item] of body.entries()) {
      for (const field of requiredFields) {
        if (item[field] === undefined || item[field] === null) {
          return NextResponse.json(
            { error: `データ[${index}]に必須フィールド "${field}" がありません` },
            { status: 400 }
          )
        }
      }

      if (!['call', 'put'].includes(item.option_type)) {
        return NextResponse.json(
          { error: `データ[${index}]のoption_typeは "call" または "put" である必要があります` },
          { status: 400 }
        )
      }
    }

    // Check for duplicates based on recorded_at + strike_price + expiry_date + option_type
    const duplicateChecks = body.map((item: IvDataInput) => ({
      recorded_at: item.recorded_at,
      strike_price: item.strike_price,
      expiry_date: item.expiry_date,
      option_type: item.option_type,
    }))

    const { data: existingRecords, error: checkError } = await supabase
      .from('iv_history')
      .select('recorded_at, strike_price, expiry_date, option_type')

    if (checkError) {
      console.error('重複チェックエラー:', checkError)
      return NextResponse.json(
        { error: '重複チェック中にエラーが発生しました' },
        { status: 500 }
      )
    }

    // Build a set of existing keys for fast lookup
    const existingKeys = new Set(
      (existingRecords ?? []).map(
        (r: { recorded_at: string; strike_price: number; expiry_date: string; option_type: string }) =>
          `${r.recorded_at}|${r.strike_price}|${r.expiry_date}|${r.option_type}`
      )
    )

    // Filter out duplicates
    const newRecords = body.filter((item: IvDataInput) => {
      const key = `${item.recorded_at}|${item.strike_price}|${item.expiry_date}|${item.option_type}`
      return !existingKeys.has(key)
    })

    if (newRecords.length === 0) {
      return NextResponse.json({
        message: '全てのデータが既に存在しています',
        inserted: 0,
        duplicates: body.length,
      })
    }

    // Insert new records
    const { data, error: insertError } = await supabase
      .from('iv_history')
      .insert(newRecords)
      .select()

    if (insertError) {
      console.error('データ挿入エラー:', insertError)
      return NextResponse.json(
        { error: 'データの保存中にエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'IVデータを保存しました',
      inserted: (data ?? []).length,
      duplicates: body.length - (data ?? []).length,
    })
  } catch (error) {
    console.error('予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
