'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calculatePnl } from '@/lib/trade'

export default function NewTradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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

    const { error: insertError } = await supabase.from('trades').insert({
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
      defeat_tags: null,
      user_id: null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/trades')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto">
        <Link href="/trades" className="text-sm text-blue-600 hover:underline mb-1 block">
          &larr; 売買履歴
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">取引を記録</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">取引日 *</label>
              <input
                name="trade_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種別 *</label>
              <select
                name="trade_type"
                required
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
                placeholder="例: 39000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">限月（SQ日）*</label>
              <input
                name="expiry_date"
                type="date"
                required
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
                defaultValue="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">購入価格（プレミアム）*</label>
              <input
                name="entry_price"
                type="number"
                step="0.01"
                required
                placeholder="例: 150.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決済価格（任意）</label>
              <input
                name="exit_price"
                type="number"
                step="0.01"
                placeholder="未決済の場合は空欄"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">決済日（任意）</label>
            <input
              name="exit_date"
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IV（インプライドボラティリティ %）
            </label>
            <input
              name="iv_at_entry"
              type="number"
              step="0.01"
              placeholder="例: 18.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">エントリー理由・メモ</label>
            <textarea
              name="memo"
              rows={3}
              placeholder="なぜこのタイミングでエントリーしたか..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : '記録する'}
          </button>
        </form>
      </div>
    </main>
  )
}
