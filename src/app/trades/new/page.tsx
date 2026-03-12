'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrade } from '@/app/actions/trades'
import { calculateGreeks, type Greeks } from '@/lib/greeks'
import type { BSInputs } from '@/lib/black-scholes'
import { DEFEAT_TAG_CATEGORIES, MARKET_ENV_AXES, type DefeatTag } from '@/lib/tags'

const inputClass =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

const labelClass = 'block text-xs font-medium text-slate-200 mb-1.5'

export default function NewTradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'call' | 'put'>('call')

  // タグ選択
  const [selectedDefeatTags, setSelectedDefeatTags] = useState<string[]>([])
  const [selectedMarketEnvTags, setSelectedMarketEnvTags] = useState<string[]>([])

  // Greeks計算用の入力状態
  const [spotPrice, setSpotPrice] = useState<string>('')
  const [strikePrice, setStrikePrice] = useState<string>('')
  const [ivAtEntry, setIvAtEntry] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [greeks, setGreeks] = useState<Greeks | null>(null)

  // Greeks自動計算
  const computeGreeks = useCallback(() => {
    const spot = parseFloat(spotPrice)
    const strike = parseFloat(strikePrice)
    const iv = parseFloat(ivAtEntry)

    if (!spot || !strike || !iv || !expiryDate) {
      setGreeks(null)
      return
    }

    // 満期までの年数を計算
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffMs = expiry.getTime() - now.getTime()
    const timeToExpiry = diffMs / (1000 * 60 * 60 * 24 * 365)

    if (timeToExpiry <= 0) {
      setGreeks(null)
      return
    }

    const inputs: BSInputs = {
      spot,
      strike,
      timeToExpiry,
      volatility: iv / 100, // %から小数に変換
      riskFreeRate: 0.001,
      dividendYield: 0.02,
      optionType: tradeType,
    }

    try {
      const result = calculateGreeks(inputs)
      setGreeks(result)
    } catch {
      setGreeks(null)
    }
  }, [spotPrice, strikePrice, ivAtEntry, expiryDate, tradeType])

  useEffect(() => {
    computeGreeks()
  }, [computeGreeks])

  function toggleDefeatTag(tag: string) {
    setSelectedDefeatTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function toggleMarketEnvTag(axis: string, tag: string) {
    setSelectedMarketEnvTags((prev) => {
      const axisConfig = MARKET_ENV_AXES[axis as keyof typeof MARKET_ENV_AXES]
      const axisTags = axisConfig.tags as readonly string[]
      const withoutAxis = prev.filter((t) => !axisTags.includes(t))
      if (prev.includes(tag)) {
        return withoutAxis
      }
      return [...withoutAxis, tag]
    })
  }

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
      entry_delta: greeks?.delta ?? null,
      entry_gamma: greeks?.gamma ?? null,
      entry_theta: greeks?.theta ?? null,
      entry_vega: greeks?.vega ?? null,
      defeat_tags: selectedDefeatTags.length > 0 ? selectedDefeatTags : null,
      market_env_tags: selectedMarketEnvTags.length > 0 ? selectedMarketEnvTags : null,
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
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
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
                  value={strikePrice}
                  onChange={(e) => setStrikePrice(e.target.value)}
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
                  value={ivAtEntry}
                  onChange={(e) => setIvAtEntry(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>先物価格（原資産）</label>
                <input
                  name="spot_price"
                  type="number"
                  step="0.01"
                  placeholder="38500"
                  value={spotPrice}
                  onChange={(e) => setSpotPrice(e.target.value)}
                  className={inputClass}
                />
              </div>
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Section: Greeks（自動計算） */}
          {greeks && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                Greeks（BS Merton版・自動計算）
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Delta</div>
                  <div className="text-lg font-mono font-semibold text-slate-100">
                    {greeks.delta >= 0 ? '+' : ''}{greeks.delta.toFixed(4)}
                  </div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Gamma</div>
                  <div className="text-lg font-mono font-semibold text-slate-100">
                    {greeks.gamma.toFixed(6)}
                  </div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Theta</div>
                  <div className="text-lg font-mono font-semibold text-slate-100">
                    {greeks.theta >= 0 ? '+' : ''}{greeks.theta.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Vega</div>
                  <div className="text-lg font-mono font-semibold text-slate-100">
                    {greeks.vega.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                r=0.1%, q=2.0% で計算。Theta は1日あたり、Vega は IV 1%変化あたりの値。
              </p>
            </div>
          )}

          {/* Section: 市場環境タグ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">市場環境タグ</h2>
            {Object.entries(MARKET_ENV_AXES).map(([axis, config]) => (
              <div key={axis}>
                <label className={labelClass}>{config.label}</label>
                <div className="flex flex-wrap gap-2">
                  {config.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleMarketEnvTag(axis, tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedMarketEnvTags.includes(tag)
                          ? 'bg-emerald-600 text-white border border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Section: 敗因タグ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">敗因タグ</h2>
            <p className="text-xs text-slate-600">該当するものを複数選択できます</p>
            {Object.entries(DEFEAT_TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category}>
                <label className={labelClass}>{category}</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: DefeatTag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDefeatTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedDefeatTags.includes(tag)
                          ? 'bg-red-600 text-white border border-red-500'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
