'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calculatePnl } from '@/lib/trade'
import type { Trade } from '@/types/database'

export default function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSettle = searchParams.get('settle') === 'true'

  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeId, setTradeId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      setTradeId(id)
      supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            router.push('/trades')
            return
          }
          setTrade(data as Trade)
        })
    })
  }, [params, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trade || !tradeId) return

    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const entryPrice = parseFloat(data.get('entry_price') as string)
    const exitPriceRaw = data.get('exit_price') as string
    const exitPrice = exitPriceRaw ? parseFloat(exitPriceRaw) : null
    const exitDateRaw = data.get('exit_date') as string
    const quantity = parseInt(data.get('quantity') as string)

    const pnl = calculatePnl(exitPrice, entryPrice, quantity)

    const { error: updateError } = await supabase
      .from('trades')
      .update({
        trade_date: data.get('trade_date') as string,
        trade_type: data.get('trade_type') as 'call' | 'put',
        strike_price: parseInt(data.get('strike_price') as string),
        expiry_date: data.get('expiry_date') as string,
        quantity,
        entry_price: entryPrice,
        exit_price: exitPrice,
        exit_date: exitDateRaw || null,
        pnl,
        iv_at_entry: data.get('iv_at_entry') ? parseFloat(data.get('iv_at_entry') as string) : null,
        memo: (data.get('memo') as string) || null,
        status: exitPrice !== null ? 'closed' : 'open',
      })
      .eq('id', tradeId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push(`/trades/${tradeId}`)
    router.refresh()
  }

  if (!trade) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <Link href={`/trades/${tradeId}`} className="text-sm text-blue-600 hover:underline mb-1 block">
          &larr; 取引詳細
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isSettle ? '決済を記録' : '取引を編集'}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {!isSettle && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">取引日 *</label>
                  <input
                    name="trade_date"
                    type="date"
                    required
                    defaultValue={trade.trade_date}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">種別 *</label>
                  <select
                    name="trade_type"
                    required
                    defaultValue={trade.trade_type}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="call">CALL</option>
                    <option value="put">PUT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">権利行使価格 *</label>
                  <input
                    name="strike_price"
                    type="number"
                    required
                    defaultValue={trade.strike_price}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">限月（SQ日）*</label>
                  <input
                    name="expiry_date"
                    type="date"
                    required
                    defaultValue={trade.expiry_date ?? ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">枚数 *</label>
                  <input
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    defaultValue={trade.quantity}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">購入価格（プレミアム）*</label>
                  <input
                    name="entry_price"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={trade.entry_price}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IV（インプライドボラティリティ %）</label>
                <input
                  name="iv_at_entry"
                  type="number"
                  step="0.01"
                  defaultValue={trade.iv_at_entry ?? ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">エントリー理由・メモ</label>
                <textarea
                  name="memo"
                  rows={3}
                  defaultValue={trade.memo ?? ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {isSettle && (
            <>
              {/* 決済モード: 編集不可フィールドはhiddenで送信 */}
              <input type="hidden" name="trade_date" value={trade.trade_date} />
              <input type="hidden" name="trade_type" value={trade.trade_type} />
              <input type="hidden" name="strike_price" value={trade.strike_price} />
              <input type="hidden" name="expiry_date" value={trade.expiry_date ?? ''} />
              <input type="hidden" name="quantity" value={trade.quantity} />
              <input type="hidden" name="entry_price" value={trade.entry_price} />
              <input type="hidden" name="iv_at_entry" value={trade.iv_at_entry ?? ''} />
              <input type="hidden" name="memo" value={trade.memo ?? ''} />

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">種別：</span>{trade.trade_type.toUpperCase()}</p>
                <p><span className="font-medium">権利行使価格：</span>{trade.strike_price.toLocaleString()} 円</p>
                <p><span className="font-medium">枚数：</span>{trade.quantity} 枚</p>
                <p><span className="font-medium">購入価格：</span>{trade.entry_price} 円</p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決済価格</label>
              <input
                name="exit_price"
                type="number"
                step="0.01"
                defaultValue={trade.exit_price ?? ''}
                placeholder="未決済の場合は空欄"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決済日</label>
              <input
                name="exit_date"
                type="date"
                defaultValue={trade.exit_date ?? ''}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : isSettle ? '決済を保存' : '変更を保存'}
          </button>
        </form>
      </div>
    </main>
  )
}
