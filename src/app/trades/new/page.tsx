'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrade } from '@/app/actions/trades'

const inputClass =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

const labelClass = 'block text-xs font-medium text-slate-200 mb-1.5'

export default function NewTradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'call' | 'put'>('call')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const exitPriceRaw = data.get('exit_price') as string
    const exitDateRaw = data.get('exit_date') as string

    const result = await createTrade({
      trade_date: data.get('trade_date') as string,
      trade_type: tradeType,
      strike_price: parseInt(data.get('strike_price') as string),
      expiry_date: data.get('expiry_date') as string,
      quantity: parseInt(data.get('quantity') as string),
      entry_price: parseFloat(data.get('entry_price') as string),
      exit_price: exitPriceRaw ? parseFloat(exitPriceRaw) : null,
      exit_date: exitDateRaw || null,
      iv_at_entry: data.get('iv_at_entry') ? parseFloat(data.get('iv_at_entry') as string) : null,
      memo: (data.get('memo') as string) || null,
    })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/trades')
    router.refresh()
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Link href="/trades" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors">
          ← 売買履歴
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-8">取引を記録</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: 基本情報 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">基本情報</h2>

            {/* CALL / PUT toggle */}
            <div>
              <label className={labelClass}>種別 *</label>
              <div className="flex gap-2">
                {(['call', 'put'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTradeType(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      tradeType === t
                        ? t === 'call'
                          ? 'bg-blue-600 text-white border border-blue-500'
                          : 'bg-orange-600 text-white border border-orange-500'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              <input type="hidden" name="trade_type" value={tradeType} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>取引日 *</label>
                <input
                  name="trade_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>限月（SQ日）*</label>
                <input
                  name="expiry_date"
                  type="date"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>権利行使価格 *</label>
                <input
                  name="strike_price"
                  type="number"
                  required
                  placeholder="39000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>枚数 *</label>
                <input
                  name="quantity"
                  type="number"
                  required
                  min="1"
                  defaultValue="1"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: 価格 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">価格</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>購入価格（プレミアム）*</label>
                <input
                  name="entry_price"
                  type="number"
                  step="0.01"
                  required
                  placeholder="150.5"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>IV（%）</label>
                <input
                  name="iv_at_entry"
                  type="number"
                  step="0.01"
                  placeholder="18.5"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>決済価格（任意）</label>
                <input
                  name="exit_price"
                  type="number"
                  step="0.01"
                  placeholder="未決済は空欄"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>決済日（任意）</label>
                <input
                  name="exit_date"
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section: メモ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">メモ</h2>
            <div>
              <label className={labelClass}>エントリー理由</label>
              <textarea
                name="memo"
                rows={3}
                placeholder="なぜこのタイミングでエントリーしたか..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? '保存中...' : '記録する'}
          </button>
        </form>
      </div>
    </main>
  )
}
