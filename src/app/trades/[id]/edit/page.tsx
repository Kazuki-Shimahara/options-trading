'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { updateTrade } from '@/app/actions/trades'
import type { Trade } from '@/types/database'

const inputClass =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

const labelClass = 'block text-xs font-medium text-slate-200 mb-1.5'

export default function EditTradePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSettle = searchParams.get('settle') === 'true'

  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'call' | 'put'>('call')

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
          const t = data as Trade
          setTrade(t)
          setTradeType(t.trade_type)
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

    const exitPriceRaw = data.get('exit_price') as string
    const exitDateRaw = data.get('exit_date') as string

    const result = await updateTrade(tradeId, {
      trade_date: data.get('trade_date') as string,
      trade_type: isSettle ? trade.trade_type : tradeType,
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

    router.push(`/trades/${tradeId}`)
    router.refresh()
  }

  if (!trade) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <Link
          href={`/trades/${tradeId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
        >
          ← 取引詳細
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mb-8">
          {isSettle ? '決済を記録' : '取引を編集'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSettle ? (
            <>
              {/* 決済モード: hidden fields */}
              <input type="hidden" name="trade_date" value={trade.trade_date} />
              <input type="hidden" name="trade_type" value={trade.trade_type} />
              <input type="hidden" name="strike_price" value={trade.strike_price} />
              <input type="hidden" name="expiry_date" value={trade.expiry_date ?? ''} />
              <input type="hidden" name="quantity" value={trade.quantity} />
              <input type="hidden" name="entry_price" value={trade.entry_price} />
              <input type="hidden" name="iv_at_entry" value={trade.iv_at_entry ?? ''} />
              <input type="hidden" name="memo" value={trade.memo ?? ''} />

              {/* 決済対象の確認表示 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">決済対象</h2>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                    trade.trade_type === 'call'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  }`}>
                    {trade.trade_type.toUpperCase()}
                  </span>
                  <span className="text-slate-300 font-semibold">{trade.strike_price.toLocaleString()}円</span>
                  <span className="text-slate-500 text-sm">×{trade.quantity}枚</span>
                </div>
                <p className="text-sm text-slate-500">購入価格: <span className="text-slate-300 font-mono">{trade.entry_price}円</span></p>
              </div>
            </>
          ) : (
            /* 編集モード */
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">基本情報</h2>

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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>取引日 *</label>
                    <input name="trade_date" type="date" required defaultValue={trade.trade_date} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>限月（SQ日）*</label>
                    <input name="expiry_date" type="date" required defaultValue={trade.expiry_date ?? ''} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>権利行使価格 *</label>
                    <input name="strike_price" type="number" required defaultValue={trade.strike_price} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>枚数 *</label>
                    <input name="quantity" type="number" required min="1" defaultValue={trade.quantity} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>購入価格 *</label>
                    <input name="entry_price" type="number" step="0.01" required defaultValue={trade.entry_price} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>IV（%）</label>
                    <input name="iv_at_entry" type="number" step="0.01" defaultValue={trade.iv_at_entry ?? ''} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>エントリー理由・メモ</label>
                  <textarea name="memo" rows={3} defaultValue={trade.memo ?? ''} className={`${inputClass} resize-none`} />
                </div>
              </div>
            </>
          )}

          {/* 決済情報（編集・決済共通） */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">決済情報</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>決済価格</label>
                <input
                  name="exit_price"
                  type="number"
                  step="0.01"
                  defaultValue={trade.exit_price ?? ''}
                  placeholder="未決済は空欄"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>決済日</label>
                <input
                  name="exit_date"
                  type="date"
                  defaultValue={trade.exit_date ?? ''}
                  className={inputClass}
                />
              </div>
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
            {loading ? '保存中...' : isSettle ? '決済を保存' : '変更を保存'}
          </button>
        </form>
      </div>
    </main>
  )
}
