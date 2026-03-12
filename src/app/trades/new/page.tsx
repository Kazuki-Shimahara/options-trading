'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTrade } from '@/app/actions/trades'
import { calculateGreeks, type Greeks } from '@/lib/greeks'
import type { BSInputs } from '@/lib/black-scholes'
import { DEFEAT_TAG_CATEGORIES, MARKET_ENV_AXES, type DefeatTag } from '@/lib/tags'

const inputClass =
  'w-full bg-[#0a0a0a] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm placeholder-[#444] focus:outline-none focus:ring-1 focus:ring-[#00d4aa] focus:border-[#00d4aa] transition-colors'

const labelClass = 'block text-[10px] font-medium text-[#00d4aa]/80 mb-1 tracking-wider uppercase'

export default function NewTradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'call' | 'put'>('call')

  const [selectedDefeatTags, setSelectedDefeatTags] = useState<string[]>([])
  const [selectedMarketEnvTags, setSelectedMarketEnvTags] = useState<string[]>([])

  const [spotPrice, setSpotPrice] = useState<string>('')
  const [strikePrice, setStrikePrice] = useState<string>('')
  const [ivAtEntry, setIvAtEntry] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [greeks, setGreeks] = useState<Greeks | null>(null)

  const computeGreeks = useCallback(() => {
    const spot = parseFloat(spotPrice)
    const strike = parseFloat(strikePrice)
    const iv = parseFloat(ivAtEntry)

    if (!spot || !strike || !iv || !expiryDate) {
      setGreeks(null)
      return
    }

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
      volatility: iv / 100,
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
    <main className="min-h-screen px-4 pt-2 pb-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link href="/trades" className="text-[#666] hover:text-[#888] text-sm transition-colors">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-white">新規記録</h1>
          <div className="w-10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CALL / PUT toggle */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
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
            <input type="hidden" name="trade_type" value={tradeType} />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className={labelClass}>取引日</label>
                <input
                  name="trade_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>限月（SQ日）</label>
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

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>権利行使価格</label>
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
                <label className={labelClass}>枚数</label>
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

          {/* Price Section */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>価格</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>購入価格（プレミアム）</label>
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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

          {/* Greeks */}
          {greeks && (
            <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
              <h2 className={labelClass}>Greeks（自動計算）</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {[
                  { label: 'Delta(δ)', value: `${greeks.delta >= 0 ? '+' : ''}${greeks.delta.toFixed(4)}` },
                  { label: 'Gamma(γ)', value: greeks.gamma.toFixed(6) },
                  { label: 'Theta(θ)', value: `${greeks.theta >= 0 ? '+' : ''}${greeks.theta.toFixed(2)}` },
                  { label: 'Vega(κ)', value: greeks.vega.toFixed(2) },
                ].map((g) => (
                  <div key={g.label} className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg p-2.5 text-center">
                    <div className="text-[10px] text-[#00d4aa]/70 mb-0.5">{g.label}</div>
                    <div className="text-base font-mono font-semibold text-white">
                      {g.value}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#444] mt-2">
                r=0.1%, q=2.0% で計算
              </p>
            </div>
          )}

          {/* Market Env Tags */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>市場環境タグ</h2>
            {Object.entries(MARKET_ENV_AXES).map(([axis, config]) => (
              <div key={axis}>
                <label className="block text-[10px] text-[#888] mb-1">{config.label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {config.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleMarketEnvTag(axis, tag)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        selectedMarketEnvTags.includes(tag)
                          ? 'bg-[#00d4aa] text-black'
                          : 'bg-[#1a1a1a] text-[#666] border border-[#2a2a2a] hover:border-[#333]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Defeat Tags */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <h2 className={labelClass}>敗因タグ</h2>
            <p className="text-[10px] text-[#444]">該当するものを複数選択できます</p>
            {Object.entries(DEFEAT_TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category}>
                <label className="block text-[10px] text-[#888] mb-1">{category}</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: DefeatTag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDefeatTag(tag)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        selectedDefeatTags.includes(tag)
                          ? 'bg-[#ff6b6b] text-white'
                          : 'bg-[#1a1a1a] text-[#666] border border-[#2a2a2a] hover:border-[#333]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Memo */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
            <h2 className={labelClass}>メモ</h2>
            <textarea
              name="memo"
              rows={3}
              placeholder="なぜこのタイミングでエントリーしたか..."
              className={`${inputClass} resize-none`}
            />
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
            {loading ? '保存中...' : '記録する'}
          </button>
        </form>
      </div>
    </main>
  )
}
