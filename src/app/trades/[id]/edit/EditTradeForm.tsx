'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateTrade } from '@/app/actions/trades'
import type { Trade } from '@/lib/trade-schema'
import { DatePicker } from '@/components/DatePicker'
import { EMOTIONS, type Emotion } from '@/lib/emotion-analysis'

const inputClass =
  'w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa] transition-colors'

const labelClass = 'block text-[10px] font-medium text-[#00d4aa]/70 mb-1 tracking-wider uppercase'

export default function EditTradeForm({
  trade,
  tradeId,
  isSettle,
}: {
  trade: Trade
  tradeId: string
  isSettle: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'call' | 'put'>(trade.trade_type)
  const [isMini, setIsMini] = useState(trade.is_mini)
  const [tradeDate, setTradeDate] = useState(trade.trade_date)
  const [expiryDate, setExpiryDate] = useState(trade.expiry_date ?? '')
  const [exitDate, setExitDate] = useState(trade.exit_date ?? '')
  const [confidenceLevel, setConfidenceLevel] = useState<number>(trade.confidence_level ?? 3)
  const [emotion, setEmotion] = useState<string>(trade.emotion ?? '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const exitPriceRaw = data.get('exit_price') as string

    const result = await updateTrade(tradeId, {
      trade_date: isSettle ? trade.trade_date : tradeDate,
      trade_type: isSettle ? trade.trade_type : tradeType,
      strike_price: parseInt(data.get('strike_price') as string),
      expiry_date: isSettle ? (trade.expiry_date ?? '') : expiryDate,
      quantity: parseInt(data.get('quantity') as string),
      entry_price: parseFloat(data.get('entry_price') as string),
      exit_price: exitPriceRaw ? parseFloat(exitPriceRaw) : null,
      exit_date: exitDate || null,
      iv_at_entry: data.get('iv_at_entry') ? parseFloat(data.get('iv_at_entry') as string) : null,
      memo: (data.get('memo') as string) || null,
      is_mini: isMini,
      confidence_level: confidenceLevel || null,
      emotion: (emotion as Emotion) || null,
    })

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/trades/${tradeId}`)
    router.refresh()
  }

  return (
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link
            href={`/trades/${tradeId}`}
            className="text-[#666] hover:text-[#888] text-sm transition-colors"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">
            {isSettle ? '決済を記録' : '取引を編集'}
          </h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSettle ? (
            <>
              <input type="hidden" name="trade_type" value={trade.trade_type} />
              <input type="hidden" name="strike_price" value={trade.strike_price} />
              <input type="hidden" name="quantity" value={trade.quantity} />
              <input type="hidden" name="entry_price" value={trade.entry_price} />
              <input type="hidden" name="iv_at_entry" value={trade.iv_at_entry ?? ''} />
              <input type="hidden" name="memo" value={trade.memo ?? ''} />

              <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
                <h2 className={labelClass}>決済対象</h2>
                <div className="flex items-center gap-3 mb-2 mt-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                    trade.trade_type === 'call'
                      ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
                      : 'bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20'
                  }`}>
                    {trade.trade_type.toUpperCase()}
                  </span>
                  <span className="text-white font-semibold">{trade.strike_price.toLocaleString()}円</span>
                  <span className="text-[#666] text-xs">x{trade.quantity}枚</span>
                </div>
                <p className="text-xs text-[#666]">購入価格: <span className="text-white font-mono">{trade.entry_price}円</span></p>
              </div>
            </>
          ) : (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
              <h2 className={labelClass}>基本情報</h2>

              <div>
                <label className={labelClass}>種別</label>
                <div className="flex gap-2">
                  {(['call', 'put'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTradeType(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        tradeType === t
                          ? t === 'call'
                            ? 'bg-[#00d4aa] text-black'
                            : 'bg-[#ff6b6b] text-white'
                          : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a] hover:border-[#333]'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>取引単位</label>
                <div className="flex gap-2">
                  {([false, true] as const).map((mini) => (
                    <button
                      key={mini ? 'mini' : 'standard'}
                      type="button"
                      onClick={() => setIsMini(mini)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        isMini === mini
                          ? 'bg-[#00d4aa] text-black'
                          : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a] hover:border-[#333]'
                      }`}
                    >
                      {mini ? 'ミニ (×100)' : '通常 (×1000)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  label="取引日"
                  value={tradeDate}
                  onChange={setTradeDate}
                  required
                />
                <DatePicker
                  label="限月（SQ日）"
                  value={expiryDate}
                  onChange={setExpiryDate}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>権利行使価格</label>
                  <input name="strike_price" type="number" required defaultValue={trade.strike_price} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>枚数</label>
                  <input name="quantity" type="number" required min="1" defaultValue={trade.quantity} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>購入価格</label>
                  <input name="entry_price" type="number" step="0.01" required defaultValue={trade.entry_price} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>IV（%）</label>
                  <input name="iv_at_entry" type="number" step="0.01" defaultValue={trade.iv_at_entry ?? ''} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>メモ</label>
                <textarea name="memo" rows={3} defaultValue={trade.memo ?? ''} className={`${inputClass} resize-none`} />
              </div>
            </div>
          )}

          {/* Emotion Tracking */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>感情トラッキング</h2>
            <div>
              <label className="block text-[10px] text-[#888] mb-2">
                自信度: <span className="text-white font-bold">{confidenceLevel}</span> / 5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#00d4aa]"
              />
              <div className="flex justify-between text-[10px] text-[#555] mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-[#888] mb-1">感情</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmotion(emotion === em ? '' : em)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      emotion === em
                        ? 'bg-[#00d4aa] text-black'
                        : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a] hover:border-[#333]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settlement Info */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>決済情報</h2>
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
              <DatePicker
                label="決済日"
                value={exitDate}
                onChange={setExitDate}
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#ff6b6b] text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#00d4aa] hover:bg-[#00c49a] disabled:opacity-50 text-black font-semibold rounded-lg transition-colors"
          >
            {loading ? '保存中...' : isSettle ? '決済を保存' : '変更を保存'}
          </button>
        </form>
      </div>
    </main>
  )
}
