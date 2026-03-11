/**
 * IVデータ定期取得バッチAPI
 *
 * POST /api/iv-data/batch-collect
 *
 * 外部cronサービスから定期的に呼び出される想定。
 * CRON_SECRET ヘッダーで認証を行う。
 *
 * 処理フロー:
 * 1. CRON_SECRET認証
 * 2. J-Quants APIからIVデータ取得（将来実装、現在はスタブ）
 * 3. iv_historyへ蓄積
 * 4. IVランク・パーセンタイル計算
 * 5. シグナル判定（Phase 2b）
 * 6. 結果レスポンス
 *
 * タイムアウト考慮: Vercel Hobby 10秒 / Pro 60秒
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  // 1. CRON_SECRET認証
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startTime = Date.now()

    // 2. J-Quants APIからIVデータ取得（スタブ）
    // TODO: Phase 2で実際のJ-Quants API連携を実装
    const stubIvData = {
      underlying: 'N225',
      iv: 20.5,
      timestamp: new Date().toISOString(),
    }

    // 3. iv_historyへ蓄積
    const { data, error } = await supabase
      .from('iv_history')
      .insert({
        underlying: stubIvData.underlying,
        iv_value: stubIvData.iv,
        recorded_at: stubIvData.timestamp,
      })
      .select()

    if (error) {
      console.error('Failed to insert IV data:', error)
      return NextResponse.json(
        {
          error: 'Failed to store IV data',
          details: error.message,
        },
        { status: 500 },
      )
    }

    // 4. IVランク・パーセンタイル計算（スタブ）
    // TODO: 過去1年分のIVデータからランク・パーセンタイルを算出
    const ivRank = null
    const ivPercentile = null

    // 5. シグナル判定（Phase 2bで実装）
    // TODO: IVランク閾値に基づくシグナル生成 + LINE通知

    const elapsed = Date.now() - startTime

    // 6. 結果レスポンス
    return NextResponse.json({
      success: true,
      message: 'IV data batch collection completed',
      result: {
        collected: stubIvData,
        stored: data,
        ivRank,
        ivPercentile,
        signal: null, // Phase 2bで実装
      },
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Batch collection error:', message)
    return NextResponse.json(
      {
        error: 'Batch collection failed',
        details: message,
      },
      { status: 500 },
    )
  }
}
